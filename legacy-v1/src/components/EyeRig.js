import * as THREE from 'three';

/**
 * Expressive Apple Memoji Eye Rig
 * Handles cornea gloss, iris depth, specular reflections, and morphing eyelids (blink, wink, smile squint).
 */
export class EyeRig {
  constructor(options = {}) {
    this.isLeft = options.isLeft || false;
    this.eyeGroup = new THREE.Group();

    // Expression target values [0..1]
    this.blinkFactor = 0;
    this.winkFactor = 0;
    this.smileSquintFactor = 0;
    this.surpriseFactor = 0;
    this.sleepyFactor = 0;

    // Look-at rotation targets
    this.currentLookAt = new THREE.Vector2(0, 0);
    this.targetLookAt = new THREE.Vector2(0, 0);

    this.irisColorHex = options.irisColor || '#0072ff';

    this.initMesh();
  }

  initMesh() {
    const eyeRadius = 0.38;

    // 1. Sclera (Eye White)
    const scleraGeo = new THREE.SphereGeometry(eyeRadius, 32, 32);
    const scleraMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transmission: 0.05,
      thickness: 0.2,
    });
    this.sclera = new THREE.Mesh(scleraGeo, scleraMat);
    this.eyeGroup.add(this.sclera);

    // 2. Iris & Pupil Group (recessed slightly inside sphere)
    this.irisGroup = new THREE.Group();
    this.irisGroup.position.z = eyeRadius * 0.75;

    // Iris Disc
    const irisGeo = new THREE.CircleGeometry(0.23, 32);
    
    // Create rich gradient iris texture programmatically
    this.irisTexture = this.createIrisTexture(this.irisColorHex);
    this.irisMat = new THREE.MeshStandardMaterial({
      map: this.irisTexture,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.iris = new THREE.Mesh(irisGeo, this.irisMat);
    this.irisGroup.add(this.iris);

    // Pupil
    const pupilGeo = new THREE.CircleGeometry(0.095, 32);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x05070e });
    this.pupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.pupil.position.z = 0.005;
    this.irisGroup.add(this.pupil);

    // Specular Highlight Reflection Disc (bright Apple toy sparkle)
    const specGeo = new THREE.CircleGeometry(0.055, 16);
    const specMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    this.specularHighlight = new THREE.Mesh(specGeo, specMat);
    this.specularHighlight.position.set(0.07, 0.07, 0.01);
    this.irisGroup.add(this.specularHighlight);

    this.eyeGroup.add(this.irisGroup);

    // 3. Cornea Outer Shell (Glossy transparent cap)
    const corneaGeo = new THREE.SphereGeometry(eyeRadius * 1.02, 32, 32);
    const corneaMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.0,
      transmission: 0.92,
      ior: 1.34,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
    });
    this.cornea = new THREE.Mesh(corneaGeo, corneaMat);
    this.eyeGroup.add(this.cornea);

    // 4. Stylized Upper & Lower Eyelids for Expressions
    const lidMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b3a5b,
      roughness: 0.35,
      clearcoat: 0.5,
      side: THREE.DoubleSide,
    });

    // Upper Eyelid Hemisphere
    const upperLidGeo = new THREE.SphereGeometry(eyeRadius * 1.04, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.upperLid = new THREE.Mesh(upperLidGeo, lidMat);
    this.upperLid.rotation.x = -Math.PI * 0.5; // Open
    this.eyeGroup.add(this.upperLid);

    // Lower Eyelid Hemisphere
    const lowerLidGeo = new THREE.SphereGeometry(eyeRadius * 1.04, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    this.lowerLid = new THREE.Mesh(lowerLidGeo, lidMat);
    this.lowerLid.rotation.x = Math.PI * 0.5; // Open
    this.eyeGroup.add(this.lowerLid);

    this.lidMaterial = lidMat;
  }

  createIrisTexture(mainColorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const cx = 128;
    const cy = 128;
    const r = 120;

    const baseColor = new THREE.Color(mainColorHex);
    const lighterColor = baseColor.clone().offsetHSL(0, 0, 0.2).getStyle();
    const darkerColor = baseColor.clone().offsetHSL(0, 0, -0.25).getStyle();

    // Outer ring gradient
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    grad.addColorStop(0, lighterColor);
    grad.addColorStop(0.5, baseColor.getStyle());
    grad.addColorStop(0.85, darkerColor);
    grad.addColorStop(1, '#050a18');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Radial iris detail striations
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 18, cy + Math.sin(angle) * 18);
      ctx.lineTo(cx + Math.cos(angle) * 112, cy + Math.sin(angle) * 112);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  setIrisColor(colorHex) {
    this.irisColorHex = colorHex;
    this.irisTexture.dispose();
    this.irisTexture = this.createIrisTexture(colorHex);
    this.irisMat.map = this.irisTexture;
    this.irisMat.needsUpdate = true;
  }

  setCuticleColor(colorHex) {
    this.lidMaterial.color.set(colorHex);
  }

  setLookAt(x, y) {
    this.targetLookAt.set(
      Math.max(-0.4, Math.min(0.4, x)),
      Math.max(-0.3, Math.min(0.3, y))
    );
  }

  update(delta) {
    // Smooth gaze interpolation
    this.currentLookAt.lerp(this.targetLookAt, delta * 8.0);
    this.irisGroup.position.x = this.currentLookAt.x * 0.18;
    this.irisGroup.position.y = this.currentLookAt.y * 0.18;

    // Eyelid rotation logic
    let upperRotation = -Math.PI * 0.5;
    let lowerRotation = Math.PI * 0.5;

    const activeBlink = Math.max(this.blinkFactor, this.winkFactor);
    const totalClosure = Math.max(activeBlink, this.sleepyFactor * 0.55);

    upperRotation += totalClosure * (Math.PI * 0.48);
    lowerRotation -= (totalClosure + this.smileSquintFactor * 0.3) * (Math.PI * 0.25);

    if (this.surpriseFactor > 0) {
      upperRotation -= this.surpriseFactor * 0.15;
      lowerRotation += this.surpriseFactor * 0.15;
    }

    this.upperLid.rotation.x = THREE.MathUtils.lerp(this.upperLid.rotation.x, upperRotation, delta * 14.0);
    this.lowerLid.rotation.x = THREE.MathUtils.lerp(this.lowerLid.rotation.x, lowerRotation, delta * 14.0);
  }
}
