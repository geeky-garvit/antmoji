import * as THREE from 'three';

const FINISH_PARAMS = {
  gloss: { roughness: 0.4, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.16, sheen: 0.35, iridescence: 0.12 },
  satin: { roughness: 0.58, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.6, iridescence: 0 },
  pearl: { roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.14, sheen: 0.5, iridescence: 1 },
  chrome: { roughness: 0.16, metalness: 1, clearcoat: 0.6, clearcoatRoughness: 0.05, sheen: 0, iridescence: 0.25 },
};

/** Cuticle (skin) materials: one with vertex colours for sculpted parts, one without. */
export function createSkinMaterials() {
  const base = {
    color: new THREE.Color('#161b28'),
    sheenColor: new THREE.Color('#9fb3e6'),
    sheenRoughness: 0.35,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [180, 520],
  };
  const plain = new THREE.MeshPhysicalMaterial(base);
  const vc = new THREE.MeshPhysicalMaterial({ ...base, vertexColors: true });
  return { plain, vc, all: [plain, vc] };
}

export function applySkin(mats, hex, finish) {
  const p = FINISH_PARAMS[finish] || FINISH_PARAMS.gloss;
  const col = new THREE.Color(hex);
  const hsl = {};
  col.getHSL(hsl);
  // Sheen tinted by the skin so rim light reads as "lit cuticle", not grey fuzz
  const sheen = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.6 + 0.2), Math.min(0.85, hsl.l + 0.45));
  for (const m of mats.all) {
    m.color.copy(col);
    m.roughness = p.roughness;
    m.metalness = p.metalness;
    m.clearcoat = p.clearcoat;
    m.clearcoatRoughness = p.clearcoatRoughness;
    m.sheen = p.sheen;
    m.sheenColor.copy(sheen);
    m.iridescence = p.iridescence;
    m.needsUpdate = true;
  }
}

/** Mouth interior / tongue / teeth. */
export function createMouthMaterials() {
  return {
    inside: new THREE.MeshPhysicalMaterial({ color: '#3b0b16', roughness: 0.55, clearcoat: 0.4 }),
    tongue: new THREE.MeshPhysicalMaterial({ color: '#f06a8a', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    teeth: new THREE.MeshPhysicalMaterial({ color: '#fbfbf7', roughness: 0.25, clearcoat: 1 }),
  };
}

/**
 * Eyeball texture painted in polar coordinates: row = angle from the front
 * pole, so the iris sits on the curved sclera (correct parallax when the
 * eye rotates, unlike a flat iris disc).
 */
export function makeEyeTexture(irisHex, size = 512) {
  const W = size, H = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const base = new THREE.Color(irisHex);
  const hsl = {}; base.getHSL(hsl);
  const light = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.9), Math.min(0.88, hsl.l + 0.36));
  base.offsetHSL(0, -0.05, 0.08);
  const dark = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0.05, hsl.l - 0.25));
  const limbal = new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, Math.max(0.03, hsl.l * 0.35));

  // deterministic fibre noise
  const fib = new Float32Array(W);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < W; i++) fib[i] = rnd();
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < W; i++) fib[i] = (fib[(i + W - 1) % W] + fib[i] * 2 + fib[(i + 1) % W]) / 4;
  }

  const PUPIL = 16, IRIS = 37, BLEND = 3.5;
  const c = new THREE.Color();
  const tmp = new THREE.Color();
  for (let y = 0; y < H; y++) {
    const deg = ((y + 0.5) / H) * 180;
    for (let x = 0; x < W; x++) {
      const f = fib[x];
      if (deg < PUPIL) {
        c.setRGB(0.012, 0.014, 0.022);
      } else if (deg < IRIS + BLEND) {
        const t = (deg - PUPIL) / (IRIS - PUPIL); // 0 at pupil, 1 at limbus
        // inner glow → base → dark ring at the limbus
        if (t < 0.35) c.copy(light).lerp(base, t / 0.35);
        else c.copy(base).lerp(dark, (t - 0.35) / 0.55);
        // radial fibres
        const fibre = 0.82 + 0.36 * f;
        c.multiplyScalar(fibre);
        if (t > 0.82) c.lerp(limbal, Math.min(1, (t - 0.82) / 0.18));
        // pupil edge softening
        if (deg < PUPIL + 1.5) c.lerp(tmp.setRGB(0.02, 0.02, 0.03), 1 - (deg - PUPIL) / 1.5);
        if (deg > IRIS) {
          const s = (deg - IRIS) / BLEND;
          c.lerp(tmp.setRGB(0.96, 0.97, 0.99), s);
        }
      } else {
        // sclera — very slight cool falloff towards the back
        const s = Math.min(1, (deg - IRIS) / 100);
        c.setRGB(0.965 - s * 0.12, 0.972 - s * 0.11, 0.99 - s * 0.08);
      }
      const o = (y * W + x) * 4;
      img.data[o] = Math.min(255, c.r * 255);
      img.data[o + 1] = Math.min(255, c.g * 255);
      img.data[o + 2] = Math.min(255, c.b * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createEyeMaterials(irisHex) {
  const sclera = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: makeEyeTexture(irisHex),
    roughness: 0.32,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  });
  // Additive "cornea": contributes reflections only, never darkens the iris.
  const cornea = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.14,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const catchlight = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false });
  return { sclera, cornea, catchlight };
}

export function setEyeColor(eyeMats, hex) {
  eyeMats.sclera.map?.dispose();
  eyeMats.sclera.map = makeEyeTexture(hex);
  eyeMats.sclera.needsUpdate = true;
}
