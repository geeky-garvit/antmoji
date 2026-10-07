import * as THREE from 'three';
import { AntCharacter } from './AntCharacter.js';
import { configureRenderer, setupStudio, frameCamera } from './Stage.js';
import { parseConfig } from './catalog.js';

/**
 * One shared off-screen WebGL context renders any number of avatars to
 * images. Browsers cap live WebGL contexts (~16), so lists, chats and
 * comment threads should use these PNGs and keep live 3D for the hero spot.
 */
let shared = null;
function getShared() {
  if (shared) return shared;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  configureRenderer(renderer);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  setupStudio(scene, renderer);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const ant = new AntCharacter();
  scene.add(ant.object);
  shared = { renderer, scene, camera, ant, queue: Promise.resolve() };
  return shared;
}

const urlCache = new Map();

/**
 * @param {object|string} config  config object, JSON or compact code
 * @param {{size?:number, framing?:'head'|'bust'|'full', background?:string|null, yaw?:number, pose?:Function}} opts
 * @returns {Promise<string>} PNG data URL
 */
export function renderAntmojiImage(config, { size = 256, framing = 'bust', background = null, yaw = 0, eyes = null } = {}) {
  const cfg = parseConfig(config);
  const key = JSON.stringify([cfg, size, framing, background, yaw, eyes]);
  if (urlCache.has(key)) return Promise.resolve(urlCache.get(key));
  const s = getShared();
  // Serialise renders; yield between them so the UI stays responsive.
  const job = s.queue.then(() => s.ant.setConfig(cfg)).then(() => new Promise((resolve) => {
    const run = () => {
      const { renderer, scene, camera, ant } = s;
      ant._pop = 0;
      ant.lookAt(0, 0);
      ant._look.yaw = 0; ant._look.pitch = 0;
      for (const a of ant.antennae) { a.off.set(0, 0, 0); a.vel.set(0, 0, 0); }
      ant._blink = 0; ant._blinkPhase = -1; ant._blinkT = 99;
      ant._gesture = null;
      ant.update(1 / 60);
      ant.update(1 / 60);
      ant.object.rotation.y = yaw;
      renderer.setSize(size, size, false);
      scene.background = background ? new THREE.Color(background) : null;
      frameCamera(camera, framing, 1);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/png');
      urlCache.set(key, url);
      if (urlCache.size > 300) urlCache.delete(urlCache.keys().next().value);
      resolve(url);
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 0)))(run, { timeout: 120 });
  }));
  s.queue = job;
  return job;
}

/** Same as renderAntmojiImage but resolves to a Blob, ready to upload as a profile picture. */
export async function renderAntmojiBlob(config, opts) {
  const url = await renderAntmojiImage(config, opts);
  return (await fetch(url)).blob();
}
