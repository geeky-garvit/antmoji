import * as THREE from 'three';

export const LIGHT_PRESETS = {
  studio_clean: {
    name: 'Clean Studio',
    keyColor: '#ffffff',
    keyIntensity: 2.2,
    fillColor: '#bfdbfe',
    fillIntensity: 1.0,
    rimColor: '#60a5fa',
    rimIntensity: 3.0,
    ambientColor: '#1e293b',
    ambientIntensity: 0.65,
    bgGradient: ['#0f172a', '#1e1b4b'],
  },
  warm_sunset: {
    name: 'Warm Sunset',
    keyColor: '#ffedd5',
    keyIntensity: 2.6,
    fillColor: '#fca5a5',
    fillIntensity: 1.2,
    rimColor: '#f43f5e',
    rimIntensity: 3.5,
    ambientColor: '#451a03',
    ambientIntensity: 0.75,
    bgGradient: ['#1c1917', '#450a0a'],
  },
  neon_cyber: {
    name: 'Neon Cyber',
    keyColor: '#a7f3d0',
    keyIntensity: 2.4,
    fillColor: '#c084fc',
    fillIntensity: 1.4,
    rimColor: '#38bdf8',
    rimIntensity: 4.0,
    ambientColor: '#090514',
    ambientIntensity: 0.7,
    bgGradient: ['#030712', '#1e1035'],
  },
  moody_dark: {
    name: 'Moody Obsidian',
    keyColor: '#f8fafc',
    keyIntensity: 1.8,
    fillColor: '#475569',
    fillIntensity: 0.8,
    rimColor: '#e2e8f0',
    rimIntensity: 3.2,
    ambientColor: '#020617',
    ambientIntensity: 0.5,
    bgGradient: ['#020617', '#0f172a'],
  }
};

export class LightingRig {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.currentPresetKey = 'studio_clean';

    this.initLights();
    this.initEnvironment();
    this.applyPreset('studio_clean');
  }

  initLights() {
    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);

    // 1. Key Light with soft shadows (2048x2048 shadow map)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.keyLight.position.set(4, 6, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 15;
    this.keyLight.shadow.camera.left = -5;
    this.keyLight.shadow.camera.right = 5;
    this.keyLight.shadow.camera.top = 5;
    this.keyLight.shadow.camera.bottom = -5;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.radius = 4; // Soft PCF shadow
    this.lightGroup.add(this.keyLight);

    // 2. Warm Fill Light to lift shadow details
    this.fillLight = new THREE.DirectionalLight(0xbfdbfe, 1.0);
    this.fillLight.position.set(-5, 2, 3);
    this.lightGroup.add(this.fillLight);

    // 3. Cool Back / Rim Light to separate ant silhouettes
    this.rimLight = new THREE.DirectionalLight(0x60a5fa, 3.0);
    this.rimLight.position.set(0, 5, -6);
    this.lightGroup.add(this.rimLight);

    // 4. Ambient Base Light
    this.ambientLight = new THREE.AmbientLight(0x1e293b, 0.65);
    this.lightGroup.add(this.ambientLight);

    // Subtle Hemisphere Light for soft ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f172a, 0.4);
    this.lightGroup.add(this.hemiLight);
  }

  initEnvironment() {
    // Generate soft studio environment map reflections programmatically using PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    // Create soft studio gradient canvas environment texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#93c5fd');
    grad.addColorStop(0.7, '#1e293b');
    grad.addColorStop(1, '#0f172a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Soft studio softbox highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(150, 60, 80, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(380, 80, 60, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    const envTexture = new THREE.CanvasTexture(canvas);
    const renderTarget = pmremGenerator.fromEquirectangular(envTexture);
    
    this.scene.environment = renderTarget.texture;
    envTexture.dispose();
    pmremGenerator.dispose();
  }

  applyPreset(presetKey) {
    if (!LIGHT_PRESETS[presetKey]) return;
    this.currentPresetKey = presetKey;
    const p = LIGHT_PRESETS[presetKey];

    this.keyLight.color.set(p.keyColor);
    this.keyLight.intensity = p.keyIntensity;

    this.fillLight.color.set(p.fillColor);
    this.fillLight.intensity = p.fillIntensity;

    this.rimLight.color.set(p.rimColor);
    this.rimLight.intensity = p.rimIntensity;

    this.ambientLight.color.set(p.ambientColor);
    this.ambientLight.intensity = p.ambientIntensity;
  }
}
