/**
 * SDF sculpts for soft accessories (hats, hair, neckwear).
 * Pure functions → typed arrays, so they run inside the sculpt workers.
 */
import {
  meshSDFData, sdEllipsoid, sdSphere, sdRoundCone, sdTorus, sdRoundCylinder,
  smin, smax, smoothstep, hexToLinear as L, rot2,
} from './sdf.js';

const setC = (out, c) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; };
const atan = (x, z) => Math.atan2(x, z);

/* Shell that hugs the skull (scaled skull ellipsoid) clipped above `cut`. */
function capShell(x, y, z, grow, cut, k = 0.03) {
  const d = sdEllipsoid(x, y, z, 0, 0.66, -0.02, 0.84 + grow, 0.76 + grow, 0.74 + grow);
  return smax(d, cut - y, k);
}

/* ══ HATS ═════════════════════════════════════════════════════════════ */

function propeller() {
  const red = L('#ef4444'), yel = L('#facc15'), grn = L('#22c55e'), blu = L('#3b82f6');
  return meshSDFData((x, y, z) => {
    let d = capShell(x, y, z, 0.07, 1.02);
    const vis = smax(sdEllipsoid(x, y, z, 0, 1.04, 0.6, 0.46, 0.035, 0.36), 0.42 - z, 0.02);
    d = smin(d, vis, 0.04);
    d = smin(d, sdSphere(x, y, z, 0, 1.47, -0.02, 0.06), 0.03);
    return d;
  }, {
    min: [-1, 0.95, -0.95], max: [1, 1.6, 1.02], cell: 0.011,
    color: (x, y, z, o) => {
      if (y < 1.09 && z > 0.55) return setC(o, yel);
      if (y > 1.43) return setC(o, yel);
      const a = atan(x, z) + Math.PI / 4;
      const q = ((Math.floor(a / (Math.PI / 2)) % 4) + 4) % 4;
      setC(o, [red, yel, grn, blu][q]);
      // stitched seams (soft falloff, no hard lines)
      const f = Math.abs((((a / (Math.PI / 2)) % 1) + 1) % 1 - 0.5);
      const s = 0.78 + 0.22 * smoothstep(0.49, 0.43, f);
      o[0] *= s; o[1] *= s; o[2] *= s;
    },
  });
}

function beanie() {
  const body = L('#f59e0b'), cuff = L('#d97706'), pom = L('#fff7ed');
  return meshSDFData((x, y, z) => {
    const a = atan(x, z);
    let dome = capShell(x, y, z, 0.075, 1.0);
    dome = smin(dome, sdEllipsoid(x, y, z, 0, 1.32, -0.06, 0.6, 0.32, 0.58), 0.18);
    dome += 0.005 * Math.sin(a * 26);                          // knit ribs
    let band = smax(sdEllipsoid(x, y, z, 0, 0.66, -0.02, 0.94, 0.86, 0.84), Math.abs(y - 1.05) - 0.075, 0.04);
    band += 0.007 * Math.sin(a * 44);
    let d = smin(dome, band, 0.03);
    const pp = sdSphere(x, y, z, 0, 1.68, -0.08, 0.15) + 0.01 * Math.sin(x * 60) * Math.sin(y * 60) * Math.sin(z * 60);
    d = smin(d, pp, 0.05);
    return d;
  }, {
    min: [-1.02, 0.9, -1.0], max: [1.02, 1.9, 1.0], cell: 0.011,
    color: (x, y, z, o) => {
      if (y > 1.56) return setC(o, pom);
      setC(o, y < 1.13 ? cuff : body);
    },
  });
}

function cap() {
  const body = L('#14b8a6'), visor = L('#0f766e'), patch = L('#ffffff');
  return meshSDFData((x, y, z) => {
    let d = capShell(x, y, z, 0.07, 1.02);
    const vis = smax(sdEllipsoid(x, y, z, 0, 1.05, 0.78, 0.5, 0.03, 0.46), 0.45 - z, 0.02);
    d = smin(d, vis, 0.05);
    d = smin(d, sdSphere(x, y, z, 0, 1.49, -0.02, 0.05), 0.03);
    return d;
  }, {
    min: [-1, 0.95, -0.95], max: [1, 1.6, 1.28], cell: 0.011,
    color: (x, y, z, o) => {
      if (y < 1.1 && z > 0.62) return setC(o, visor);
      if (y > 1.45) return setC(o, visor);
      const dx = x / 0.2, dy = (y - 1.28) / 0.13;
      if (z > 0.3 && dx * dx + dy * dy < 1) return setC(o, patch);
      setC(o, body);
    },
  });
}

function crown() {
  const gold = L('#f2c14e'), red = L('#e11d48'), blue = L('#2563eb');
  const SEG = (Math.PI * 2) / 5;
  return meshSDFData((x, y, z) => {
    const a = atan(x, z);
    const r = Math.sqrt(x * x + z * z);
    const tri = 1 - Math.abs((((a / SEG) % 1) + 1) % 1 * 2 - 1); // 5 points
    const topY = 0.14 + 0.16 * tri;
    let d = smax(Math.abs(r - 0.36) - 0.03, Math.max(-y, y - topY), 0.02) - 0.008;
    for (let i = 0; i < 5; i++) {
      const aa = (i + 0.5) * SEG;
      d = smin(d, sdSphere(x, y, z, Math.sin(aa) * 0.36, 0.31, Math.cos(aa) * 0.36, 0.035), 0.02);
      d = smin(d, sdSphere(x, y, z, Math.sin(aa) * 0.4, 0.08, Math.cos(aa) * 0.4, 0.035), 0.01);
    }
    d = smin(d, sdTorus(x, y, z, 0, 0.02, 0, 0.365, 0.03), 0.02);
    return d;
  }, {
    min: [-0.5, -0.08, -0.5], max: [0.5, 0.4, 0.5], cell: 0.0065,
    color: (x, y, z, o) => {
      const r = Math.sqrt(x * x + z * z);
      if (r > 0.395 && y > 0.04 && y < 0.12) {
        const i = Math.round(atan(x, z) / SEG - 0.5);
        return setC(o, i % 2 ? blue : red);
      }
      setC(o, gold);
    },
  });
}

function party() {
  const pink = L('#ec4899'), yel = L('#fde047'), teal = L('#2dd4bf');
  return meshSDFData((x, y, z) => {
    let d = sdRoundCone(x, y, z, 0, 0, 0, 0, 0.62, 0, 0.3, 0.015);
    const pp = sdSphere(x, y, z, 0, 0.66, 0, 0.075) + 0.008 * Math.sin(x * 80) * Math.sin(y * 80) * Math.sin(z * 80);
    d = smin(d, pp, 0.03);
    d = smin(d, sdTorus(x, y, z, 0, 0.02, 0, 0.3, 0.035), 0.03);
    return d;
  }, {
    min: [-0.4, -0.35, -0.4], max: [0.4, 0.8, 0.4], cell: 0.0075,
    color: (x, y, z, o) => {
      if (y > 0.6 || y < 0.06) return setC(o, y > 0.6 ? yel : teal);
      const t = y * 7 + atan(x, z) / Math.PI;
      setC(o, Math.floor(t) % 2 ? pink : yel);
    },
  });
}

function headphones() {
  const band = L('#e5e7eb'), cup = L('#f9a8d4'), pad = L('#1f2937');
  return meshSDFData((x, y, z) => {
    const qx = x / 0.95, qy = (y - 0.62) / 0.88;
    let b = (Math.sqrt(qx * qx + qy * qy) - 1) * 0.88;
    b = Math.sqrt(b * b + (z + 0.02) * (z + 0.02)) - 0.05;
    b = smax(b, 0.62 - y, 0.02);
    let d = b;
    for (const s of [-1, 1]) {
      // Y-axis primitives evaluated with swapped coords → X-axis ear cups
      const cup1 = sdRoundCylinder(y, x * s, z, 0.56, 0.9, 0.0, 0.22, 0.08, 0.05);
      const cushion = sdTorus(y, x * s, z, 0.56, 0.83, 0.0, 0.15, 0.06);
      d = smin(d, smin(cup1, cushion, 0.02), 0.04);
    }
    return d;
  }, {
    min: [-1.08, 0.25, -0.35], max: [1.08, 1.6, 0.35], cell: 0.01,
    color: (x, y, z, o) => {
      const ax = Math.abs(x);
      if (y < 0.86 && ax > 0.7) return setC(o, ax < 0.84 ? pad : cup);
      setC(o, band);
    },
  });
}

function bow() {
  const pink = L('#f472b6'), dot = L('#ffffff');
  return meshSDFData((x, y, z) => {
    let d = sdSphere(x, y, z, 0, 0, 0, 0.07);
    for (const s of [-1, 1]) {
      const [rx, ry] = rot2(x - s * 0.16, y, -s * 0.25);
      let lobe = sdEllipsoid(rx, ry, z, 0, 0, 0, 0.17, 0.12, 0.06);
      lobe = smax(lobe, -(Math.abs(rx + s * 0.17) - 0.02 + Math.abs(ry) * 0.6), 0.02);
      d = smin(d, lobe, 0.05);
    }
    return d;
  }, {
    min: [-0.4, -0.22, -0.15], max: [0.4, 0.22, 0.15], cell: 0.0055,
    color: (x, y, z, o) => {
      const u = x * 22, v = y * 22;
      const fx = u - Math.round(u), fy = v - Math.round(v);
      setC(o, Math.abs(x) > 0.08 && fx * fx + fy * fy < 0.07 && (Math.round(u) + Math.round(v)) % 2 === 0 ? dot : pink);
    },
  });
}

/* ══ HAIR ═════════════════════════════════════════════════════════════ */

function hair(type) {
  let fn, min = [-1.02, 0.5, -0.98], max = [1.02, 1.75, 1.0], cell = 0.011;
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
      min = [-0.45, 1.15, -0.3]; max = [0.45, 1.8, 0.4]; cell = 0.0065;
      break;
    }
    case 'swoop':
      fn = (x, y, z) => {
        let d = capShell(x, y, z, 0.05, 1.04, 0.06);
        const [rx, ry] = rot2(x - 0.12, y - 1.14, 0.5);
        d = smin(d, sdEllipsoid(rx, ry, z, 0, 0, 0.5, 0.48, 0.13, 0.28), 0.12);
        d = smin(d, sdSphere(x, y, z, 0.52, 1.0, 0.5, 0.1), 0.12);
        d += 0.005 * Math.sin((x * 0.8 + y) * 55);   // strand grooves
        return d;
      };
      break;
    case 'bob':
      fn = (x, y, z) => {
        let d = sdEllipsoid(x, y, z, 0, 0.66, -0.04, 0.95, 0.86, 0.86);
        const face = Math.max(0.28 - z, y - 1.06);
        d = smax(d, -face, 0.05);
        d = smax(d, 0.3 - y + 0.06 * Math.max(0, Math.abs(x) - 0.5), 0.05);
        d += 0.005 * Math.sin(atan(x, z) * 46);
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
        if (d > 0.3) return d;
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
      min = [-0.25, 0.85, -1.1]; max = [0.25, 1.8, 0.75]; cell = 0.008;
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
      throw new Error('unknown hair ' + type);
  }
  return meshSDFData(fn, { min, max, cell });
}

/* ══ NECKWEAR ═════════════════════════════════════════════════════════ */

function bowtie() {
  const red = L('#dc2626'), dot = L('#fef2f2');
  return meshSDFData((x, y, z) => {
    let d = sdEllipsoid(x, y, z, 0, 0, 0, 0.06, 0.055, 0.045);
    for (const s of [-1, 1]) {
      const ax = Math.abs(x);
      let lobe = sdEllipsoid(x, y, z, s * 0.15, 0, 0, 0.15, 0.1, 0.045);
      lobe = smax(lobe, Math.abs(y) - (0.03 + ax * 0.55), 0.03);
      d = smin(d, lobe, 0.03);
    }
    return d;
  }, {
    min: [-0.34, -0.15, -0.08], max: [0.34, 0.15, 0.08], cell: 0.0045,
    color: (x, y, z, o) => {
      const u = x * 26, v = y * 26;
      const fx = u - Math.round(u), fy = v - Math.round(v);
      setC(o, Math.abs(x) > 0.07 && fx * fx + fy * fy < 0.06 ? dot : red);
    },
  });
}

function scarf() {
  const a = L('#ef4444'), b = L('#fafafa');
  return meshSDFData((x, y, z) => {
    let d = sdTorus(x, y, z, 0, 0, 0, 0.27, 0.11);
    d += 0.005 * Math.sin(atan(x, z) * 36);
    const tail = sdRoundCone(x, y, z, 0.16, -0.02, 0.26, 0.24, -0.42, 0.36, 0.1, 0.09);
    const flat = Math.abs(z - 0.31 - (x - 0.2) * 0.2) - 0.04;
    d = smin(d, smax(tail, flat, 0.03), 0.06);
    return d;
  }, {
    min: [-0.46, -0.56, -0.46], max: [0.46, 0.16, 0.5], cell: 0.008,
    color: (x, y, z, o) => {
      const t = y < -0.08 ? Math.floor((y + 1) * 14) : Math.floor((atan(x, z) + Math.PI) * 2.2);
      setC(o, t % 2 ? a : b);
    },
  });
}

export const ACCESSORY_SCULPTS = {
  'hat|propeller': propeller,
  'hat|beanie': beanie,
  'hat|cap': cap,
  'hat|crown': crown,
  'hat|party': party,
  'hat|headphones': headphones,
  'hat|bow': bow,
  'hair|tuft': () => hair('tuft'),
  'hair|swoop': () => hair('swoop'),
  'hair|bob': () => hair('bob'),
  'hair|curly': () => hair('curly'),
  'hair|mohawk': () => hair('mohawk'),
  'hair|buns': () => hair('buns'),
  'neck|bowtie': bowtie,
  'neck|scarf': scarf,
};
