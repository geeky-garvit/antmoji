import * as THREE from 'three';

/**
 * Tangent-continuous tapered capsule along +Y, base sphere (r1) at y=0 and
 * tip sphere (r2) at y=length. Built with a lathe so shading is perfectly smooth.
 */
export function taperedCapsule(r1, r2, length, radial = 40, capSegs = 14) {
  const beta = Math.asin(THREE.MathUtils.clamp((r2 - r1) / length, -1, 1));
  const pts = [];
  for (let i = 0; i <= capSegs; i++) {
    const t = -Math.PI / 2 + (i / capSegs) * (beta + Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(r1 * Math.cos(t), 0), r1 * Math.sin(t)));
  }
  for (let i = 0; i <= capSegs; i++) {
    const t = beta + (i / capSegs) * (Math.PI / 2 - beta);
    pts.push(new THREE.Vector2(Math.max(r2 * Math.cos(t), 0), length + r2 * Math.sin(t)));
  }
  pts[0].x = 0;
  pts[pts.length - 1].x = 0;
  return new THREE.LatheGeometry(pts, radial);
}

const _up = new THREE.Vector3(0, 1, 0);

/** Mesh of a tapered capsule spanning a → b (both Vector3). */
export function capsuleBetween(a, b, r1, r2, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(taperedCapsule(r1, r2, len), material);
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(_up, dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

/**
 * Tube whose vertices are rewritten in place every frame from a list of
 * centre-line points (used for spring-animated antennae). Radius tapers
 * according to radiusAt(t) where t ∈ [0,1] along the tube.
 */
export class TaperedTube {
  constructor(numPoints, radial, radiusAt, material) {
    this.n = numPoints;
    this.radial = radial;
    this.radiusAt = radiusAt;
    const vCount = numPoints * (radial + 1) + 1; // +1 tip cap centre
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(vCount * 3);
    this.normals = new Float32Array(vCount * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < numPoints - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j, b = a + 1;
        const c = a + radial + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const tip = vCount - 1, last = (numPoints - 1) * (radial + 1);
    for (let j = 0; j < radial; j++) idx.push(last + j, tip, last + j + 1);
    this.geometry.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;

    this._T = Array.from({ length: numPoints }, () => new THREE.Vector3());
    this._N = new THREE.Vector3();
    this._B = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  /** @param {THREE.Vector3[]} pts exactly numPoints points */
  update(pts) {
    const n = this.n, R = this.radial, P = this.positions, Nn = this.normals;
    const T = this._T;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
      T[i].subVectors(b, a).normalize();
    }
    // Parallel-transport frame (no twisting along the tube)
    const N = this._N, Bv = this._B;
    N.set(0, 0, 1);
    if (Math.abs(N.dot(T[0])) > 0.9) N.set(1, 0, 0);
    N.sub(this._tmp.copy(T[0]).multiplyScalar(N.dot(T[0]))).normalize();
    for (let i = 0; i < n; i++) {
      if (i > 0) {
        N.sub(this._tmp.copy(T[i]).multiplyScalar(N.dot(T[i]))).normalize();
      }
      Bv.crossVectors(T[i], N);
      const r = this.radiusAt(i / (n - 1));
      const p = pts[i];
      for (let j = 0; j <= R; j++) {
        const ang = (j / R) * Math.PI * 2;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        const nx = cs * N.x + sn * Bv.x, ny = cs * N.y + sn * Bv.y, nz = cs * N.z + sn * Bv.z;
        const o = (i * (R + 1) + j) * 3;
        P[o] = p.x + nx * r; P[o + 1] = p.y + ny * r; P[o + 2] = p.z + nz * r;
        Nn[o] = nx; Nn[o + 1] = ny; Nn[o + 2] = nz;
      }
    }
    const tip = (n * (R + 1)) * 3, last = pts[n - 1], tl = T[n - 1];
    P[tip] = last.x + tl.x * this.radiusAt(1);
    P[tip + 1] = last.y + tl.y * this.radiusAt(1);
    P[tip + 2] = last.z + tl.z * this.radiusAt(1);
    Nn[tip] = tl.x; Nn[tip + 1] = tl.y; Nn[tip + 2] = tl.z;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }

  dispose() { this.geometry.dispose(); }
}

/** Extruded ring (frame) from an outer shape with an inner hole. */
export function extrudedRing(outer, inner, depth = 0.03, bevel = 0.012) {
  // Rebuild outline + hole from sampled points with guaranteed opposite winding.
  let op = outer.getPoints(64);
  let ip = inner.getPoints(64);
  if (!THREE.ShapeUtils.isClockWise(op)) op = op.reverse();
  if (THREE.ShapeUtils.isClockWise(ip)) ip = ip.reverse();
  const shape = new THREE.Shape(op);
  shape.holes = [new THREE.Path(ip)];
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 5, curveSegments: 48,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

export function circleShape(r, segments = 64) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
}

export function circlePath(r) {
  const p = new THREE.Path();
  p.absarc(0, 0, r, 0, Math.PI * 2, true);
  return p;
}

export function roundedRectShape(w, h, r, PathClass = THREE.Shape) {
  const s = new PathClass();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function heartShape(size, PathClass = THREE.Shape) {
  const s = new PathClass();
  const k = size;
  s.moveTo(0, -0.9 * k);
  s.bezierCurveTo(-0.35 * k, -0.6 * k, -1.0 * k, -0.25 * k, -1.0 * k, 0.25 * k);
  s.bezierCurveTo(-1.0 * k, 0.75 * k, -0.4 * k, 0.95 * k, 0, 0.5 * k);
  s.bezierCurveTo(0.4 * k, 0.95 * k, 1.0 * k, 0.75 * k, 1.0 * k, 0.25 * k);
  s.bezierCurveTo(1.0 * k, -0.25 * k, 0.35 * k, -0.6 * k, 0, -0.9 * k);
  return s;
}

/** Aviator / teardrop lens outline (for the right eye; mirror X for left). */
export function aviatorShape(size, PathClass = THREE.Shape) {
  const s = new PathClass();
  const k = size;
  s.moveTo(-0.95 * k, 0.55 * k);
  s.bezierCurveTo(-0.4 * k, 0.75 * k, 0.6 * k, 0.75 * k, 0.95 * k, 0.5 * k);
  s.bezierCurveTo(1.15 * k, 0.2 * k, 0.9 * k, -0.7 * k, 0.15 * k, -0.85 * k);
  s.bezierCurveTo(-0.5 * k, -0.95 * k, -1.05 * k, -0.3 * k, -0.95 * k, 0.55 * k);
  return s;
}

/** Scale a shape's points into a hole path (inset copy). */
export function insetPath(shapeFactory, size, inset) {
  return shapeFactory(size - inset, THREE.Path);
}
