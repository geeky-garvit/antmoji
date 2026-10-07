import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LightingRig } from './LightingRig.js';
import { PostProcessingManager } from './PostProcessing.js';
import { AntMemoji } from '../components/AntMemoji.js';
import gsap from 'gsap';

export class SceneManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.clock  = new THREE.Clock();

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initControls();

    this.lightingRig    = new LightingRig(this.scene, this.renderer);
    this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera);

    // Hero ant — full body, Pixar-style
    this.heroAnt = new AntMemoji({ presetKey: 'obsidian' });
    this.scene.add(this.heroAnt.group);

    this._initContactShadow();
    this._initResizeListener();
  }

  /* ── Renderer ──────────────────────────────────────────── */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /* ── Scene (pure white) ────────────────────────────────── */
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#ffffff');
  }

  /* ── Camera — framed for full-body portrait ────────────── */
  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.8, 6.5);
  }

  /* ── Controls — smooth damping, user can orbit ─────────── */
  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.06;
    this.controls.maxPolarAngle  = Math.PI / 2 + 0.12;
    this.controls.minDistance    = 3.0;
    this.controls.maxDistance    = 10.0;
    this.controls.target.set(0, 0.6, 0);
  }

  /* ── Soft contact shadow blob beneath the ant ──────────── */
  _initContactShadow() {
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 256;
    const ctx = cvs.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0,   'rgba(30,30,50,0.40)');
    g.addColorStop(0.45,'rgba(30,30,50,0.18)');
    g.addColorStop(0.80,'rgba(30,30,50,0.04)');
    g.addColorStop(1,   'rgba(30,30,50,0.00)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(cvs);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    this.shadowBlob = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), mat);
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.set(0, -1.22, 0);
    this.scene.add(this.shadowBlob);
  }

  /* ── Camera mode per view ─────────────────────────────── */
  setCameraMode(mode) {
    const T = {
      // Full body, slightly low angle — shows off the whole character
      profile:    { px:0,    py:0.80, pz:6.5, tx:0,   ty:0.60, tz:0 },
      // Closer headshot — customizer needs to see face details
      customizer: { px:0,    py:1.30, pz:4.5, tx:0,   ty:1.10, tz:0 },
      // Full body at slight angle for pose display
      mood:       { px:0.2,  py:0.60, pz:7.2, tx:0,   ty:0.50, tz:0 },
    };
    const t = T[mode] || T.profile;
    gsap.to(this.camera.position, { x:t.px, y:t.py, z:t.pz, duration:0.75, ease:'power2.out' });
    gsap.to(this.controls.target, { x:t.tx, y:t.ty, z:t.tz, duration:0.75, ease:'power2.out' });
  }

  /* ── Resize ────────────────────────────────────────────── */
  _initResizeListener() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.postProcessing.setSize(w, h);
    });
  }

  /* ── Export PNG ────────────────────────────────────────── */
  exportPNG({ resolution = 1024, transparent = false } = {}) {
    const w = resolution, h = resolution;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.postProcessing.setSize(w, h);

    const origBg = this.scene.background;
    if (transparent) { this.scene.background = null; this.shadowBlob.visible = false; }

    transparent ? this.renderer.render(this.scene, this.camera) : this.postProcessing.render();
    const url = this.canvas.toDataURL('image/png');

    if (transparent) { this.scene.background = origBg; this.shadowBlob.visible = true; }

    const a = document.createElement('a');
    a.href = url; a.download = `Antmoji_${Date.now()}.png`; a.click();
    this._initResizeListener.call({ renderer: this.renderer, camera: this.camera, postProcessing: this.postProcessing });
    // Force re-fit
    const ev = new Event('resize');
    window.dispatchEvent(ev);
  }

  /* ── Render loop ───────────────────────────────────────── */
  startLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta   = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.controls.update();
      this.heroAnt.update(elapsed, delta);
      this.postProcessing.render();
    };
    animate();
  }
}
