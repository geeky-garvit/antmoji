import * as THREE from 'three';

/**
 * Procedural Spring-Bone / Verlet Integration Physics for Ant Antennae & Hair Tufts.
 * Simulates secondary motion, inertia, damping, and elasticity.
 */
export class AntennaePhysics {
  constructor(options = {}) {
    this.numSegments = options.numSegments || 7;
    this.segmentLength = options.segmentLength || 0.35;
    this.stiffness = options.stiffness !== undefined ? options.stiffness : 0.45; // Spring force towards rest position
    this.damping = options.damping !== undefined ? options.damping : 0.82;     // Energy decay
    this.gravity = options.gravity !== undefined ? options.gravity : -0.15;

    // Node chain representation: { position, prevPosition, targetLocalOffset }
    this.nodes = [];
    this.curve = new THREE.CatmullRomCurve3([]);
    
    // Rest pose relative directions (spherical curve outwards & up)
    this.restOffsets = [];
    this.initRestOffsets(options.baseAngleX || 0.4, options.baseAngleY || 0.2);
  }

  initRestOffsets(angleX, angleY) {
    let currentDir = new THREE.Vector3(
      Math.sin(angleY) * Math.cos(angleX),
      Math.cos(angleY),
      Math.sin(angleX)
    ).normalize();

    for (let i = 0; i < this.numSegments; i++) {
      // Gentle natural curvature outwards and forward
      const bendFactor = i / this.numSegments;
      const dir = currentDir.clone();
      dir.x += Math.sin(bendFactor * Math.PI * 0.5) * 0.15 * (angleY > 0 ? 1 : -1);
      dir.z += Math.cos(bendFactor * Math.PI * 0.5) * 0.1;
      dir.y += 0.05 * (1 - bendFactor);
      dir.normalize();

      this.restOffsets.push(dir.multiplyScalar(this.segmentLength));
    }
  }

  initNodes(rootWorldPos) {
    this.nodes = [];
    let currentPos = rootWorldPos.clone();
    
    for (let i = 0; i < this.numSegments; i++) {
      const pos = currentPos.clone();
      this.nodes.push({
        position: pos.clone(),
        prevPosition: pos.clone(),
        velocity: new THREE.Vector3(),
      });
      if (i < this.restOffsets.length) {
        currentPos.add(this.restOffsets[i]);
      }
    }

    // Populate CatmullRom curve initial points
    this.curve.points = this.nodes.map(n => n.position.clone());
  }

  /**
   * Apply an instantaneous physical force impulse (e.g. head shake / click trigger)
   */
  applyImpulse(forceVector) {
    for (let i = 1; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const factor = (i / this.nodes.length);
      node.prevPosition.sub(forceVector.clone().multiplyScalar(factor * 0.08));
    }
  }

  /**
   * Update physics step
   * @param {number} delta time step in seconds
   * @param {THREE.Vector3} rootWorldPos world position of the antenna base
   * @param {THREE.Quaternion} headWorldQuaternion world rotation of the ant head
   */
  update(delta, rootWorldPos, headWorldQuaternion) {
    if (this.nodes.length === 0) {
      this.initNodes(rootWorldPos);
      return;
    }

    // Fixed time step for stable physics
    const dt = Math.min(delta, 0.033);
    const subSteps = 3;
    const subDt = dt / subSteps;

    // Root node (index 0) is hard-pinned to head attachment point
    this.nodes[0].position.copy(rootWorldPos);
    this.nodes[0].prevPosition.copy(rootWorldPos);

    // Compute ideal rest world positions for all nodes based on head orientation
    const restWorldPositions = [];
    let currRestPos = rootWorldPos.clone();
    restWorldPositions.push(currRestPos.clone());

    for (let i = 0; i < this.numSegments - 1; i++) {
      const localOffset = this.restOffsets[i].clone();
      localOffset.applyQuaternion(headWorldQuaternion);
      currRestPos.add(localOffset);
      restWorldPositions.push(currRestPos.clone());
    }

    // Verlet integration sub-stepping
    for (let step = 0; step < subSteps; step++) {
      for (let i = 1; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        
        // Velocity from Verlet previous position
        const vel = node.position.clone().sub(node.prevPosition).multiplyScalar(this.damping);
        node.prevPosition.copy(node.position);

        // Spring restoration force pulling towards rest world position
        const restTarget = restWorldPositions[i];
        const springForce = restTarget.clone().sub(node.position).multiplyScalar(this.stiffness);

        // Subtle gravity & wind turbulence
        const gravityForce = new THREE.Vector3(0, this.gravity * 0.1, 0);

        // Integrate
        node.position.add(vel);
        node.position.add(springForce.multiplyScalar(subDt * subDt * 60.0));
        node.position.add(gravityForce.multiplyScalar(subDt * subDt * 60.0));
      }

      // Distance constraint solver between adjacent nodes
      for (let i = 1; i < this.nodes.length; i++) {
        const p1 = this.nodes[i - 1].position;
        const p2 = this.nodes[i].position;
        const dist = p1.distanceTo(p2);
        const targetDist = this.segmentLength;

        if (dist > 0.0001) {
          const diff = (dist - targetDist) / dist;
          const correction = p2.clone().sub(p1).multiplyScalar(diff * 0.6);
          p2.sub(correction);
        }
      }
    }

    // Update CatmullRom curve control points for smooth tube geometry mesh update
    for (let i = 0; i < this.nodes.length; i++) {
      this.curve.points[i].copy(this.nodes[i].position);
    }
  }

  getCurvePoints(samples = 16) {
    return this.curve.getPoints(samples);
  }
}
