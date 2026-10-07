/**
 * Automated Sticker & Status Generator Engine
 * Programmatically loops through poses, renders high-res transparent PNGs, and builds a Sticker Pack.
 */
export class StickerEngine {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.generatedStickers = [];
  }

  /**
   * Run automated headless batch rendering for sticker pack
   */
  async generateStickerPack() {
    const poses = [
      { key: 'celebration', title: 'Party Celebration', icon: '🎉' },
      { key: 'working', title: 'Busy Working', icon: '💻' },
      { key: 'sleepy', title: 'Sleepy Status', icon: '😴' },
      { key: 'laughing', title: 'Laughing Out Loud', icon: '😂' },
      { key: 'cool', title: 'Cool Hero', icon: '🕶️' },
      { key: 'neutral', title: 'Classic Portrait', icon: '😊' },
    ];

    const resolution = 1024;
    const renderer = this.sm.renderer;
    const scene = this.sm.scene;
    const camera = this.sm.camera;

    // Save current scene state
    const originalBg = scene.background;
    const originalGroundVis = this.sm.groundMesh.visible;
    const originalPose = this.sm.heroAnt.currentPose;

    // Configure transparent backdrop
    scene.background = null;
    this.sm.groundMesh.visible = false;

    // Set snapshot resolution
    renderer.setSize(resolution, resolution, false);
    camera.aspect = 1.0;
    camera.updateProjectionMatrix();

    this.generatedStickers = [];

    for (const p of poses) {
      // Apply pose
      this.sm.heroAnt.setPose(p.key);
      this.sm.heroAnt.update(1.0, 0.033);

      // Render frame
      renderer.render(scene, camera);

      // Capture transparent PNG data
      const dataURL = this.sm.canvas.toDataURL('image/png');

      this.generatedStickers.push({
        key: p.key,
        title: p.title,
        icon: p.icon,
        dataURL: dataURL,
      });

      // Brief delay for stability
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Restore scene state
    scene.background = originalBg;
    this.sm.groundMesh.visible = originalGroundVis;
    this.sm.heroAnt.setPose(originalPose);
    this.sm.onWindowResize();

    return this.generatedStickers;
  }

  /**
   * Download an individual sticker PNG
   */
  downloadSticker(stickerKey) {
    const item = this.generatedStickers.find(s => s.key === stickerKey);
    if (!item) return;

    const link = document.createElement('a');
    link.download = `Antmoji_Sticker_${item.key}.png`;
    link.href = item.dataURL;
    link.click();
  }

  /**
   * Download all generated stickers sequentially
   */
  downloadFullPack() {
    this.generatedStickers.forEach((item, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `Antmoji_Sticker_${item.key}.png`;
        link.href = item.dataURL;
        link.click();
      }, idx * 300);
    });
  }
}
