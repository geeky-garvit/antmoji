import * as THREE from 'three';
import { AntCharacter } from './AntCharacter.js';
import { createStudioEnvironment } from './environment.js';

/** Camera framings: target height, vertical extent to fit, slight downward look. */
export const FRAMINGS = {
  full: { y: 2.45, h: 5.5, tilt: 0.05 },
  bust: { y: 3.35, h: 3.4, tilt: 0.04 },
  head: { y: 3.62, h: 2.8, tilt: 0.03 },
  face: { y: 3.45, h: 2.2, tilt: 0.02 },
};

const FOV = 28;
const envCache = new WeakMap();

/** Build lights + shadow catcher into a scene (shared by live stage + snapshots). */
export function setupStudio(scene, renderer) {
  let env = envCache.get(renderer);
  if (!env) { env = createStudioEnvironment(renderer); envCache.set(renderer, env); }
  scene.environment = env;
  scene.environmentIntensity = 1.0;

  const key = new THREE.DirectionalLight(0xfff4ea, 1.6);
  key.position.set(0.5, 9, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2.2; key.shadow.camera.right = 2.2;
  key.shadow.camera.top = 2.2; key.shadow.camera.bottom = -2.2;
  key.shadow.camera.near = 1; key.shadow.camera.far = 20;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.target.position.set(0, 1.5, 0);
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xcfe0ff, 1.4);
  rim.position.set(4, 4, -5);
  scene.add(rim);

  // Shadow catcher + soft contact occlusion (works on transparent backgrounds)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(20,22,35,0.55)');
  grd.addColorStop(0.5, 'rgba(20,22,35,0.18)');
  grd.addColorStop(1, 'rgba(20,22,35,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128);
  const aoTex = new THREE.CanvasTexture(c);
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }));
  ao.rotation.x = -Math.PI / 2;
  ao.position.y = 0.002;
  scene.add(ao);
  return { key, rim, ground, ao };
}

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);
}

/** Position a camera so `framing` fits a viewport of the given aspect. */
export function frameCamera(camera, framing, aspect, yaw = 0) {
  const f = typeof framing === 'object' ? framing : FRAMINGS[framing] || FRAMINGS.full;
  const vfov = THREE.MathUtils.degToRad(FOV);
  let dist = f.h / 2 / Math.tan(vfov / 2);
  if (aspect < 0.75) dist *= 0.75 / aspect; // keep width on very tall viewports
  camera.fov = FOV;
  camera.aspect = aspect;
  camera.position.set(Math.sin(yaw) * dist, f.y + dist * Math.sin(f.tilt), Math.cos(yaw) * dist);
  camera.lookAt(0, f.y, 0);
  camera.updateProjectionMatrix();
  return { y: f.y, dist };
}

/**
 * Live, interactive render of one Antmoji inside a container element.
 * Drag to spin (with inertia), eyes follow the pointer, tap to react.
 */
export class AntmojiStage {
  constructor(container, { config, framing = 'full', interactive = true, follow = 'pointer', idleGesture = true } = {}) {
    this.container = container;
    this.framing = framing;
    this.interactive = interactive;
    this.follow = follow;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    configureRenderer(this.renderer);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const cv = this.renderer.domElement;
    cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;outline:none';
    container.appendChild(cv);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    this.studio = setupStudio(this.scene, this.renderer);

    this.ant = new AntCharacter(config);
    this.scene.add(this.ant.object);

    this._yaw = 0; this._yawVel = 0; this._dragging = false;
    this._camFrame = { ...FRAMINGS[framing] };
    this._camTarget = FRAMINGS[framing];
    this.clock = new THREE.Clock();
    this._visible = true;
    this._idleGestureT = idleGesture ? 6 + Math.random() * 6 : Infinity;

    this._resize = this._resize.bind(this);
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(container);
    this._io = new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; });
    this._io.observe(container);
    this._resize();
    if (interactive) this._bindPointer();
    if (follow === 'pointer') {
      this._onWinMove = (e) => this._lookFromEvent(e);
      window.addEventListener('pointermove', this._onWinMove, { passive: true });
    }
    this._loop = this._loop.bind(this);
    this.renderer.setAnimationLoop(this._loop);
  }

  setConfig(config) { this.ant.setConfig(config); }

  setFraming(name) {
    if (!FRAMINGS[name]) return;
    this.framing = name;
    this._camTarget = FRAMINGS[name];
  }

  play(g) { this.ant.play(g); }

  _bindPointer() {
    const cv = this.renderer.domElement;
    let lastX = 0, downX = 0, downT = 0;
    cv.addEventListener('pointerdown', (e) => {
      this._dragging = true; lastX = downX = e.clientX; downT = performance.now();
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      const w = cv.clientWidth || 300;
      this._yaw += (dx / w) * 6;
      this._yawVel = (dx / w) * 6 * 0.7; // carried as per-frame momentum on release
    });
    const up = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      if (Math.abs(e.clientX - downX) < 6 && performance.now() - downT < 300) {
        this.ant.play(Math.random() < 0.5 ? 'wave' : 'jump');
        this.container.dispatchEvent(new CustomEvent('antmoji-tap', { bubbles: true, composed: true }));
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  _lookFromEvent(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    if (!r.width) return;
    // relative to the character's face, softened for far-away pointers
    const fx = r.left + r.width / 2, fy = r.top + r.height * 0.3;
    const nx = (e.clientX - fx) / Math.max(r.width, 260);
    const ny = (e.clientY - fy) / Math.max(r.height, 260);
    this.ant.lookAt(Math.tanh(nx * 1.4), Math.tanh(ny * 1.4));
    clearTimeout(this._lookTO);
    this._lookTO = setTimeout(() => this.ant.lookAt(null), 2500);
  }

  _resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this._aspect = w / h;
  }

  _loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this._visible || document.hidden) return;

    // inertial spin, gently returning to face the viewer
    if (!this._dragging) {
      this._yaw += this._yawVel;
      this._yawVel *= Math.pow(0.04, dt);
      if (Math.abs(this._yawVel) < 0.002) {
        const target = Math.round(this._yaw / (Math.PI * 2)) * Math.PI * 2;
        this._yaw = THREE.MathUtils.lerp(this._yaw, target, 1 - Math.exp(-2.2 * dt));
      }
    }
    this.ant.object.rotation.y = this._yaw;

    // occasional unprompted wave keeps profile pages alive
    this._idleGestureT -= dt;
    if (this._idleGestureT <= 0) { this.ant.play(Math.random() < 0.6 ? 'wave' : 'nod'); this._idleGestureT = 10 + Math.random() * 10; }

    // smooth framing transitions
    const k = 1 - Math.exp(-5 * dt);
    for (const p of ['y', 'h', 'tilt']) this._camFrame[p] += (this._camTarget[p] - this._camFrame[p]) * k;
    frameCamera(this.camera, this._camFrame, this._aspect);

    this.ant.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** PNG data URL of the current view (for "save as profile picture"). */
  toDataURL(size = 512) {
    const prev = new THREE.Vector2(); this.renderer.getSize(prev);
    const pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(size, size, false);
    frameCamera(this.camera, this.framing, 1);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(prev.x, prev.y, false);
    return url;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this._ro.disconnect(); this._io.disconnect();
    if (this._onWinMove) window.removeEventListener('pointermove', this._onWinMove);
    this.ant.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
