import * as THREE from 'three';

/**
 * Procedural Particle System for Antmoji Cartoon Poses (Zzz sleep bubbles, Confetti burst)
 */
export class ParticlesManager {
  constructor() {
    this.group = new THREE.Group();
    this.activeType = 'none';
    this.particles = [];
  }

  setParticleType(type) {
    if (this.activeType === type) return;
    this.activeType = type;

    // Clear existing
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      this.group.remove(child);
    }
    this.particles = [];

    if (type === 'zzz') {
      this.initZzzParticles();
    } else if (type === 'confetti') {
      this.initConfettiParticles();
    }
  }

  initZzzParticles() {
    // 3 Floating "Zzz" text/disc sprites rising from head
    const count = 4;
    const mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85 });

    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.12 * (1 + i * 0.25), 0.12 * (1 + i * 0.25), 0.02);
      const mesh = new THREE.Mesh(geo, mat.clone());
      
      mesh.position.set(
        0.35 + i * 0.15,
        0.75 + i * 0.25,
        0.3 + i * 0.05
      );

      this.group.add(mesh);
      this.particles.push({
        mesh: mesh,
        baseY: 0.75 + i * 0.25,
        speed: 0.8 + i * 0.2,
        offset: i * 0.8,
      });
    }
  }

  initConfettiParticles() {
    const colors = [0xf43f5e, 0x3b82f6, 0x10b981, 0xf59e0b, 0xa855f7];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(0.06, 0.06);
      const color = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(
        (Math.random() - 0.5) * 1.8,
        (Math.random() - 0.5) * 1.8 + 0.5,
        (Math.random() - 0.5) * 1.2 + 0.4
      );

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.group.add(mesh);
      this.particles.push({
        mesh: mesh,
        vy: (Math.random() * 0.5 + 0.2),
        rotSpeed: Math.random() * 4 - 2,
      });
    }
  }

  update(time, delta) {
    if (this.activeType === 'zzz') {
      this.particles.forEach(p => {
        const floatY = Math.sin(time * 2.5 + p.offset) * 0.08;
        p.mesh.position.y = p.baseY + floatY;
        p.mesh.rotation.z = Math.sin(time * 2 + p.offset) * 0.15;
      });
    } else if (this.activeType === 'confetti') {
      this.particles.forEach(p => {
        p.mesh.rotation.x += delta * p.rotSpeed;
        p.mesh.rotation.y += delta * p.rotSpeed;
      });
    }
  }
}
