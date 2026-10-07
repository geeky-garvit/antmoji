/**
 * Body sculpt (thorax · petiole waist · gaster) + jointed limb rig.
 * World space, ground at y = 0, character faces +Z.
 */
import * as THREE from 'three';
import { meshSDFData, sdEllipsoid, sdSphere, sdCapsule, smin, smoothstep } from './sdf.js';
import { capsuleBetween } from './geometry.js';
import { HEAD } from './head.js';

export const BODY = {
  thorax: [0, 2.26, 0.0, 0.4, 0.36, 0.34],
  petiole: [0, 1.88, -0.03, 0.17, 0.11, 0.15],
  gaster: [0, 1.3, -0.05, 0.56, 0.55, 0.52],
};

export function bodySculpt() {
  {
    const [tx, ty, tz, trx, try_, trz] = BODY.thorax;
    const [px, py, pz, prx, pry, prz] = BODY.petiole;
    const [gx, gy, gz, grx, gry, grz] = BODY.gaster;
    const fn = (x, y, z) => {
      let th = sdEllipsoid(x, y, z, tx, ty, tz, trx, try_, trz);
      th = smin(th, sdSphere(x, y, z, 0.3, 2.34, 0.02, 0.1), 0.08);    // shoulder sockets
      th = smin(th, sdSphere(x, y, z, -0.3, 2.34, 0.02, 0.1), 0.08);
      th = smin(th, sdCapsule(x, y, z, 0, 2.4, 0.0, 0, HEAD.pivotY + 0.12, 0.02, 0.135), 0.12); // neck
      const pe = sdEllipsoid(x, y, z, px, py, pz, prx, pry, prz);
      let ga = sdEllipsoid(x, y, z, gx, gy, gz, grx, gry, grz);
      ga = smin(ga, sdSphere(x, y, z, 0.25, 0.95, 0.02, 0.12), 0.14);   // hip sockets
      ga = smin(ga, sdSphere(x, y, z, -0.25, 0.95, 0.02, 0.12), 0.14);
      let d = smin(th, pe, 0.07);
      d = smin(d, ga, 0.07);
      return d;
    };
    // Subtle tergite bands on the gaster + AO at the waist
    const color = (x, y, z, out) => {
      const waist = 0.55 + 0.45 * smoothstep(0.02, 0.16, Math.abs(y - py));
      const band = (yy) => 1 - 0.18 * (1 - smoothstep(0, 0.025, Math.abs(y - yy))) * smoothstep(-0.2, 0.2, z);
      const v = waist * band(1.5) * band(1.18);
      out[0] = out[1] = out[2] = v;
    };
    return meshSDFData(fn, { min: [-0.72, 0.6, -0.68], max: [0.72, HEAD.pivotY + 0.3, 0.55], cell: 0.014, color });
  }
}

/**
 * A limb is a chain of joint groups; each group sits at its joint and holds
 * the segment mesh to the next joint, so rotating a group bends everything
 * below it (simple FK rig, rest pose = identity rotations).
 */
function buildLimb(points, radii, material, endFn) {
  const root = new THREE.Group();
  root.position.copy(points[0]);
  const joints = [root];
  let parent = root;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const local = new THREE.Vector3().subVectors(b, a);
    const seg = capsuleBetween(new THREE.Vector3(), local, radii[i], radii[i + 1], material);
    parent.add(seg);
    // joint ball for that cartoon "ball-jointed" look
    const ball = new THREE.Mesh(new THREE.SphereGeometry(radii[i] * 1.04, 40, 28), material);
    ball.castShadow = true;
    parent.add(ball);
    const child = new THREE.Group();
    child.position.copy(local);
    parent.add(child);
    joints.push(child);
    parent = child;
  }
  if (endFn) endFn(parent);
  return { root, joints };
}

function hand(material, side) {
  return (g) => {
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.07, 40, 28), material);
    palm.scale.set(1, 1.1, 0.9);
    palm.castShadow = true;
    g.add(palm);
    // three little rounded claws
    [-0.5, 0, 0.5].forEach((t) => {
      const tip = new THREE.Vector3(side * 0.02 + t * 0.06, -0.12, 0.03 + Math.abs(t) * -0.02);
      g.add(capsuleBetween(new THREE.Vector3(t * 0.03, -0.03, 0), tip, 0.03, 0.018, material));
    });
  };
}

function foot(material) {
  return (g) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
    f.scale.set(0.11, 0.065, 0.18);
    f.position.set(0, -0.03, 0.06);
    f.castShadow = true;
    g.add(f);
  };
}

export function buildLimbs(material) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const limbs = {};
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R';
    limbs['arm' + k] = buildLimb(
      [V(s * 0.36, 2.36, 0.03), V(s * 0.58, 1.95, 0.1), V(s * 0.6, 1.55, 0.2)],
      [0.078, 0.066, 0.058], material, hand(material, s));
    limbs['mid' + k] = buildLimb(
      [V(s * 0.34, 2.12, -0.12), V(s * 0.64, 1.86, -0.22), V(s * 0.74, 1.46, -0.16)],
      [0.058, 0.048, 0.042], material, hand(material, s));
    limbs['leg' + k] = buildLimb(
      [V(s * 0.25, 0.95, 0.02), V(s * 0.37, 0.52, 0.12), V(s * 0.33, 0.1, 0.02)],
      [0.085, 0.072, 0.064], material, foot(material));
  }
  return limbs;
}
