/**
 * Signed-distance-field sculpting + Surface Nets mesher.
 *
 * Characters are modelled as smooth unions of analytic primitives, then
 * polygonised once into a single seamless mesh. Vertices are projected onto
 * the true surface and normals come from the analytic field gradient, which
 * gives the "one continuous, polished skin" look of a hand-sculpted model.
 */
import * as THREE from 'three';

/* ── Primitives (scalar args for speed — these run ~1M times per mesh) ── */

export function sdSphere(x, y, z, cx, cy, cz, r) {
  x -= cx; y -= cy; z -= cz;
  return Math.sqrt(x * x + y * y + z * z) - r;
}

/** Inigo Quilez' bound-corrected ellipsoid approximation. */
export function sdEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  x -= cx; y -= cy; z -= cz;
  const ax = x / rx, ay = y / ry, az = z / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = x / (rx * rx), by = y / (ry * ry), bz = z / (rz * rz);
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  if (k1 < 1e-9) return -Math.min(rx, ry, rz);
  return (k0 * (k0 - 1)) / k1;
}

export function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax, pay = y - ay, paz = z - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  let h = (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz);
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

/** Exact round cone between two points with different radii. */
export function sdRoundCone(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = x - ax, pay = y - ay, paz = z - az;
  const yy = pax * bax + pay * bay + paz * baz;
  const zz = yy - l2;
  const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yy * yy * l2;
  const z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}

/** Torus lying in the XZ plane, centred at c. */
export function sdTorus(x, y, z, cx, cy, cz, R, r) {
  x -= cx; y -= cy; z -= cz;
  const q = Math.sqrt(x * x + z * z) - R;
  return Math.sqrt(q * q + y * y) - r;
}

/** Rounded cylinder along Y, centred at c. */
export function sdRoundCylinder(x, y, z, cx, cy, cz, radius, halfH, round) {
  x -= cx; y -= cy; z -= cz;
  const dx = Math.sqrt(x * x + z * z) - radius + round;
  const dy = Math.abs(y) - halfH + round;
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
  return Math.min(Math.max(dx, dy), 0) + Math.sqrt(ox * ox + oy * oy) - round;
}

/** Distance to a 3D polyline (array of [x,y,z]) thickened by r. */
export function sdPolyline(x, y, z, pts, r) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = sdCapsule(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], 0);
    if (d < best) best = d;
  }
  return best - r;
}

/* ── Operators ─────────────────────────────────────────────────────── */

export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export function smax(a, b, k) {
  return -smin(-a, -b, k);
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (e0, e1, v) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;

/** Rotate (x,y) by angle — helper for oriented primitives. */
export function rot2(a, b, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [a * c - b * s, a * s + b * c];
}

/* ── Surface Nets mesher ───────────────────────────────────────────── */

const CORNERS = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];
const EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * Polygonise the zero-set of `fn` inside [min,max] at resolution `cell`.
 * @param {(x:number,y:number,z:number)=>number} fn
 * @param {{min:number[],max:number[],cell:number,color?:Function,iters?:number}} opts
 *   color(x, y, z, out) may write linear RGB into out[0..2] per vertex.
 * @returns {THREE.BufferGeometry}
 */
export function meshSDF(fn, opts) {
  return geometryFromData(meshSDFData(fn, opts));
}

/** Same as meshSDF but returns plain typed arrays (transferable from a worker). */
export function meshSDFData(fn, { min, max, cell, color = null, iters = 4 }) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1;
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1;
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);

  // Narrow band: sample a coarse grid first, then only refine blocks that
  // can contain the surface. Cuts field evaluations by ~85%.
  const B = 4;
  const bx = Math.ceil((nx - 1) / B) + 1, by = Math.ceil((ny - 1) / B) + 1, bz = Math.ceil((nz - 1) / B) + 1;
  const coarse = new Float32Array(bx * by * bz);
  for (let k = 0, n = 0; k < bz; k++) {
    for (let j = 0; j < by; j++) {
      for (let i = 0; i < bx; i++) {
        coarse[n++] = fn(min[0] + i * B * cell, min[1] + j * B * cell, min[2] + k * B * cell);
      }
    }
  }
  const band = B * cell * 1.2;
  for (let k = 0; k < nz; k++) {
    const z = min[2] + k * cell;
    const kb = Math.round(k / B);
    for (let j = 0; j < ny; j++) {
      const y = min[1] + j * cell;
      const jb = Math.round(j / B);
      const row = nx * (j + ny * k);
      for (let i = 0; i < nx; i++) {
        const ib = Math.round(i / B);
        const c = coarse[Math.min(ib, bx - 1) + bx * (Math.min(jb, by - 1) + by * Math.min(kb, bz - 1))];
        F[row + i] = Math.abs(c) > band ? c : fn(min[0] + i * cell, y, z);
      }
    }
  }

  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cellVert = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const v = new Float32Array(8);

  for (let k = 0; k < cz; k++) {
    for (let j = 0; j < cy; j++) {
      for (let i = 0; i < cx; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNERS[c];
          v[c] = F[(i + o[0]) + nx * ((j + o[1]) + ny * (k + o[2]))];
          if (v[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        for (let e = 0; e < 12; e++) {
          const a = EDGES[e][0], b = EDGES[e][1];
          if ((v[a] < 0) === (v[b] < 0)) continue;
          const t = v[a] / (v[a] - v[b]);
          const oa = CORNERS[a], ob = CORNERS[b];
          sx += oa[0] + t * (ob[0] - oa[0]);
          sy += oa[1] + t * (ob[1] - oa[1]);
          sz += oa[2] + t * (ob[2] - oa[2]);
          cnt++;
        }
        cellVert[i + cx * (j + cy * k)] = pos.length / 3;
        pos.push(
          min[0] + (i + sx / cnt) * cell,
          min[1] + (j + sy / cnt) * cell,
          min[2] + (k + sz / cnt) * cell,
        );
      }
    }
  }

  const idx = [];
  const cv = (i, j, k) => cellVert[i + cx * (j + cy * k)];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, b, c, a, c, d);
    else idx.push(a, c, b, a, d, c);
  };

  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const f0 = F[i + nx * (j + ny * k)];
        const in0 = f0 < 0;
        // X edge → quad in the YZ plane
        if (i < cx && j > 0 && k > 0 && j < cy && k < cz) {
          const f1 = F[(i + 1) + nx * (j + ny * k)];
          if (in0 !== (f1 < 0)) {
            quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k), in0);
          }
        }
        // Y edge → quad in the ZX plane
        if (j < cy && i > 0 && k > 0 && i < cx && k < cz) {
          const f1 = F[i + nx * ((j + 1) + ny * k)];
          if (in0 !== (f1 < 0)) {
            quad(cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1), in0);
          }
        }
        // Z edge → quad in the XY plane
        if (k < cz && i > 0 && j > 0 && i < cx && j < cy) {
          const f1 = F[i + nx * (j + ny * (k + 1))];
          if (in0 !== (f1 < 0)) {
            quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k), in0);
          }
        }
      }
    }
  }

  // Project onto the true surface and take analytic normals.
  const count = pos.length / 3;
  const P = new Float32Array(pos);
  const N = new Float32Array(count * 3);
  const C = color ? new Float32Array(count * 3) : null;
  const e = cell * 0.08;
  const maxStep = cell * 0.75;
  const out = [1, 1, 1];

  for (let vi = 0; vi < count; vi++) {
    let x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
    let gx = 0, gy = 0, gz = 1;
    for (let it = 0; it <= iters; it++) {
      gx = fn(x + e, y, z) - fn(x - e, y, z);
      gy = fn(x, y + e, z) - fn(x, y - e, z);
      gz = fn(x, y, z + e) - fn(x, y, z - e);
      if (it === iters) break;
      const g2 = gx * gx + gy * gy + gz * gz;
      if (g2 < 1e-14) break;
      const d = fn(x, y, z);
      // gradient is scaled by 2e — undo that when stepping
      let s = (d * 2 * e) / g2;
      const stepLen = Math.abs(s) * Math.sqrt(g2);
      if (stepLen > maxStep) s *= maxStep / stepLen;
      x -= s * gx; y -= s * gy; z -= s * gz;
    }
    const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
    P[vi * 3] = x; P[vi * 3 + 1] = y; P[vi * 3 + 2] = z;
    N[vi * 3] = gx / gl; N[vi * 3 + 1] = gy / gl; N[vi * 3 + 2] = gz / gl;
    if (C) {
      out[0] = out[1] = out[2] = 1;
      color(x, y, z, out);
      C[vi * 3] = out[0]; C[vi * 3 + 1] = out[1]; C[vi * 3 + 2] = out[2];
    }
  }

  const index = count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  return { position: P, normal: N, color: C, index };
}

export function geometryFromData({ position, normal, color, index }) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  if (color) geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  geo.userData.shared = true;
  return geo;
}

/** sRGB hex → linear [r,g,b] (vertex colours are linear in three.js). */
export function hexToLinear(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

