/**
 * Procedural accessory library. Soft goods (hats, hair, scarves) are SDF
 * sculpts with baked vertex colour; hard goods (glasses, jewellery) use
 * bevelled extrusions and lathes. Everything is cached per option.
 */
import * as THREE from 'three';
import {
  meshSDF, cachedMesh, sdEllipsoid, sdSphere, sdRoundCone, sdTorus, sdRoundCylinder,
  sdCapsule, smin, smax, smoothstep, hexToLinear, rot2,
} from './sdf.js';
import {
  extrudedRing, circleShape, roundedRectShape, heartShape, aviatorShape,
} from './geometry.js';
import { HEAD } from './head.js';

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

const L = hexToLinear;
const setC = (out, c) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; };
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
const atan = (x, z) => Math.atan2(x, z);

/* Shell that hugs the skull (scaled skull ellipsoid) clipped above `cut`. */
function capShell(x, y, z, grow, cut, k = 0.03) {
  const d = sdEllipsoid(x, y, z, 0, 0.66, -0.02, 0.84 + grow, 0.76 + grow, 0.74 + grow);
  return smax(d, cut - y, k);
}

/* ══ HATS ═════════════════════════════════════════════════════════════ */

function propellerCap(m) {
  const g = new THREE.Group();
  const red = L('#ef4444'), yel = L('#facc15'), grn = L('#22c55e'), blu = L('#3b82f6');
  const geo = cachedMesh('hat|propeller', () => meshSDF((x, y, z) => {
    let d = capShell(x, y, z, 0.07, 1.02);
    const vis = smax(sdEllipsoid(x, y, z, 0, 1.04, 0.6, 0.46, 0.035, 0.36), 0.42 - z, 0.02);
    d = smin(d, vis, 0.04);
    d = smin(d, sdSphere(x, y, z, 0, 1.47, -0.02, 0.06), 0.03);
    return d;
  }, {
    min: [-1, 0.95, -0.95], max: [1, 1.6, 1.02], cell: 0.016,
    color: (x, y, z, o) => {
      if (y < 1.09 && z > 0.55) return setC(o, yel);
      if (y > 1.43) return setC(o, yel);
      const a = atan(x, z) + Math.PI / 4;
      const q = ((Math.floor(a / (Math.PI / 2)) % 4) + 4) % 4;
      setC(o, [red, yel, grn, blu][q]);
      // stitched seams
      const f = Math.abs(((a / (Math.PI / 2)) % 1 + 1) % 1 - 0.5);
      const s = 0.72 + 0.28 * smoothstep(0.47, 0.44, f);
      o[0] *= s; o[1] *= s; o[2] *= s;
    },
  }));
  g.add(mesh(geo, m.plastic));
  // Spinning propeller
  const prop = new THREE.Group();
  prop.position.set(0, 1.58, -0.02);
  const stem = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 16), m.goldPlain);
  stem.position.y = -0.05;
  prop.add(stem);
  const hub = mesh(new THREE.SphereGeometry(0.035, 16, 12), m.goldPlain);
  prop.add(hub);
  const bladeGeo = new THREE.SphereGeometry(1, 32, 12);
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

function beanie(m) {
  const body = L('#f59e0b'), cuff = L('#d97706'), pom = L('#fff7ed');
  const geo = cachedMesh('hat|beanie', () => meshSDF((x, y, z) => {
    const a = atan(x, z);
    let dome = capShell(x, y, z, 0.075, 1.0);
    dome = smin(dome, sdEllipsoid(x, y, z, 0, 1.32, -0.06, 0.6, 0.32, 0.58), 0.18);
    dome += 0.006 * Math.sin(a * 26);                          // knit ribs
    let band = smax(sdEllipsoid(x, y, z, 0, 0.66, -0.02, 0.94, 0.86, 0.84), Math.abs(y - 1.05) - 0.075, 0.04);
    band += 0.008 * Math.sin(a * 44);
    let d = smin(dome, band, 0.03);
    const pp = sdSphere(x, y, z, 0, 1.68, -0.08, 0.15) + 0.012 * Math.sin(x * 60) * Math.sin(y * 60) * Math.sin(z * 60);
    d = smin(d, pp, 0.05);
    return d;
  }, {
    min: [-1.02, 0.9, -1.0], max: [1.02, 1.9, 1.0], cell: 0.016,
    color: (x, y, z, o) => {
      if (y > 1.56) return setC(o, pom);
      setC(o, y < 1.13 ? cuff : body);
    },
  }));
  return mesh(geo, m.fabric);
}

function baseballCap(m) {
  const body = L('#14b8a6'), visor = L('#0f766e'), btn = L('#0f766e'), patch = L('#ffffff');
  const geo = cachedMesh('hat|cap', () => meshSDF((x, y, z) => {
    let d = capShell(x, y, z, 0.07, 1.02);
    const vis = smax(sdEllipsoid(x, y, z, 0, 1.05, 0.78, 0.5, 0.03, 0.46) + 0.08 * y * 0, 0.45 - z, 0.02);
    d = smin(d, vis, 0.05);
    d = smin(d, sdSphere(x, y, z, 0, 1.49, -0.02, 0.05), 0.03);
    return d;
  }, {
    min: [-1, 0.95, -0.95], max: [1, 1.6, 1.28], cell: 0.016,
    color: (x, y, z, o) => {
      if (y < 1.1 && z > 0.62) return setC(o, visor);
      if (y > 1.45) return setC(o, btn);
      // little white front logo patch
      const dx = x / 0.2, dy = (y - 1.28) / 0.13;
      if (z > 0.3 && dx * dx + dy * dy < 1) return setC(o, patch);
      setC(o, body);
    },
  }));
  const g = new THREE.Group();
  g.add(mesh(geo, m.plastic));
  g.rotation.x = -0.08;
  return g;
}

function crown(m) {
  const gold = L('#f2c14e'), red = L('#e11d48'), blue = L('#2563eb');
  const geo = cachedMesh('hat|crown', () => meshSDF((x, y, z) => {
    const a = atan(x, z);
    const r = Math.sqrt(x * x + z * z);
    const tri = 1 - Math.abs(((a / (Math.PI * 2 / 5)) % 1 + 1) % 1 * 2 - 1); // 5 points
    const topY = 0.14 + 0.16 * tri;
    let d = smax(Math.abs(r - 0.36) - 0.03, Math.max(-y, y - topY), 0.02) - 0.008;
    for (let i = 0; i < 5; i++) {
      const aa = (i + 0.5) * (Math.PI * 2 / 5);
      d = smin(d, sdSphere(x, y, z, Math.sin(aa) * 0.36, 0.31, Math.cos(aa) * 0.36, 0.035), 0.02);
    }
    d = smin(d, sdTorus(x, y, z, 0, 0.02, 0, 0.365, 0.03), 0.02);
    for (let i = 0; i < 5; i++) {
      const aa = (i + 0.5) * (Math.PI * 2 / 5);
      d = smin(d, sdSphere(x, y, z, Math.sin(aa) * 0.4, 0.08, Math.cos(aa) * 0.4, 0.035), 0.01);
    }
    return d;
  }, {
    min: [-0.5, -0.08, -0.5], max: [0.5, 0.4, 0.5], cell: 0.009,
    color: (x, y, z, o) => {
      const r = Math.sqrt(x * x + z * z);
      if (r > 0.395 && y > 0.04 && y < 0.12) {
        const a = atan(x, z);
        const i = Math.round(a / (Math.PI * 2 / 5) - 0.5);
        return setC(o, i % 2 ? blue : red);
      }
      setC(o, gold);
    },
  }));
  const g = new THREE.Group();
  const c = mesh(geo, m.gold);
  g.add(c);
  g.position.set(0.05, 1.22, -0.04);
  g.rotation.set(-0.12, 0, -0.14);
  g.scale.setScalar(1.3);
  return g;
}

function partyHat(m) {
  const pink = L('#ec4899'), yel = L('#fde047'), teal = L('#2dd4bf');
  const geo = cachedMesh('hat|party', () => meshSDF((x, y, z) => {
    let d = sdRoundCone(x, y, z, 0, 0, 0, 0, 0.62, 0, 0.3, 0.015);
    const pp = sdSphere(x, y, z, 0, 0.66, 0, 0.075) + 0.01 * Math.sin(x * 80) * Math.sin(y * 80) * Math.sin(z * 80);
    d = smin(d, pp, 0.03);
    d = smin(d, sdTorus(x, y, z, 0, 0.02, 0, 0.3, 0.035), 0.03);
    return d;
  }, {
    min: [-0.4, -0.35, -0.4], max: [0.4, 0.8, 0.4], cell: 0.01,
    color: (x, y, z, o) => {
      if (y > 0.6 || y < 0.06) return setC(o, y > 0.6 ? yel : teal);
      const t = y * 7 + atan(x, z) / Math.PI;
      setC(o, Math.floor(t) % 2 ? pink : yel);
    },
  }));
  const g = new THREE.Group();
  g.add(mesh(geo, m.plastic));
  g.position.set(0.16, 1.3, 0.0);
  g.rotation.set(0.05, 0, -0.32);
  return g;
}

function headphones(m) {
  const band = L('#e5e7eb'), cup = L('#f9a8d4'), pad = L('#1f2937');
  const geo = cachedMesh('hat|headphones', () => meshSDF((x, y, z) => {
    // elliptical band over the skull
    const qx = x / 0.95, qy = (y - 0.62) / 0.88;
    let b = (Math.sqrt(qx * qx + qy * qy) - 1) * 0.88;
    b = Math.sqrt(b * b + (z + 0.02) * (z + 0.02)) - 0.05;
    b = smax(b, 0.62 - y, 0.02);
    let d = b;
    for (const s of [-1, 1]) {
      // rotate a Y-cylinder onto the X axis
      const cup1 = sdRoundCylinder(y, x * s, z, 0.56, 0.9, 0.0, 0.22, 0.08, 0.05);
      const cushion = sdTorus(y, x * s, z, 0.56, 0.83, 0.0, 0.15, 0.06);
      d = smin(d, smin(cup1, cushion, 0.02), 0.04);
    }
    return d;
  }, {
    min: [-1.08, 0.25, -0.35], max: [1.08, 1.6, 0.35], cell: 0.014,
    color: (x, y, z, o) => {
      const ax = Math.abs(x);
      if (y < 0.86 && ax > 0.7) return setC(o, ax < 0.84 ? pad : cup);
      setC(o, band);
    },
  }));
  return mesh(geo, m.plastic);
}

function bow(m) {
  const pink = L('#f472b6'), dot = L('#ffffff');
  const geo = cachedMesh('hat|bow', () => meshSDF((x, y, z) => {
    let d = sdSphere(x, y, z, 0, 0, 0, 0.07);
    for (const s of [-1, 1]) {
      const [rx, ry] = rot2(x - s * 0.16, y, -s * 0.25);
      let lobe = sdEllipsoid(rx, ry, z, 0, 0, 0, 0.17, 0.12, 0.06);
      lobe = smax(lobe, -(Math.abs(rx + s * 0.17) - 0.02 + Math.abs(ry) * 0.6), 0.02);
      d = smin(d, lobe, 0.05);
    }
    return d;
  }, {
    min: [-0.4, -0.22, -0.15], max: [0.4, 0.22, 0.15], cell: 0.008,
    color: (x, y, z, o) => {
      const u = x * 22, v = y * 22;
      const fx = u - Math.round(u), fy = v - Math.round(v);
      setC(o, Math.abs(x) > 0.08 && fx * fx + fy * fy < 0.07 && (Math.round(u) + Math.round(v)) % 2 === 0 ? dot : pink);
    },
  }));
  const g = new THREE.Group();
  g.add(mesh(geo, m.plastic));
  g.position.set(0.44, 1.2, 0.36);
  g.rotation.set(-0.4, 0.5, 0.35);
  return g;
}

/* ══ HAIR (coloured by the hair material) ═════════════════════════════ */

function hairGeo(type) {
  return cachedMesh('hair|' + type, () => {
    let fn, min = [-1.02, 0.5, -0.98], max = [1.02, 1.75, 1.0], cell = 0.016;
    switch (type) {
      case 'tuft': {
        const strands = [
          [[0, 1.33, 0.12], [0.02, 1.55, 0.2], [0.12, 1.66, 0.12], [0.18, 1.6, 0.0]],
          [[-0.06, 1.33, 0.08], [-0.14, 1.5, 0.15], [-0.25, 1.55, 0.08]],
          [[0.06, 1.33, 0.02], [0.16, 1.48, -0.05], [0.28, 1.5, -0.1]],
        ];
        fn = (x, y, z) => {
          let d = 1;
          for (const s of strands) {
            for (let i = 0; i < s.length - 1; i++) {
              const r1 = 0.075 * (1 - i / s.length), r2 = 0.075 * (1 - (i + 1) / s.length) + 0.012;
              d = smin(d, sdRoundCone(x, y, z, ...s[i], ...s[i + 1], r1, r2), 0.04);
            }
          }
          return d;
        };
        min = [-0.45, 1.15, -0.3]; max = [0.45, 1.8, 0.4]; cell = 0.01;
        break;
      }
      case 'swoop':
        fn = (x, y, z) => {
          let d = capShell(x, y, z, 0.05, 1.04, 0.06);
          const [rx, ry] = rot2(x - 0.12, y - 1.14, 0.5);
          d = smin(d, sdEllipsoid(rx, ry, z, 0, 0, 0.5, 0.48, 0.13, 0.28), 0.12);
          d = smin(d, sdSphere(x, y, z, 0.52, 1.0, 0.5, 0.1), 0.12);
          d += 0.006 * Math.sin((x * 0.8 + y) * 55);   // strand grooves
          return d;
        };
        break;
      case 'bob':
        fn = (x, y, z) => {
          let d = sdEllipsoid(x, y, z, 0, 0.66, -0.04, 0.95, 0.86, 0.86);
          // cut out the face below the fringe and the bottom edge
          const face = Math.max(0.28 - z, y - 1.06);
          d = smax(d, -face, 0.05);
          d = smax(d, 0.3 - y + 0.06 * Math.max(0, Math.abs(x) - 0.5), 0.05);
          d += 0.006 * Math.sin(atan(x, z) * 46);
          return d;
        };
        min = [-1.05, 0.15, -1.0]; max = [1.05, 1.6, 1.0];
        break;
      case 'curly': {
        const balls = [];
        const N = 70;
        for (let i = 0; i < N; i++) {
          const yy = 1 - (i + 0.5) / N; // golden spiral over the upper sphere
          const r = Math.sqrt(1 - yy * yy), th = i * 2.39996;
          const p = [Math.cos(th) * r * 0.86, 0.66 + yy * 0.8, Math.sin(th) * r * 0.8 - 0.02];
          if (p[1] < 0.98 || (p[2] > 0.25 && p[1] < 1.12)) continue;
          balls.push(p);
        }
        fn = (x, y, z) => {
          let d = capShell(x, y, z, 0.03, 1.02, 0.05);
          for (const b of balls) d = smin(d, sdSphere(x, y, z, b[0], b[1], b[2], 0.14), 0.05);
          return d;
        };
        min = [-1.05, 0.85, -1.0]; max = [1.05, 1.62, 0.95];
        break;
      }
      case 'mohawk':
        fn = (x, y, z) => {
          let d = 1;
          for (let i = 0; i < 6; i++) {
            const a = -0.55 + i * 0.36;                   // angle from vertical, front (−) → back (+)
            const cy = Math.cos(a), sz = -Math.sin(a);
            const len = 1.08 - Math.abs(a - 0.2) * 0.12;
            d = smin(d, sdRoundCone(x, y, z, 0, 0.66 + cy * 0.7, sz * 0.68, 0, 0.66 + cy * len, sz * len, 0.11, 0.02), 0.06);
          }
          return d;
        };
        min = [-0.25, 0.9, -1.0]; max = [0.25, 1.8, 0.75]; cell = 0.012;
        break;
      case 'buns':
        fn = (x, y, z) => {
          let d = capShell(x, y, z, 0.035, 1.08, 0.05);
          for (const s of [-1, 1]) {
            d = smin(d, sdSphere(x, y, z, s * 0.46, 1.36, -0.06, 0.2) + 0.004 * Math.sin(atan(x - s * 0.46, z + 0.06) * 30 + y * 40), 0.06);
          }
          d += 0.004 * Math.sin(atan(x, z) * 50);
          return d;
        };
        min = [-1.0, 1.0, -0.95]; max = [1.0, 1.65, 0.95];
        break;
      default:
        return null;
    }
    return meshSDF(fn, { min, max, cell });
  });
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

function neckwear(type, m) {
  if (type === 'none') return null;
  const NY = HEAD.pivotY - 0.16;
  if (type === 'bowtie') {
    const red = L('#dc2626'), dot = L('#fef2f2');
    const geo = cachedMesh('neck|bowtie', () => meshSDF((x, y, z) => {
      let d = sdEllipsoid(x, y, z, 0, 0, 0, 0.06, 0.055, 0.045);
      for (const s of [-1, 1]) {
        const ax = Math.abs(x);
        // flared triangle-ish lobes that pinch towards the knot
        let lobe = sdEllipsoid(x, y, z, s * 0.15, 0, 0, 0.15, 0.1, 0.045);
        lobe = smax(lobe, Math.abs(y) - (0.03 + ax * 0.55), 0.03);
        d = smin(d, lobe, 0.03);
      }
      return d;
    }, {
      min: [-0.34, -0.15, -0.08], max: [0.34, 0.15, 0.08], cell: 0.006,
      color: (x, y, z, o) => {
        const u = x * 26, v = y * 26;
        const fx = u - Math.round(u), fy = v - Math.round(v);
        setC(o, Math.abs(x) > 0.07 && fx * fx + fy * fy < 0.06 ? dot : red);
      },
    }));
    const b = mesh(geo, m.fabric);
    b.position.set(0, NY + 0.02, 0.31);
    b.rotation.x = -0.3;
    return b;
  }
  if (type === 'scarf') {
    const a = L('#ef4444'), b = L('#fafafa');
    const geo = cachedMesh('neck|scarf', () => meshSDF((x, y, z) => {
      let d = sdTorus(x, y, z, 0, 0, 0, 0.27, 0.11);
      d += 0.006 * Math.sin(atan(x, z) * 36);
      const tail = sdRoundCone(x, y, z, 0.16, -0.02, 0.26, 0.24, -0.42, 0.36, 0.1, 0.09);
      const flat = Math.abs(z - 0.31 - (x - 0.2) * 0.2) - 0.04;
      d = smin(d, smax(tail, flat, 0.03), 0.06);
      return d;
    }, {
      min: [-0.46, -0.56, -0.46], max: [0.46, 0.16, 0.5], cell: 0.012,
      color: (x, y, z, o) => {
        const t = y < -0.08 ? Math.floor((y + 1) * 14) : Math.floor((atan(x, z) + Math.PI) * 2.2);
        setC(o, t % 2 ? a : b);
      },
    }));
    const s = mesh(geo, m.fabric);
    s.position.set(0, NY - 0.02, 0.0);
    s.rotation.x = 0.14;
    return s;
  }
  if (type === 'chain') {
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.3, 0.018, 12, 64), m.goldPlain);
    ring.rotation.x = Math.PI / 2 + 0.35;
    ring.scale.set(1, 1.05, 1);
    g.add(ring);
    const pend = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 40), m.goldPlain);
    disc.rotation.x = Math.PI / 2;
    const gem = mesh(new THREE.IcosahedronGeometry(0.03, 1), m.gem);
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

/* ══ Public API ═══════════════════════════════════════════════════════ */

export function buildHat(type, m) {
  switch (type) {
    case 'propeller': return propellerCap(m);
    case 'beanie': return beanie(m);
    case 'cap': return baseballCap(m);
    case 'crown': return crown(m);
    case 'party': return partyHat(m);
    case 'headphones': return headphones(m);
    case 'bow': return bow(m);
    default: return null;
  }
}

export function buildHair(type, m) {
  const geo = hairGeo(type);
  return geo ? mesh(geo, m.hair) : null;
}

export { eyewear as buildEyewear, earrings as buildEarrings, neckwear as buildNeckwear };

/** Every SDF accessory key, so the cache can be warmed during idle time. */
export const WARMABLE = {
  hat: ['propeller', 'beanie', 'cap', 'crown', 'party', 'headphones', 'bow'],
  hair: ['tuft', 'swoop', 'bob', 'curly', 'mohawk', 'buns'],
  neck: ['bowtie', 'scarf'],
};
