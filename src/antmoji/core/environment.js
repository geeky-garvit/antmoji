import * as THREE from 'three';

/**
 * Procedural photo-studio HDR environment: soft top box, warm key, two cool
 * rim strips behind the subject and a gentle front fill. Glossy black cuticle
 * is mostly *reflections*, so this is what makes the ant look premium.
 */
export function createStudioEnvironment(renderer) {
  const scene = new THREE.Scene();

  // Gradient dome
  const dome = new THREE.SphereGeometry(30, 48, 24);
  const cols = [];
  const pos = dome.attributes.position;
  const top = new THREE.Color(0.55, 0.57, 0.62), mid = new THREE.Color(0.32, 0.33, 0.36), bot = new THREE.Color(0.1, 0.1, 0.11);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 30;
    if (t > 0) c.copy(mid).lerp(top, t); else c.copy(mid).lerp(bot, -t);
    cols.push(c.r, c.g, c.b);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  scene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const box = (w, h, x, y, z, intensity, tint = 0xffffff) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 48).scale(w, h, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };

  box(14, 10, 0, 16, 2, 3.2);                 // overhead softbox
  box(9, 9, -11, 7, 9, 5.5, 0xfff3e6);        // warm key (front-left)
  box(3, 16, 12, 3, -7, 6.0, 0xdfe9ff);       // rim strip right
  box(3, 16, -12, 3, -7, 4.5, 0xdfe9ff);      // rim strip left
  box(12, 5, 4, -1, 14, 1.4);                 // front fill
  box(30, 30, 0, -14, 0, 0.35, 0xf0ece6);     // floor bounce

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.06);
  pmrem.dispose();
  scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt.texture;
}
