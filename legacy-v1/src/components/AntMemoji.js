import * as THREE from 'three';
import { AntennaePhysics } from './AntennaePhysics.js';
import { Accessories } from './Accessories.js';
import { ParticlesManager } from './Particles.js';
import gsap from 'gsap';

/* ── Preset Palette ──────────────────────────────────────── */
export const ANT_COLOR_PRESETS = {
  obsidian:   { name:'Obsidian',     color:'#1a1f2e', emissive:'#080a12', sssColor:'#3b4a6b', sheenColor:'#c0c8e0', irisColor:'#38bdf8', roughness:0.22, clearcoat:1.0, metalness:0.25 },
  pearl_blue: { name:'Pearl Blue',   color:'#1b3a5b', emissive:'#09152b', sssColor:'#3b82f6', sheenColor:'#60a5fa', irisColor:'#0072ff', roughness:0.22, clearcoat:1.0, metalness:0.10 },
  pastel_pink:{ name:'Blush Pink',   color:'#be185d', emissive:'#4c0519', sssColor:'#f472b6', sheenColor:'#fbcfe8', irisColor:'#ec4899', roughness:0.20, clearcoat:1.0, metalness:0.05 },
  cyber_neon: { name:'Cyber Green',  color:'#047857', emissive:'#022c22', sssColor:'#34d399', sheenColor:'#a7f3d0', irisColor:'#10b981', roughness:0.18, clearcoat:1.0, metalness:0.20 },
  ruby_red:   { name:'Ruby Red',     color:'#6b0f1a', emissive:'#2b0408', sssColor:'#ef4444', sheenColor:'#fca5a5', irisColor:'#f43f5e', roughness:0.18, clearcoat:1.0, metalness:0.05 },
  royal_gold: { name:'Royal Gold',   color:'#b45309', emissive:'#451a03', sssColor:'#fbbf24', sheenColor:'#fef08a', irisColor:'#eab308', roughness:0.22, clearcoat:0.9, metalness:0.55 },
};

/* ── Smooth sphere helper ────────────────────────────────── */
function smoothSphere(rx, ry, rz, segs = 48) {
  const geo = new THREE.SphereGeometry(1, segs, segs);
  geo.scale(rx, ry, rz);
  geo.computeVertexNormals();
  return geo;
}

/* ── Rounded cylinder (capsule-like legs) ───────────────── */
function roundCylinder(rTop, rBot, h, segs = 20) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, segs, 1, false);
  geo.computeVertexNormals();
  return geo;
}

/* ================================================================
   AntMemoji — Full Pixar/Disney-style ant character
   Anatomy: head → neck → thorax → pedicel → abdomen
            6 legs, 2 antennae with tips
   ================================================================ */
export class AntMemoji {
  constructor(options = {}) {
    this.group = new THREE.Group();
    this.presetKey = options.presetKey || 'obsidian';
    this.presetConfig = ANT_COLOR_PRESETS[this.presetKey];

    // Expression blendshapes (0..1)
    this.expressionValues = { happy:1, wink:0, curious:0, surprised:0, sleepy:0, laughing:0 };
    this.currentExpression = 'happy';

    this.blinkTimer = Math.random() * 3 + 2.5;
    this.isBlinking = false;
    this.timeOffset  = options.timeOffset || Math.random() * 100;

    this.accessories = new Accessories();
    this.particles   = new ParticlesManager();

    this._initMaterials();
    this._buildFullBody();
    this._mountAccessories();
    this._initAntennaePhysics();
  }

  /* ── Materials ────────────────────────────────────────── */
  _initMaterials() {
    const cfg = this.presetConfig;
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cfg.color),
      emissive: new THREE.Color(cfg.emissive),
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      clearcoat: cfg.clearcoat,
      clearcoatRoughness: 0.06,
      sheen: 0.6,
      sheenRoughness: 0.25,
      sheenColor: new THREE.Color(cfg.sheenColor),
      transmission: 0.05,
      thickness: 0.5,
    });

    this.scleraMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });

    this.irisMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.irisColor),
      roughness: 0.10,
      metalness: 0.15,
      map: this._makeIrisTexture(cfg.irisColor),
    });

    this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x05070e });
    this.specMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.95 });

    this.lidMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cfg.color),
      roughness: 0.30,
      clearcoat: 0.5,
      side: THREE.DoubleSide,
    });

    this.accentMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1117,
      roughness: 0.40,
      metalness: 0.25,
    });
  }

  _makeIrisTexture(hex) {
    const sz = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = sz;
    const ctx = canvas.getContext('2d');
    const cx = sz / 2, cy = sz / 2, r = 110;

    const base = new THREE.Color(hex);
    const light = base.clone().offsetHSL(0, 0, 0.22).getStyle();
    const dark  = base.clone().offsetHSL(0, 0,-0.26).getStyle();

    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, r);
    g.addColorStop(0, light);
    g.addColorStop(0.5, base.getStyle());
    g.addColorStop(0.85, dark);
    g.addColorStop(1, '#050a18');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 44; i++) {
      const a = (i/44)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*16, cy+Math.sin(a)*16);
      ctx.lineTo(cx+Math.cos(a)*105, cy+Math.sin(a)*105);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return t;
  }

  /* ── Full Body Construction ───────────────────────────── */
  _buildFullBody() {
    // ── ROOT: the whole character sits so feet are near y=0
    //   Total height ≈ 3.6 units, shifted up so ground = y≈-1.8
    this.group.position.set(0, -0.2, 0);

    /* 1. ABDOMEN — large oval, bottom segment */
    this.abdomenGroup = new THREE.Group();
    this.abdomenGroup.position.set(0, 0, 0);
    const abdGeo = smoothSphere(0.72, 0.88, 0.78);
    this.abdomenMesh = new THREE.Mesh(abdGeo, this.bodyMat);
    this.abdomenMesh.castShadow = true;
    this.abdomenGroup.add(this.abdomenMesh);
    this.group.add(this.abdomenGroup);

    /* 2. PEDICEL — thin waist connector */
    const pedGeo = roundCylinder(0.13, 0.16, 0.28);
    this.pedicel = new THREE.Mesh(pedGeo, this.bodyMat);
    this.pedicel.position.set(0, 0.95, 0);
    this.pedicel.castShadow = true;
    this.group.add(this.pedicel);

    /* 3. THORAX — smaller oval middle segment */
    this.thoraxGroup = new THREE.Group();
    this.thoraxGroup.position.set(0, 1.28, 0);
    const thorGeo = smoothSphere(0.50, 0.56, 0.50);
    this.thoraxMesh = new THREE.Mesh(thorGeo, this.bodyMat);
    this.thoraxMesh.castShadow = true;
    this.thoraxGroup.add(this.thoraxMesh);
    this.group.add(this.thoraxGroup);

    /* 4. NECK — short stub */
    const neckGeo = roundCylinder(0.19, 0.22, 0.22);
    this.neck = new THREE.Mesh(neckGeo, this.bodyMat);
    this.neck.position.set(0, 1.74, 0.06);
    this.neck.castShadow = true;
    this.group.add(this.neck);

    /* 5. HEAD — large rounded sphere, slightly flattened front-back */
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.26, 0.06);
    const headGeo = this._makeHeadGeo();
    this.headMesh = new THREE.Mesh(headGeo, this.bodyMat);
    this.headMesh.castShadow = true;
    this.headGroup.add(this.headMesh);
    this.group.add(this.headGroup);

    /* 6. EYES */
    this._buildEye(-0.38, 0.08,  0.62, -0.18);   // left
    this._buildEye( 0.38, 0.08,  0.62,  0.18);   // right

    /* 7. SMILE */
    this._buildSmile();

    /* 8. LEGS — 3 pairs (front/mid/back) */
    this._buildLegs();
  }

  _makeHeadGeo() {
    const geo = new THREE.SphereGeometry(0.82, 64, 64);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Flatten slightly front→back for cartoon look
      v.z *= 0.88;
      // Cheek puff
      if (v.y < 0 && v.y > -0.5) {
        const w = Math.max(0, 1 - Math.abs(v.y + 0.1) * 2.5);
        v.x += Math.sign(v.x) * w * 0.06;
        v.z += w * 0.05;
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  _buildEye(x, y, z, rotY) {
    const isLeft = x < 0;
    const eyeGrp = new THREE.Group();
    eyeGrp.position.set(x, y, z);
    eyeGrp.rotation.y = rotY;

    const R = 0.32;
    // Sclera
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 32), this.scleraMat);
    sclera.castShadow = false;
    eyeGrp.add(sclera);

    // Iris group (slightly inset)
    const irisGrp = new THREE.Group();
    irisGrp.position.z = R * 0.78;

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.20, 32), this.irisMat);
    irisGrp.add(iris);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), this.pupilMat);
    pupil.position.z = 0.003;
    irisGrp.add(pupil);

    // Specular highlight
    const spec = new THREE.Mesh(new THREE.CircleGeometry(0.050, 16), this.specMat);
    spec.position.set(0.065, 0.065, 0.005);
    irisGrp.add(spec);

    eyeGrp.add(irisGrp);

    // Cornea gloss
    const cornea = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.015, 32, 32),
      new THREE.MeshPhysicalMaterial({ color:0xffffff, transparent:true, opacity:0.12, roughness:0, transmission:0.94, ior:1.34, clearcoat:1, clearcoatRoughness:0 })
    );
    eyeGrp.add(cornea);

    // Eyelids
    const lidR = R * 1.03;
    const upperLidGeo = new THREE.SphereGeometry(lidR, 32, 16, 0, Math.PI*2, 0, Math.PI*0.5);
    this[isLeft ? 'leftUpperLid' : 'rightUpperLid'] = new THREE.Mesh(upperLidGeo, this.lidMat);
    this[isLeft ? 'leftUpperLid' : 'rightUpperLid'].rotation.x = -Math.PI*0.5;
    eyeGrp.add(this[isLeft ? 'leftUpperLid' : 'rightUpperLid']);

    const lowerLidGeo = new THREE.SphereGeometry(lidR, 32, 16, 0, Math.PI*2, Math.PI*0.5, Math.PI*0.5);
    this[isLeft ? 'leftLowerLid' : 'rightLowerLid'] = new THREE.Mesh(lowerLidGeo, this.lidMat);
    this[isLeft ? 'leftLowerLid' : 'rightLowerLid'].rotation.x = Math.PI*0.5;
    eyeGrp.add(this[isLeft ? 'leftLowerLid' : 'rightLowerLid']);

    this.headGroup.add(eyeGrp);

    // Store refs for blinking
    if (isLeft) { this.leftEyeGrp = eyeGrp; this.leftIrisGrp = irisGrp; this.leftBlinkFactor = 0; }
    else        { this.rightEyeGrp = eyeGrp; this.rightIrisGrp = irisGrp; this.rightBlinkFactor = 0; }
  }

  _buildSmile() {
    // A gentle upward arc using TorusGeometry clipped to half
    const smileGeo = new THREE.TorusGeometry(0.20, 0.028, 16, 32, Math.PI);
    this.smileMesh = new THREE.Mesh(smileGeo, this.accentMat);
    this.smileMesh.position.set(0, -0.38, 0.70);
    this.smileMesh.rotation.x = Math.PI * 0.92;  // arc faces forward-down
    this.headGroup.add(this.smileMesh);
  }

  _buildLegs() {
    /* Ant has 3 pairs of legs.
       In Pixar style: thin oval upper + lower sections with small "feet" */
    const legDefs = [
      // [side, attachX, attachY_thorax, attachZ, spreadAngle, frontBack]
      { side: 'L', ax: -0.42, ay: -0.08, az: 0.10, spreadX: -1.1, spreadZ:  0.3, lean:  0.35 },
      { side: 'R', ax:  0.42, ay: -0.08, az: 0.10, spreadX:  1.1, spreadZ:  0.3, lean:  0.35 },
      { side: 'L', ax: -0.48, ay: -0.14, az:-0.05, spreadX: -1.2, spreadZ:  0.0, lean:  0.20 },
      { side: 'R', ax:  0.48, ay: -0.14, az:-0.05, spreadX:  1.2, spreadZ:  0.0, lean:  0.20 },
      { side: 'L', ax: -0.38, ay: -0.10, az:-0.22, spreadX: -1.0, spreadZ: -0.3, lean:  0.25 },
      { side: 'R', ax:  0.38, ay: -0.10, az:-0.22, spreadX:  1.0, spreadZ: -0.3, lean:  0.25 },
    ];

    const upperGeo  = roundCylinder(0.055, 0.070, 0.52, 16);
    const lowerGeo  = roundCylinder(0.045, 0.060, 0.46, 16);
    const footGeo   = new THREE.SphereGeometry(0.075, 12, 12);

    this.legs = [];

    legDefs.forEach(d => {
      const legGrp = new THREE.Group();
      legGrp.position.set(d.ax, d.ay, d.az);  // attach to thorax local space
      this.thoraxGroup.add(legGrp);

      // Upper limb — angled outward
      const upper = new THREE.Mesh(upperGeo.clone(), this.bodyMat);
      upper.castShadow = true;
      // Rotate so it goes outward-downward
      upper.rotation.z = d.spreadX > 0 ? Math.PI * 0.28 : -Math.PI * 0.28;
      upper.rotation.x = -0.18;
      legGrp.add(upper);

      // Knee joint position (end of upper)
      const kneeGrp = new THREE.Group();
      kneeGrp.position.set(d.spreadX * 0.30, -0.30, d.spreadZ * 0.18);
      legGrp.add(kneeGrp);

      // Lower limb
      const lower = new THREE.Mesh(lowerGeo.clone(), this.bodyMat);
      lower.castShadow = true;
      lower.rotation.z = d.spreadX > 0 ? Math.PI * 0.15 : -Math.PI * 0.15;
      lower.rotation.x = 0.3;
      kneeGrp.add(lower);

      // Foot / claw
      const foot = new THREE.Mesh(footGeo.clone(), this.bodyMat);
      foot.castShadow = true;
      foot.position.set(d.spreadX * 0.12, -0.38, d.spreadZ * 0.1 + 0.14);
      foot.scale.set(1.1, 0.7, 1.3);
      kneeGrp.add(foot);

      this.legs.push({ legGrp, upper, lower, foot, side: d.side });
    });
  }

  /* ── Accessory mount points ───────────────────────────── */
  _mountAccessories() {
    // Eyewear mounts relative to headGroup
    this.headGroup.add(this.accessories.eyewearGroup);
    this.headGroup.add(this.accessories.hatGroup);
    this.headGroup.add(this.accessories.piercingGroup);
    this.group.add(this.accessories.propGroup);
    this.group.add(this.particles.group);
  }

  /* ── Antennae — spring-bone physics ─────────────────────── */
  _initAntennaePhysics() {
    this.leftAntennaBase  = new THREE.Vector3(-0.28, 0.66, 0.30);
    this.rightAntennaBase = new THREE.Vector3( 0.28, 0.66, 0.30);

    this.leftPhysics = new AntennaePhysics({ numSegments:7, segmentLength:0.22, stiffness:0.52, damping:0.82, baseAngleX:-0.15, baseAngleY:-0.50 });
    this.rightPhysics = new AntennaePhysics({ numSegments:7, segmentLength:0.22, stiffness:0.52, damping:0.82, baseAngleX:-0.15, baseAngleY: 0.50 });

    const dummyCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.5,0.2), new THREE.Vector3(0,1,0.4)]);
    const tubeGeo = new THREE.TubeGeometry(dummyCurve, 20, 0.030, 10, false);
    const tipGeo  = new THREE.SphereGeometry(0.065, 12, 12);

    this.leftAntMesh  = new THREE.Mesh(tubeGeo.clone(), this.bodyMat);
    this.rightAntMesh = new THREE.Mesh(tubeGeo.clone(), this.bodyMat);
    this.leftTip      = new THREE.Mesh(tipGeo.clone(), this.bodyMat);
    this.rightTip     = new THREE.Mesh(tipGeo.clone(), this.bodyMat);

    [this.leftAntMesh, this.rightAntMesh, this.leftTip, this.rightTip].forEach(m => {
      m.castShadow = true;
      this.group.add(m);
    });
  }

  /* ── Color setters ──────────────────────────────────────── */
  setPreset(key) {
    if (!ANT_COLOR_PRESETS[key]) return;
    this.presetKey = key;
    const cfg = ANT_COLOR_PRESETS[key];
    this.presetConfig = cfg;
    this.bodyMat.color.set(cfg.color);
    this.bodyMat.emissive.set(cfg.emissive);
    this.bodyMat.roughness = cfg.roughness;
    this.bodyMat.metalness = cfg.metalness;
    this.bodyMat.clearcoat = cfg.clearcoat;
    this.bodyMat.sheenColor.set(cfg.sheenColor);
    this.lidMat.color.set(cfg.color);
    this.irisMat.color.set(cfg.irisColor);
    if (this.irisMat.map) { this.irisMat.map.dispose(); }
    this.irisMat.map = this._makeIrisTexture(cfg.irisColor);
    this.irisMat.needsUpdate = true;
  }

  setCustomCuticleColor(hex) {
    this.bodyMat.color.set(hex);
    this.bodyMat.emissive.set(new THREE.Color(hex).multiplyScalar(0.18));
    this.lidMat.color.set(hex);
  }

  setCustomIrisColor(hex) {
    this.irisMat.color.set(hex);
    if (this.irisMat.map) this.irisMat.map.dispose();
    this.irisMat.map = this._makeIrisTexture(hex);
    this.irisMat.needsUpdate = true;
  }

  /* ── Expressions ────────────────────────────────────────── */
  setExpression(name, dur = 0.55) {
    this.currentExpression = name;
    const t = { happy:0, wink:0, curious:0, surprised:0, sleepy:0, laughing:0 };
    if (name in t) t[name] = 1.0;
    gsap.to(this.expressionValues, { ...t, duration: dur, ease:'back.out(1.4)' });

    // Gentle physics impulse on antennae
    const imp = new THREE.Vector3((Math.random()-0.5)*0.6, 0.5, (Math.random()-0.5)*0.5);
    this.leftPhysics.applyImpulse(imp);
    this.rightPhysics.applyImpulse(imp);
  }

  /* ── Poses ──────────────────────────────────────────────── */
  setPose(poseKey) {
    this.currentPose = poseKey;
    const map = {
      working:     { expr:'curious',  hat:'helmet', eyewear:'none', prop:'coffee',  particles:'none'     },
      celebration: { expr:'happy',    hat:'party',  eyewear:'none', prop:'popper',  particles:'confetti' },
      cool:        { expr:'wink',     hat:'none',   eyewear:'sunglasses', prop:'none', particles:'none'  },
      sleepy:      { expr:'sleepy',   hat:'none',   eyewear:'none', prop:'none',    particles:'zzz'      },
      confused:    { expr:'curious',  hat:'none',   eyewear:'none', prop:'none',    particles:'none'     },
      laughing:    { expr:'laughing', hat:'none',   eyewear:'none', prop:'none',    particles:'none'     },
    };
    const p = map[poseKey] || { expr:'happy', hat:'none', eyewear:'none', prop:'none', particles:'none' };
    this.setExpression(p.expr, 0.4);
    this.accessories.setHat(p.hat);
    this.accessories.setEyewear(p.eyewear);
    this.accessories.setProp(p.prop);
    this.particles.setParticleType(p.particles);
  }

  /* ── Per-frame update ───────────────────────────────────── */
  update(time, delta) {
    const dt = Math.min(delta, 0.05);

    /* Idle breathing — gentle scale + float */
    const breath = Math.sin((time + this.timeOffset) * 1.9) * 0.012;
    const sway   = Math.sin((time + this.timeOffset) * 0.9) * 0.008;

    // Thorax subtle breathe
    this.thoraxGroup.scale.setScalar(1 + breath * 0.5);
    this.abdomenGroup.scale.setScalar(1 + breath * 0.6);

    // Gentle body sway (no cursor tracking — fixed forward pose)
    this.headGroup.rotation.z = sway * 0.8;
    this.headGroup.rotation.x = -0.04; // slight forward tilt, looks engaged

    /* ── Blinking ──────────────────────────────────────────── */
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      const blink = { v: 0 };
      gsap.to(blink, {
        v: 1, duration: 0.10, yoyo: true, repeat: 1,
        onUpdate: () => {
          this.leftBlinkFactor  = blink.v;
          this.rightBlinkFactor = blink.v;
        },
        onComplete: () => {
          this.isBlinking = false;
          this.blinkTimer = Math.random() * 4 + 2.5;
        },
      });
    }

    /* ── Eyelid positions ──────────────────────────────────── */
    const wink     = this.expressionValues.wink;
    const sleepy   = this.expressionValues.sleepy;
    const surp     = this.expressionValues.surprised;
    const smile    = this.expressionValues.happy + this.expressionValues.laughing;

    const applyLids = (upper, lower, blink, extraWink) => {
      const totalClose = Math.max(blink, extraWink, sleepy * 0.60);
      const uTarget = -Math.PI*0.5 + totalClose * Math.PI*0.48 - surp*0.14;
      const lTarget =  Math.PI*0.5 - (totalClose + smile*0.28) * Math.PI*0.24 + surp*0.14;
      if (upper) upper.rotation.x = THREE.MathUtils.lerp(upper.rotation.x, uTarget, dt*14);
      if (lower) lower.rotation.x = THREE.MathUtils.lerp(lower.rotation.x, lTarget, dt*14);
    };
    applyLids(this.leftUpperLid,  this.leftLowerLid,  this.leftBlinkFactor,  wink);
    applyLids(this.rightUpperLid, this.rightLowerLid, this.rightBlinkFactor, 0);

    /* ── Smile morph ───────────────────────────────────────── */
    const smileW = 1.0 + smile * 0.30 + surp * 0.10;
    this.smileMesh.scale.x = THREE.MathUtils.lerp(this.smileMesh.scale.x, smileW, dt*10);

    /* ── Particles ─────────────────────────────────────────── */
    this.particles.update(time, dt);

    /* ── Antennae physics ──────────────────────────────────── */
    this.group.updateMatrixWorld(true);
    const hq = new THREE.Quaternion();
    this.headGroup.getWorldQuaternion(hq);

    const lbw = this.leftAntennaBase.clone().applyMatrix4(this.headGroup.matrixWorld);
    this.leftPhysics.update(dt, lbw, hq);
    this._rebuildTube(this.leftAntMesh, this.leftTip, this.leftPhysics);

    const rbw = this.rightAntennaBase.clone().applyMatrix4(this.headGroup.matrixWorld);
    this.rightPhysics.update(dt, rbw, hq);
    this._rebuildTube(this.rightAntMesh, this.rightTip, this.rightPhysics);

    /* ── Leg idle bounce ────────────────────────────────────── */
    this.legs.forEach((leg, i) => {
      const phase = (time + i * 0.8) * 1.6;
      leg.legGrp.position.y = leg.legGrp.position.y + (Math.sin(phase) * 0.003 - leg.legGrp.position.y * 0.1) * dt * 8;
    });
  }

  _rebuildTube(mesh, tipMesh, physics) {
    if (!physics.curve.points || physics.curve.points.length < 2) return;
    const inv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    const pts = physics.curve.points.map(p => p.clone().applyMatrix4(inv));
    const newGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.028, 9, false);
    mesh.geometry.dispose();
    mesh.geometry = newGeo;
    if (tipMesh && pts.length) tipMesh.position.copy(pts[pts.length - 1]);
  }

  /* No-op stubs kept for compatibility */
  setGazeTarget() {}
  triggerPhysicsImpulse(f) {
    this.leftPhysics.applyImpulse(f);
    this.rightPhysics.applyImpulse(f);
  }
}
