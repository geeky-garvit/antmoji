import * as THREE from 'three';

/**
 * Procedural 3D Accessories System for Antmojis
 * Creates eyewear, hats, piercings, and props that mount seamlessly onto the Ant avatar.
 */
export class Accessories {
  constructor() {
    this.eyewearGroup = new THREE.Group();
    this.hatGroup = new THREE.Group();
    this.piercingGroup = new THREE.Group();
    this.propGroup = new THREE.Group();

    this.currentEyewear = 'none';
    this.currentHat = 'none';
    this.currentPiercing = 'none';
    this.currentProp = 'none';
  }

  setEyewear(type) {
    if (this.currentEyewear === type) return;
    this.currentEyewear = type;
    
    while (this.eyewearGroup.children.length > 0) {
      const child = this.eyewearGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.eyewearGroup.remove(child);
    }

    if (type === 'glasses') {
      this.buildRetroGlasses();
    } else if (type === 'sunglasses') {
      this.buildSunglasses();
    } else if (type === 'goggles') {
      this.buildCyberGoggles();
    }
  }

  buildRetroGlasses() {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 0.3, transparent: true, roughness: 0 });

    const ringGeo = new THREE.TorusGeometry(0.24, 0.025, 16, 32);
    const leftRing = new THREE.Mesh(ringGeo, frameMat);
    leftRing.position.set(-0.40, 0.12, 0.65);
    this.eyewearGroup.add(leftRing);

    const rightRing = new THREE.Mesh(ringGeo, frameMat);
    rightRing.position.set(0.40, 0.12, 0.65);
    this.eyewearGroup.add(rightRing);

    const bridgeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 16);
    const bridge = new THREE.Mesh(bridgeGeo, frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.15, 0.66);
    this.eyewearGroup.add(bridge);

    const lensGeo = new THREE.CircleGeometry(0.23, 32);
    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.40, 0.12, 0.65);
    this.eyewearGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.40, 0.12, 0.65);
    this.eyewearGroup.add(rightLens);
  }

  buildSunglasses() {
    const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x111827, roughness: 0.1, clearcoat: 1.0 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x030712, roughness: 0.05, metalness: 0.4, clearcoat: 1.0 });

    const frameGeo = new THREE.BoxGeometry(1.05, 0.42, 0.08);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 0.12, 0.66);
    this.eyewearGroup.add(frame);

    const lensGeo = new THREE.BoxGeometry(0.98, 0.36, 0.09);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0.12, 0.67);
    this.eyewearGroup.add(lens);
  }

  buildCyberGoggles() {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const visorGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 32, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.14, 0.58);
    this.eyewearGroup.add(visor);

    const rimGeo = new THREE.TorusGeometry(0.56, 0.04, 16, 32, Math.PI * 0.8);
    const rim = new THREE.Mesh(rimGeo, frameMat);
    rim.position.set(0, 0.14, 0.58);
    this.eyewearGroup.add(rim);
  }

  setHat(type) {
    if (this.currentHat === type) return;
    this.currentHat = type;

    while (this.hatGroup.children.length > 0) {
      const child = this.hatGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.hatGroup.remove(child);
    }

    if (type === 'party') {
      this.buildPartyHat();
    } else if (type === 'helmet') {
      this.buildWorkerHelmet();
    } else if (type === 'crown') {
      this.buildRoyalCrown();
    } else if (type === 'leaf') {
      this.buildLeafCap();
    } else if (type === 'beanie') {
      this.buildBeanie();
    }
  }

  buildPartyHat() {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
    const pomMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 });

    const coneGeo = new THREE.ConeGeometry(0.4, 0.85, 32);
    const cone = new THREE.Mesh(coneGeo, hatMat);
    cone.position.set(0, 1.25, 0.1);
    cone.rotation.z = -0.15;
    this.hatGroup.add(cone);

    const pomGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const pom = new THREE.Mesh(pomGeo, pomMat);
    pom.position.set(-0.08, 1.7, 0.1);
    this.hatGroup.add(pom);
  }

  buildWorkerHelmet() {
    const helmetMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.2, clearcoat: 0.8 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const domeGeo = new THREE.SphereGeometry(0.92, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dome = new THREE.Mesh(domeGeo, helmetMat);
    dome.position.set(0, 0.45, 0.05);
    this.hatGroup.add(dome);

    const brimGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.05, 32);
    const brim = new THREE.Mesh(brimGeo, helmetMat);
    brim.position.set(0, 0.45, 0.05);
    this.hatGroup.add(brim);

    const lightGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 16);
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.rotation.x = Math.PI / 2;
    light.position.set(0, 0.7, 0.95);
    this.hatGroup.add(light);
  }

  buildRoyalCrown() {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.2 });

    const cylinderGeo = new THREE.CylinderGeometry(0.65, 0.55, 0.4, 8, 1, true);
    const crown = new THREE.Mesh(cylinderGeo, goldMat);
    crown.position.set(0, 1.05, 0.1);
    this.hatGroup.add(crown);
  }

  buildLeafCap() {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 });

    const leafGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.scale.set(1.1, 0.2, 1.1);
    leaf.position.set(0, 0.9, 0.1);
    this.hatGroup.add(leaf);
  }

  buildBeanie() {
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });

    const domeGeo = new THREE.SphereGeometry(0.88, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dome = new THREE.Mesh(domeGeo, beanieMat);
    dome.position.set(0, 0.48, 0.05);
    this.hatGroup.add(dome);

    const cuffGeo = new THREE.TorusGeometry(0.88, 0.08, 16, 32);
    const cuff = new THREE.Mesh(cuffGeo, beanieMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 0.48, 0.05);
    this.hatGroup.add(cuff);
  }

  setPiercing(type) {
    if (this.currentPiercing === type) return;
    this.currentPiercing = type;

    while (this.piercingGroup.children.length > 0) {
      const child = this.piercingGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.piercingGroup.remove(child);
    }

    if (type === 'earring') {
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.1 });
      const ringGeo = new THREE.TorusGeometry(0.06, 0.015, 16, 24);
      const earring = new THREE.Mesh(ringGeo, ringMat);
      earring.position.set(-0.75, -0.2, 0.3);
      earring.rotation.y = Math.PI / 2;
      this.piercingGroup.add(earring);
    } else if (type === 'nose_stud') {
      const studMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.9, clearcoat: 1.0 });
      const studGeo = new THREE.SphereGeometry(0.03, 16, 16);
      const stud = new THREE.Mesh(studGeo, studMat);
      stud.position.set(0.12, -0.32, 0.72);
      this.piercingGroup.add(stud);
    }
  }

  setProp(type) {
    if (this.currentProp === type) return;
    this.currentProp = type;

    while (this.propGroup.children.length > 0) {
      const child = this.propGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.propGroup.remove(child);
    }

    if (type === 'coffee') {
      this.buildCoffeeCup();
    } else if (type === 'leaf') {
      this.buildGreenLeaf();
    } else if (type === 'popper') {
      this.buildConfettiPopper();
    }
  }

  buildCoffeeCup() {
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });

    const cupGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.45, 24);
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(0.6, -0.45, 0.5);
    this.propGroup.add(cup);

    const sleeveGeo = new THREE.CylinderGeometry(0.17, 0.15, 0.2, 24);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(0.6, -0.45, 0.5);
    this.propGroup.add(sleeve);
  }

  buildGreenLeaf() {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 });

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.3, 0.3, 0.4, 0.8, 0, 1.2);
    shape.bezierCurveTo(-0.4, 0.8, -0.3, 0.3, 0, 0);

    const geo = new THREE.ShapeGeometry(shape);
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.scale.setScalar(0.5);
    leaf.position.set(0.55, -0.4, 0.45);
    leaf.rotation.set(-0.2, -0.4, -0.2);
    this.propGroup.add(leaf);
  }

  buildConfettiPopper() {
    const popperMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 });

    const popperGeo = new THREE.ConeGeometry(0.18, 0.5, 24);
    const popper = new THREE.Mesh(popperGeo, popperMat);
    popper.position.set(0.55, -0.35, 0.5);
    popper.rotation.set(-0.4, -0.2, -0.5);
    this.propGroup.add(popper);
  }
}
