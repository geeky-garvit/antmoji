import * as THREE from 'three';
import { normalizeConfig } from './catalog.js';
import { createSkinMaterials, applySkin, createEyeMaterials, setEyeColor, createMouthMaterials } from './materials.js';
import { HEAD, headSpec } from './head.js';
import { buildLimbs } from './body.js';
import { getSculpt, loadSculpt } from './sculptCache.js';
import { TaperedTube } from './geometry.js';
import {
  createAccessoryMaterials, buildHat, buildHair, buildEyewear, buildEarrings, buildNeckwear, sculptKeysFor,
} from './accessories.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const damp = (a, b, lambda, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-lambda * dt));
const DEG = Math.PI / 180;

/* Antenna centre-lines (right side, head-local). */
function antennaPath(style) {
  const b = V(...HEAD.antennaBase);
  switch (style) {
    case 'curve':
      return { pts: [b, V(0.3, 1.55, 0.22), V(0.42, 1.85, 0.18), V(0.62, 2.02, 0.28), V(0.78, 2.0, 0.42)], tip: 0.066, r: 0.032 };
    case 'curly': {
      const pts = [b, V(0.3, 1.55, 0.25), V(0.38, 1.82, 0.25)];
      const c = V(0.53, 1.9, 0.27);
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + i * 0.5;
        const r = 0.15 * (1 - i / 14);
        pts.push(V(c.x + Math.cos(a) * r, c.y + Math.sin(-a) * r * -1, c.z + i * 0.004));
      }
      return { pts, tip: 0.04, r: 0.03 };
    }
    case 'bobble':
      return { pts: [b, V(0.3, 1.5, 0.3), V(0.37, 1.72, 0.34), V(0.46, 1.9, 0.38)], tip: 0.115, r: 0.028, glow: true };
    case 'short':
      return { pts: [b, V(0.32, 1.42, 0.33), V(0.42, 1.53, 0.39)], tip: 0.075, r: 0.036 };
    case 'elbow':
    default:
      return { pts: [b, V(0.31, 1.5, 0.29), V(0.36, 1.73, 0.27), V(0.52, 1.87, 0.39), V(0.69, 1.95, 0.5)], tip: 0.075, r: 0.033, club: true };
  }
}

/* Eyelid edge elevations (degrees) per eye style: [upper, lower]. */
const LIDS = {
  normal: { L: [56, -56], R: [56, -56] },
  happy: { L: [44, -4], R: [44, -4] },
  sleepy: { L: [14, -50], R: [14, -50] },
  wink: { L: [40, -40], R: [-6, -8] },
};

export class AntCharacter {
  constructor(config = {}) {
    this.config = normalizeConfig(config);
    this.object = new THREE.Group();
    this.object.name = 'Antmoji';

    this.skin = createSkinMaterials();
    this.eyeMats = createEyeMaterials(this.config.eyeColor);
    this.mouthMats = createMouthMaterials();
    this.acc = createAccessoryMaterials();
    this.tipGlow = new THREE.MeshPhysicalMaterial({ color: this.config.eyeColor, roughness: 0.15, clearcoat: 1, emissive: this.config.eyeColor, emissiveIntensity: 0.25 });

    this._time = 0;
    this._blink = 0; this._blinkT = 2 + Math.random() * 2; this._blinkPhase = -1;
    this._look = { yaw: 0, pitch: 0 };
    this._lookTarget = null;
    this._wander = { yaw: 0, pitch: 0, t: 0 };
    this._gesture = null;
    this._pop = 0;

    this._buildBody();
    this._buildHead();
    this._committed = null;
    this._ver = 0;
    this.object.visible = false;
    this._applyAll();
  }

  /* ── Construction ─────────────────────────────────────────────── */
  _buildBody() {
    this.rig = new THREE.Group();               // bobs / squashes for gestures
    this.object.add(this.rig);
    this.body = new THREE.Mesh(undefined, this.skin.vc);
    this.body.castShadow = true;
    this.rig.add(this.body);
    this.limbs = buildLimbs(this.skin.plain);
    for (const l of Object.values(this.limbs)) this.rig.add(l.root);
    this.neckSlot = new THREE.Group();
    this.rig.add(this.neckSlot);
  }

  _buildHead() {
    this.head = new THREE.Group();
    this.head.position.y = HEAD.pivotY;
    this.rig.add(this.head);

    this.headMesh = new THREE.Mesh(undefined, this.skin.vc);
    this.headMesh.castShadow = true;
    this.head.add(this.headMesh);
    this.mouthSlot = new THREE.Group();
    this.head.add(this.mouthSlot);

    // Eyes
    this.eyes = [];
    const scleraGeo = new THREE.SphereGeometry(HEAD.eyeR, 96, 64).rotateX(Math.PI / 2);
    const corneaGeo = new THREE.SphereGeometry(HEAD.eyeR * 1.012, 96, 32, 0, Math.PI * 2, 0, 1.0).rotateX(Math.PI / 2);
    const lidR = HEAD.eyeR * 1.045;
    const upperGeo = new THREE.SphereGeometry(lidR, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const lowerGeo = new THREE.SphereGeometry(lidR, 96, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const rimGeo = new THREE.TorusGeometry(lidR, 0.026, 20, 128).rotateX(Math.PI / 2);
    const [ex, ey, ez] = HEAD.eye;
    for (const s of [-1, 1]) {
      const socket = new THREE.Group();
      socket.position.set(s * ex, ey, ez);
      socket.rotation.y = s * HEAD.eyeYaw;
      const ball = new THREE.Group();
      ball.add(new THREE.Mesh(scleraGeo, this.eyeMats.sclera));
      const cornea = new THREE.Mesh(corneaGeo, this.eyeMats.cornea);
      cornea.renderOrder = 1;
      ball.add(cornea);
      socket.add(ball);
      // painted catchlights stay put while the eye rotates (cartoon convention)
      [[-0.36, 0.42, 0.055], [0.3, -0.3, 0.024]].forEach(([dx, dy, r]) => {
        const n = V(dx - s * 0.05, dy, 1).normalize();
        const c = new THREE.Mesh(new THREE.CircleGeometry(r, 40), this.eyeMats.catchlight);
        c.position.copy(n).multiplyScalar(HEAD.eyeR * 1.02);
        c.lookAt(n.clone().multiplyScalar(2));
        c.renderOrder = 3;
        socket.add(c);
      });
      const upper = new THREE.Mesh(upperGeo, this.skin.plain);
      const lower = new THREE.Mesh(lowerGeo, this.skin.plain);
      upper.add(new THREE.Mesh(rimGeo, this.skin.plain));
      lower.add(new THREE.Mesh(rimGeo, this.skin.plain));
      socket.add(upper, lower);
      this.head.add(socket);
      this.eyes.push({ side: s, socket, ball, upper, lower, u: 47, l: -52 });
    }

    // Antennae (rebuilt per style)
    this.antennae = [];
    this.antennaGroup = new THREE.Group();
    this.head.add(this.antennaGroup);

    // Accessory slots
    this.hatSlot = new THREE.Group();
    this.hairSlot = new THREE.Group();
    this.eyewearSlot = new THREE.Group();
    this.earSlot = new THREE.Group();
    this.head.add(this.hatSlot, this.hairSlot, this.eyewearSlot, this.earSlot);
  }

  _setSlot(slot, obj) {
    slot.clear();
    if (obj) slot.add(obj);
  }

  _buildAntennae(style) {
    for (const a of this.antennae) { a.tube.dispose(); }
    this.antennaGroup.clear();
    this.antennae = [];
    const spec = antennaPath(style);
    const N = 44;
    for (const s of [-1, 1]) {
      const ctrl = spec.pts.map((p) => V(p.x * s, p.y, p.z));
      const rest = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal').getPoints(N - 1);
      const r0 = spec.r;
      const tube = new TaperedTube(N, 22, (t) => r0 * (1 - 0.38 * t), this.skin.plain);
      const tipGeo = new THREE.SphereGeometry(spec.tip, 48, 32);
      const tip = new THREE.Mesh(tipGeo, spec.glow ? this.tipGlow : this.skin.plain);
      if (spec.club) tip.scale.set(0.85, 1.25, 0.85);
      tip.castShadow = true;
      this.antennaGroup.add(tube.mesh, tip);
      this.antennae.push({
        s, rest, tube, tip, club: !!spec.club,
        pts: rest.map((p) => p.clone()),
        off: V(0, 0, 0), vel: V(0, 0, 0),
        k: 70 + s * 6, c: 6.5,
      });
    }
    this._updateAntennae(0);
  }

  /* ── Config ───────────────────────────────────────────────────── */
  setConfig(next) {
    const prev = this.config;
    this.config = normalizeConfig({ ...prev, ...next });
    return this._applyAll();
  }

  /** Waits for any missing sculpts (meshed off-thread), then commits atomically. */
  _applyAll() {
    const missing = sculptKeysFor(this.config).filter((k) => !getSculpt(k));
    if (!missing.length) { this._commit(); this.ready = Promise.resolve(); return this.ready; }
    const v = ++this._ver;
    this.ready = Promise.all(missing.map(loadSculpt)).then(() => {
      if (v === this._ver) this._commit();
      else return this.ready;
    });
    return this.ready;
  }

  _commit() {
    const prev = this._committed;
    const c = this.config;
    this._committed = { ...c };
    if (!prev) { this.body.geometry = getSculpt('body'); this.object.visible = true; }
    const changed = (k) => !prev || prev[k] !== c[k];
    if (changed('skin') || changed('finish')) applySkin(this.skin, c.skin, c.finish);
    if (changed('eyeColor')) {
      if (prev) setEyeColor(this.eyeMats, c.eyeColor);
      this.tipGlow.color.set(c.eyeColor);
      this.tipGlow.emissive.set(c.eyeColor);
    }
    if (changed('mouth') || changed('mandible')) this._rebuildHead();
    if (changed('antenna')) this._buildAntennae(c.antenna);
    if (changed('hat')) this._setSlot(this.hatSlot, buildHat(c.hat, this.acc));
    if (changed('hair')) this._setSlot(this.hairSlot, buildHair(c.hair, this.acc));
    if (changed('hairColor')) {
      this.acc.hair.color.set(c.hairColor);
      const hsl = {}; this.acc.hair.color.getHSL(hsl);
      this.acc.hair.sheenColor.setHSL(hsl.h, 0.6, Math.min(0.9, hsl.l + 0.4));
    }
    if (changed('eyewear')) this._setSlot(this.eyewearSlot, buildEyewear(c.eyewear, this.acc));
    if (changed('earring')) this._setSlot(this.earSlot, buildEarrings(c.earring, this.acc));
    if (changed('neck')) this._setSlot(this.neckSlot, buildNeckwear(c.neck, this.acc));
    if (prev) { this._pop = 1; this.impulse(V((Math.random() - 0.5) * 2, 2.2, 0.6)); }
  }

  _rebuildHead() {
    const spec = headSpec(this.config.mouth);
    this.headMesh.geometry = getSculpt(`head|${this.config.mouth}|${this.config.mandible}`);
    this.mouthSlot.clear();
    const m = this.mouthMats;
    const add = (mat, c, r, rot) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), mat);
      e.position.set(...c); e.scale.set(...r);
      if (rot) e.rotation.set(...rot);
      this.mouthSlot.add(e);
      return e;
    };
    if (spec.interior) {
      const [x, y, z] = spec.interior.c;
      add(m.inside, [x, y, z], [0.2, 0.14, 0.12]);
      if (spec.interior.teeth) add(m.teeth, [0, spec.cavity.top - 0.035, spec.cavity.c[2] - 0.06], [0.15, 0.04, 0.07]);
      if (spec.interior.tongue) add(m.tongue, [0, y - 0.07, z + 0.05], [0.13, 0.06, 0.1]);
    }
    if (spec.tongueOut) {
      const [x, y, z] = spec.tongueOut;
      add(m.tongue, [x, y - 0.02, z - 0.01], [0.075, 0.032, 0.08], [0.55, 0.25, -0.25]);
    }
  }

  /* ── Interaction ──────────────────────────────────────────────── */
  /** Look towards a normalised screen point (−1..1), or null to idle. */
  lookAt(nx, ny) {
    this._lookTarget = nx == null ? null : { yaw: THREE.MathUtils.clamp(nx, -1, 1) * 0.55, pitch: THREE.MathUtils.clamp(-ny, -1, 1) * 0.32 };
  }

  impulse(v) {
    for (const a of this.antennae) a.vel.add(v.clone().multiplyScalar(a.s < 0 ? 1 : 0.9));
  }

  /** 'wave' | 'jump' | 'nod' | 'spin' */
  play(name) {
    const dur = { wave: 2.2, jump: 0.9, nod: 0.9, spin: 1.2 }[name];
    if (!dur) return;
    this._gesture = { name, t: 0, dur };
  }

  /* ── Per-frame update ─────────────────────────────────────────── */
  update(dt) {
    dt = Math.min(dt, 1 / 20);
    const t = (this._time += dt);

    // Idle: breathing + gentle weight shift
    const breathe = Math.sin(t * 1.8);
    this.rig.position.y = breathe * 0.008;
    this.rig.rotation.z = Math.sin(t * 0.7) * 0.012;
    this.body.scale.set(1 + breathe * 0.004, 1 + breathe * 0.006, 1 + breathe * 0.004);

    // Look: pointer target or wandering glances
    let tgt = this._lookTarget;
    if (!tgt) {
      const w = this._wander;
      w.t -= dt;
      if (w.t <= 0) {
        w.t = 1.6 + Math.random() * 2.8;
        const center = Math.random() < 0.45;
        w.yaw = center ? 0 : (Math.random() - 0.5) * 0.7;
        w.pitch = center ? 0 : (Math.random() - 0.4) * 0.3;
      }
      tgt = w;
    }
    const prevYaw = this._look.yaw, prevPitch = this._look.pitch;
    this._look.yaw = damp(this._look.yaw, tgt.yaw, 4, dt);
    this._look.pitch = damp(this._look.pitch, tgt.pitch, 4, dt);
    const yawVel = (this._look.yaw - prevYaw) / dt, pitchVel = (this._look.pitch - prevPitch) / dt;

    let headYaw = this._look.yaw * 0.6, headPitch = this._look.pitch * 0.55 - 0.02;
    let headRoll = Math.sin(t * 0.9) * 0.03 - this._look.yaw * 0.08;
    let rigY = 0, rigRotY = 0, squash = 0;

    // Arms idle sway
    const L = this.limbs;
    const sway = Math.sin(t * 1.8 + 0.4) * 0.03;
    for (const k of ['armL', 'armR', 'midL', 'midR']) {
      const s = k.endsWith('L') ? -1 : 1;
      L[k].root.rotation.set(sway * 0.5, 0, s * (0.02 + sway));
      L[k].joints[1].rotation.set(0, 0, -s * sway * 0.6);
    }
    L.legL.joints[1].rotation.x = L.legR.joints[1].rotation.x = 0;

    // Gestures
    const g = this._gesture;
    if (g) {
      g.t += dt;
      const p = Math.min(g.t / g.dur, 1);
      const env = Math.sin(Math.PI * Math.min(p * 1.4, 1)) ** 0.6 * (p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15);
      if (g.name === 'wave') {
        const up = THREE.MathUtils.smootherstep(Math.min(p * 4, 1), 0, 1) * (p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1);
        L.armR.root.rotation.z = THREE.MathUtils.lerp(L.armR.root.rotation.z, 2.5, up);
        L.armR.root.rotation.x = -0.25 * up;
        L.armR.joints[1].rotation.z = up * (0.5 * Math.sin(g.t * 14));
        headRoll += up * 0.08;
        headYaw += up * 0.04;
      } else if (g.name === 'jump') {
        const h = Math.max(0, Math.sin(Math.PI * Math.min(Math.max((p - 0.15) / 0.7, 0), 1)));
        rigY = h * 0.5;
        squash = p < 0.15 ? Math.sin((p / 0.15) * Math.PI) * 0.06 : 0;
        for (const k of ['armL', 'armR']) L[k].root.rotation.z = (k === 'armL' ? -1 : 1) * h * 2.1;
        if (p > 0.85 && !g.landed) { g.landed = true; this.impulse(V(0, -3, 0)); }
      } else if (g.name === 'nod') {
        headPitch += Math.sin(p * Math.PI * 4) * 0.18 * env;
      } else if (g.name === 'spin') {
        rigRotY = THREE.MathUtils.smootherstep(p, 0, 1) * Math.PI * 2;
        rigY = Math.sin(p * Math.PI) * 0.12;
      }
      if (p >= 1) this._gesture = null;
    }
    this.rig.position.y += rigY;
    this.rig.rotation.y = rigRotY;
    this.rig.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);

    // Change "pop"
    if (this._pop > 0) this._pop = Math.max(0, this._pop - dt * 2.4);
    const pop = Math.sin(this._pop * Math.PI) * 0.035;
    this.head.scale.setScalar(1.08 * (1 + pop));

    this.head.rotation.set(-headPitch, headYaw, headRoll, 'YXZ');

    // Eyes: gaze leads the head
    const gy = THREE.MathUtils.clamp(this._look.yaw * 0.9, -0.45, 0.45);
    const gp = THREE.MathUtils.clamp(this._look.pitch * 0.9, -0.3, 0.3);
    this._updateBlink(dt);
    const lids = LIDS[this.config.eyes] || LIDS.normal;
    for (const e of this.eyes) {
      e.ball.rotation.set(-gp, gy - e.side * HEAD.eyeYaw * 0.4, 0, 'YXZ');
      const [u0, l0] = e.side < 0 ? lids.L : lids.R;
      const close = this._blink;
      const meet = -8;
      // lids follow vertical gaze slightly (sells the life-likeness)
      const u = THREE.MathUtils.lerp(u0 + gp * 18, meet, close);
      const l = THREE.MathUtils.lerp(l0 + gp * 10, meet - 0.5, close);
      e.u = damp(e.u, u, 30, dt); e.l = damp(e.l, l, 30, dt);
      e.upper.rotation.x = -e.u * DEG;
      e.lower.rotation.x = -e.l * DEG;
    }

    // Antenna secondary motion from head motion
    const drive = V(-yawVel * 1.6, (rigY > 0.01 ? -1 : 0) * 0.5, pitchVel * 1.2);
    this._updateAntennae(dt, drive);

    // Spinning propeller etc.
    const spin = this.hatSlot.children[0]?.userData.spin;
    if (spin) spin.rotation.y += dt * 9;
  }

  _updateBlink(dt) {
    if (this._blinkPhase < 0) {
      this._blinkT -= dt;
      if (this._blinkT <= 0) this._blinkPhase = 0;
      this._blink = 0;
      return;
    }
    this._blinkPhase += dt / 0.16;
    this._blink = Math.sin(Math.min(this._blinkPhase, 1) * Math.PI);
    if (this._blinkPhase >= 1) {
      this._blinkPhase = -1;
      this._blinkT = Math.random() < 0.18 ? 0.18 : 2.2 + Math.random() * 3.5; // occasional double blink
    }
  }

  _updateAntennae(dt, drive = V(0, 0, 0)) {
    const t = this._time;
    for (const a of this.antennae) {
      if (dt > 0) {
        const idle = V(Math.sin(t * 1.3 + a.s) * 0.12, Math.sin(t * 1.9 + a.s * 2) * 0.08, Math.cos(t * 1.1) * 0.08);
        const acc = a.off.clone().multiplyScalar(-a.k).addScaledVector(a.vel, -a.c).add(drive.clone().multiplyScalar(a.k * 0.02)).addScaledVector(idle, 1.5);
        a.vel.addScaledVector(acc, dt);
        a.off.addScaledVector(a.vel, dt);
        a.off.clampLength(0, 0.35);
      }
      const n = a.rest.length;
      for (let i = 0; i < n; i++) {
        const w = Math.pow(i / (n - 1), 1.8);
        a.pts[i].copy(a.rest[i]).addScaledVector(a.off, w);
      }
      a.tube.update(a.pts);
      const end = a.pts[n - 1];
      a.tip.position.copy(end);
      if (a.club) {
        const dir = end.clone().sub(a.pts[n - 3]).normalize();
        a.tip.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
        a.tip.position.addScaledVector(dir, 0.03);
      }
    }
  }

  dispose() {
    this.object.traverse((o) => {
      if (o.isMesh) {
        // shared cached geometries are kept; only per-instance ones are disposed
        if (o.geometry && !o.geometry.userData?.cached && o.geometry.attributes?.position?.usage === THREE.DynamicDrawUsage) o.geometry.dispose();
      }
    });
    for (const m of [...this.skin.all, ...Object.values(this.eyeMats), ...Object.values(this.mouthMats), ...Object.values(this.acc), this.tipGlow]) {
      m.map?.dispose(); m.dispose();
    }
  }
}
