/**
 * Head sculpt (head-local space, origin = neck pivot).
 * Skull, cheeks, eye sockets, antenna sockets, mouth groove/cavity and
 * mandibles are fused into one SDF and meshed as a single seamless surface.
 */
import {
  meshSDF, cachedMesh, sdEllipsoid, sdSphere, sdRoundCone, sdPolyline,
  smin, smax, smoothstep,
} from './sdf.js';

export const HEAD = {
  pivotY: 2.8,                  // world Y of the neck pivot
  center: [0, 0.64, 0],
  radii: [0.84, 0.76, 0.74],
  eyeR: 0.3,
  eye: [0.31, 0.72, 0.5],       // right eye centre (mirror X for left)
  eyeYaw: 0.2,
  antennaBase: [0.27, 1.27, 0.27],
  earring: [0.8, 0.4, 0.06],
};

function skull(x, y, z) {
  let d = sdEllipsoid(x, y, z, 0, 0.64, 0, 0.84, 0.76, 0.74);
  d = smin(d, sdEllipsoid(x, y, z, 0, 0.4, 0.1, 0.72, 0.48, 0.64), 0.3);
  return d;
}

/** z of the skull surface at (x,y), searched from the front. */
function surfaceZ(x, y) {
  let lo = 0, hi = 1.2;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (skull(x, y, m) < 0) lo = m; else hi = m;
  }
  return lo;
}

function mouthCurve(fy, x0, x1, n = 14, inset = 0.004) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = fy(x);
    pts.push([x, y, surfaceZ(x, y) - inset]);
  }
  return pts;
}

/** Mouth description per option: grooves (polylines) + optional cavity. */
function mouthSpec(type) {
  const MY = 0.29;
  switch (type) {
    case 'grin': {
      const zc = surfaceZ(0, MY);
      return {
        grooves: [mouthCurve((x) => MY + 0.045 + 0.3 * x * x, -0.25, 0.25, 16)],
        grooveR: 0.018,
        cavity: { c: [0, MY + 0.04, zc - 0.02], r: [0.22, 0.16, 0.17], top: MY + 0.045 },
        interior: { c: [0, MY - 0.01, zc - 0.13], teeth: true, tongue: true },
      };
    }
    case 'o': {
      const zc = surfaceZ(0, MY - 0.02);
      return {
        grooves: [],
        cavity: { c: [0, MY - 0.02, zc - 0.02], r: [0.075, 0.095, 0.16] },
        interior: { c: [0, MY - 0.02, zc - 0.13], teeth: false, tongue: false },
      };
    }
    case 'smirk':
      return {
        grooves: [mouthCurve((x) => MY + 0.9 * (x - 0.03) ** 2 + 0.16 * Math.max(x, 0) ** 1.2 * 1.4, -0.15, 0.21)],
        dimples: [[0.21, MY + 0.11]],
      };
    case 'cat':
      return {
        grooves: [mouthCurve((x) => MY + 0.012 + 0.028 * Math.cos((2 * Math.PI * x) / 0.17) + 0.6 * x * x, -0.17, 0.17, 24)],
      };
    case 'tongue':
      return {
        grooves: [mouthCurve((x) => MY + 1.5 * x * x, -0.18, 0.18)],
        dimples: [[-0.18, MY + 0.05], [0.18, MY + 0.05]],
        tongueOut: [0.07, MY - 0.02, surfaceZ(0.07, MY - 0.02)],
      };
    case 'smile':
    default:
      return {
        grooves: [mouthCurve((x) => MY + 1.5 * x * x, -0.22, 0.22, 18)],
        dimples: [[-0.22, MY + 0.073], [0.22, MY + 0.073]],
      };
  }
}

function mandibleField(type) {
  const L = [];
  for (const s of [-1, 1]) {
    if (type === 'nubs') {
      L.push((x, y, z) => sdEllipsoid(x, y, z, s * 0.22, 0.15, 0.62, 0.1, 0.085, 0.09));
    } else if (type === 'fangs') {
      L.push((x, y, z) => sdRoundCone(x, y, z, s * 0.2, 0.2, 0.55, s * 0.09, -0.02, 0.78, 0.09, 0.03));
    } else if (type === 'pincers') {
      L.push((x, y, z) => smin(
        sdRoundCone(x, y, z, s * 0.25, 0.19, 0.5, s * 0.32, 0.02, 0.74, 0.1, 0.064),
        sdRoundCone(x, y, z, s * 0.32, 0.02, 0.74, s * 0.08, -0.07, 0.88, 0.064, 0.022), 0.05));
    }
  }
  return L;
}

/**
 * @returns {{ geometry, spec }} spec describes interior parts for the character to add.
 */
export function buildHead(mouth = 'smile', mandible = 'none') {
  return cachedMesh(`head|${mouth}|${mandible}`, () => {
    const spec = mouthSpec(mouth);
    const mands = mandibleField(mandible);
    const [ex, ey, ez] = HEAD.eye;
    const [ax, ay, az] = HEAD.antennaBase;
    const gr = spec.grooveR ?? 0.025;

    const grooveDist = (x, y, z) => {
      if (y < 0.12 || y > 0.52 || z < 0.3 || x < -0.4 || x > 0.4) return 1;
      let d = 1;
      for (const g of spec.grooves) d = Math.min(d, sdPolyline(x, y, z, g, gr));
      for (const [dx, dy] of spec.dimples || []) {
        d = Math.min(d, sdSphere(x, y, z, dx, dy, surfaceZ(dx, dy), 0.02));
      }
      return d;
    };
    const cavityDist = (x, y, z) => {
      const cv = spec.cavity;
      if (!cv) return 1;
      let d = sdEllipsoid(x, y, z, cv.c[0], cv.c[1], cv.c[2], cv.r[0], cv.r[1], cv.r[2]);
      if (cv.top !== undefined) d = smax(d, y - cv.top, 0.03); // flat upper lip → "D" mouth
      return d;
    };

    const fn = (x, y, z) => {
      let d = skull(x, y, z);
      // antenna sockets
      d = smin(d, sdSphere(x, y, z, ax, ay, az, 0.085), 0.12);
      d = smin(d, sdSphere(x, y, z, -ax, ay, az, 0.085), 0.12);
      // brow ridge for a touch of expression above each eye
      d = smin(d, sdEllipsoid(x, y, z, ex * 1.08, ey + 0.25, ez - 0.02, 0.22, 0.07, 0.18), 0.1);
      d = smin(d, sdEllipsoid(x, y, z, -ex * 1.08, ey + 0.25, ez - 0.02, 0.22, 0.07, 0.18), 0.1);
      // mandibles
      for (const m of mands) d = smin(d, m(x, y, z), 0.07);
      // eye sockets
      d = smax(d, -sdSphere(x, y, z, ex, ey, ez, HEAD.eyeR + 0.004), 0.05);
      d = smax(d, -sdSphere(x, y, z, -ex, ey, ez, HEAD.eyeR + 0.004), 0.05);
      // mouth
      d = smax(d, -grooveDist(x, y, z), 0.022);
      d = smax(d, -cavityDist(x, y, z), 0.03);
      return d;
    };

    const color = (x, y, z, out) => {
      // ambient-occlusion style darkening inside grooves and the mouth
      const g = Math.min(grooveDist(x, y, z), cavityDist(x, y, z));
      const ao = 0.22 + 0.78 * smoothstep(-0.005, 0.05, g);
      // socket rim occlusion around the eyes
      const er = Math.min(
        sdSphere(x, y, z, ex, ey, ez, HEAD.eyeR),
        sdSphere(x, y, z, -ex, ey, ez, HEAD.eyeR),
      );
      const eo = 0.55 + 0.45 * smoothstep(0, 0.06, er);
      out[0] = out[1] = out[2] = ao * eo;
    };

    const geometry = meshSDF(fn, {
      min: [-0.96, -0.3, -0.82],
      max: [0.96, 1.46, 0.98],
      cell: 0.018,
      color,
    });
    return { geometry, spec };
  });
}
