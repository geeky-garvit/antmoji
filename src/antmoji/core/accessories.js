/**
 * Accessory builders. Soft goods (hats, hair, scarves) use SDF sculpts from
 * accessorySculpts.js (meshed in workers, see sculptCache.js); hard goods
 * (glasses, jewellery) use bevelled extrusions and lathes built here.
 */
import * as THREE from 'three';
import { extrudedRing, circleShape, roundedRectShape, heartShape, aviatorShape } from './geometry.js';
import { HEAD } from './head.js';
import { getSculpt } from './sculptCache.js';

/* ── Materials ─────────────────────────────────────────────────────── */
export function createAccessoryMaterials() {
  return {
    fabric: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.62, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') }),
    plastic: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
    gold: new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 1, roughness: 0.2, clearcoat: 0.4 }),
    goldPlain: new THREE.MeshPhysicalMaterial({ color: '#f2c14e', metalness: 1, roughness: 0.18 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: '#fbf6ee', roughness: 0.18, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 }),
    gem: new THREE.MeshPhysicalMaterial({ color: '#dff4ff', roughness: 0.02, metalness: 0.2, clearcoat: 1, iridescence: 0.6 }),
    frame: new THREE.MeshPhysicalMaterial({ color: '#111318', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }),
    frameColor: new THREE.MeshPhysicalMaterial({ color: '#ff4d8d', roughness: 0.25, clearcoat: 1 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false }),
    shadeLens: new THREE.MeshPhysicalMaterial({ color: '#141824', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.88, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.8 }),
    heartLens: new THREE.MeshPhysicalMaterial({ color: '#ff3d7f', roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1 }),
    hair: new THREE.MeshPhysicalMaterial({ color: '#8a4b24', roughness: 0.5, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color('#ffe2c2'), clearcoat: 0.25, clearcoatRoughness: 0.4 }),
  };
}

const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
const sculpted = (key, mat) => { const g = getSculpt(key); return g ? mesh(g, mat) : null; };

/* ══ HATS ═════════════════════════════════════════════════════════════ */

function propellerCap(m) {
  const g = new THREE.Group();
  const cap = sculpted('hat|propeller', m.plastic);
  if (cap) g.add(cap);
  const prop = new THREE.Group();
  prop.position.set(0, 1.58, -0.02);
  const stem = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 24), m.goldPlain);
  stem.position.y = -0.05;
  prop.add(stem, mesh(new THREE.SphereGeometry(0.035, 24, 16), m.goldPlain));
  const bladeGeo = new THREE.SphereGeometry(1, 48, 16);
  [['#ef4444', 1], ['#3b82f6', -1]].forEach(([col, s]) => {
    const b = mesh(bladeGeo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 1 }));
    b.scale.set(0.24, 0.016, 0.065);
    b.position.x = s * 0.24;
    b.rotation.x = s * 0.25;
    prop.add(b);
  });
  g.add(prop);
  g.userData.spin = prop;
  return g;
}

function placed(key, mat, pos, rot, scale = 1) {
  const g = new THREE.Group();
  const s = sculpted(key, mat);
  if (s) g.add(s);
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  g.scale.setScalar(scale);
  return g;
}

export function buildHat(type, m) {
  switch (type) {
    case 'propeller': return propellerCap(m);
    case 'beanie': return sculpted('hat|beanie', m.fabric);
    case 'cap': return placed('hat|cap', m.plastic, null, [-0.08, 0, 0]);
    case 'crown': return placed('hat|crown', m.gold, [0.05, 1.22, -0.04], [-0.12, 0, -0.14], 1.3);
    case 'party': return placed('hat|party', m.plastic, [0.16, 1.3, 0], [0.05, 0, -0.32]);
    case 'headphones': return sculpted('hat|headphones', m.plastic);
    case 'bow': return placed('hat|bow', m.plastic, [0.44, 1.2, 0.36], [-0.4, 0.5, 0.35]);
    default: return null;
  }
}

/* ══ HAIR (coloured by the hair material) ═════════════════════════════ */

export function buildHair(type, m) {
  return type === 'none' ? null : sculpted('hair|' + type, m.hair);
}

/* ══ EYEWEAR ══════════════════════════════════════════════════════════ */

function eyewear(type, m) {
  if (type === 'none') return null;
  const g = new THREE.Group();
  const [ex, ey, ez] = HEAD.eye;
  const yaw = HEAD.eyeYaw;
  const dist = 0.37;
  let frameMat = m.frame, lensMat = m.lens;
  let outerF, innerF, size, inset;
  switch (type) {
    case 'square':
      outerF = (s, P) => roundedRectShape(s * 2.15, s * 1.7, s * 0.42, P); size = 0.31; inset = 0.045; break;
    case 'shades':
      outerF = aviatorShape; size = 0.3; inset = 0.035; lensMat = m.shadeLens; frameMat = m.goldPlain; break;
    case 'heart':
      outerF = heartShape; size = 0.32; inset = 0.05; lensMat = m.heartLens; frameMat = m.frameColor; break;
    case 'round':
    default:
      outerF = (s) => circleShape(s); size = 0.315; inset = 0.035; break;
  }
  const lensPts = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * ex, ey, ez);
    pivot.rotation.y = s * yaw;
    const holder = new THREE.Group();
    holder.position.z = dist;
    if (s < 0 && type === 'shades') holder.scale.x = -1;
    const outer = outerF(size, THREE.Shape);
    const inner = outerF(size - inset, THREE.Path);
    const frame = mesh(extrudedRing(outer, inner, 0.035, 0.012), frameMat);
    holder.add(frame);
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(outerF(size - inset * 0.6, THREE.Shape), 32), lensMat);
    lens.renderOrder = 2;
    holder.add(lens);
    pivot.add(holder);
    g.add(pivot);
    pivot.updateMatrix(); holder.updateMatrix();
    const toHead = (lx, ly) => new THREE.Vector3(lx, ly, 0).applyMatrix4(holder.matrix).applyMatrix4(pivot.matrix);
    lensPts.push({ inner: toHead(-s * size * 0.95, size * 0.15), outer: toHead(s * size * 0.98, size * 0.25) });
  }
  // bridge
  const [Lp, Rp] = lensPts;
  const mid = new THREE.Vector3(0, Lp.inner.y + 0.06, (Lp.inner.z + Rp.inner.z) / 2 + 0.03);
  const bridge = new THREE.CatmullRomCurve3([Lp.inner, mid, Rp.inner]);
  g.add(mesh(new THREE.TubeGeometry(bridge, 24, 0.017, 10), frameMat));
  // temples hugging the skull back towards the "ears"
  for (const P of lensPts) {
    const s = Math.sign(P.outer.x);
    const c = new THREE.CatmullRomCurve3([
      P.outer,
      new THREE.Vector3(s * 0.8, P.outer.y, 0.45),
      new THREE.Vector3(s * 0.88, P.outer.y - 0.02, 0.05),
    ]);
    g.add(mesh(new THREE.TubeGeometry(c, 24, 0.016, 10), frameMat));
  }
  return g;
}

/* ══ EARRINGS ═════════════════════════════════════════════════════════ */

function earrings(type, m) {
  if (type === 'none') return null;
  const g = new THREE.Group();
  const [x, y, z] = HEAD.earring;
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * x, y, z);
    if (type === 'stud') {
      const gem = mesh(new THREE.IcosahedronGeometry(0.045, 1), m.gem);
      const set = mesh(new THREE.TorusGeometry(0.045, 0.012, 10, 24), m.goldPlain);
      set.rotation.y = Math.PI / 2;
      e.add(gem, set);
    } else if (type === 'hoop') {
      const hoop = mesh(new THREE.TorusGeometry(0.085, 0.014, 16, 48), m.goldPlain);
      hoop.rotation.y = Math.PI / 2 - s * 0.3;
      hoop.position.y = -0.08;
      e.add(hoop);
    } else if (type === 'pearl') {
      const hook = mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 20, Math.PI * 1.3), m.goldPlain);
      hook.rotation.y = Math.PI / 2;
      const p = mesh(new THREE.SphereGeometry(0.055, 28, 20), m.pearl);
      p.position.y = -0.09;
      e.add(hook, p);
    }
    g.add(e);
  }
  return g;
}


/* ══ NECKWEAR (body space) ═══════════════════════════════════════════ */

export function buildNeckwear(type, m) {
  const NY = HEAD.pivotY - 0.16;
  if (type === 'bowtie') return placed('neck|bowtie', m.fabric, [0, NY + 0.02, 0.31], [-0.3, 0, 0]);
  if (type === 'scarf') return placed('neck|scarf', m.fabric, [0, NY - 0.02, 0], [0.14, 0, 0]);
  if (type === 'chain') {
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.3, 0.018, 16, 96), m.goldPlain);
    ring.rotation.x = Math.PI / 2 + 0.35;
    ring.scale.set(1, 1.05, 1);
    g.add(ring);
    const pend = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 48), m.goldPlain);
    disc.rotation.x = Math.PI / 2;
    const gem = mesh(new THREE.IcosahedronGeometry(0.03, 2), m.gem);
    gem.position.z = 0.018;
    pend.add(disc, gem);
    pend.position.set(0, -0.14, 0.32);
    pend.rotation.x = -0.25;
    g.add(pend);
    g.position.set(0, NY - 0.04, 0.02);
    return g;
  }
  return null;
}

export { eyewear as buildEyewear, earrings as buildEarrings };

/** Sculpt keys a config needs before it can be shown. */
export function sculptKeysFor(c) {
  const keys = ['body', `head|${c.mouth}|${c.mandible}`];
  if (c.hat !== 'none') keys.push('hat|' + c.hat);
  if (c.hair !== 'none') keys.push('hair|' + c.hair);
  if (c.neck === 'bowtie' || c.neck === 'scarf') keys.push('neck|' + c.neck);
  return keys;
}
