import { ANT_COLOR_PRESETS } from '../components/AntMemoji.js';
import { StickerEngine } from '../sticker/StickerEngine.js';
import { globalState } from '../state/AntmojiState.js';

export class ControlsOverlay {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.stickerEngine = new StickerEngine(sceneManager);
    
    this.container = document.createElement('div');
    this.container.className = 'controls-overlay';
    document.body.appendChild(this.container);

    this.showPfpPreview = true;
    this.showStickerDrawer = true;

    this.render();
    this.initPfpCropOverlay();
    this.attachEvents();

    // Auto generate initial sticker pack
    setTimeout(() => {
      this.generateStickers();
    }, 600);
  }

  render() {
    this.container.innerHTML = `
      <!-- App Header -->
      <header class="app-header glass-panel">
        <div class="brand">
          <div class="brand-badge">Antmoji Ecosystem</div>
          <h1>Antmoji Studio & Sticker Engine</h1>
        </div>
        <div class="header-actions">
          <button id="btn-toggle-pfp" class="btn btn-secondary active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0-10 10"/></svg>
            PFP Guide
          </button>
          <button id="btn-toggle-stickers" class="btn btn-secondary active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Sticker Grid
          </button>
          <button id="btn-gen-stickers" class="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Generate Pack
          </button>
        </div>
      </header>

      <!-- Circular PFP Crop Preview Frame Overlay -->
      <div id="pfp-crop-frame" class="pfp-crop-frame active">
        <div class="crop-ring"></div>
        <div class="crop-label">Messaging App Avatar Bounds</div>
      </div>

      <!-- Left Customization Studio Sidebar -->
      <aside class="left-sidebar glass-panel">
        <h3>Antmoji Customizer</h3>

        <!-- Preset Color Themes -->
        <div class="drawer-section">
          <label class="input-label">Color Themes</label>
          <div class="color-presets-grid" id="color-presets-grid">
            ${Object.keys(ANT_COLOR_PRESETS).map(key => `
              <button class="color-preset-btn" data-preset="${key}" title="${ANT_COLOR_PRESETS[key].name}">
                <span class="preset-swatch" style="background: ${ANT_COLOR_PRESETS[key].sssColor}"></span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Custom Color Pickers -->
        <div class="drawer-section">
          <label class="input-label">Custom Tints</label>
          <div class="picker-row">
            <input type="color" id="picker-cuticle" value="#1b3a5b" class="color-picker-input" />
            <span class="picker-val">Cuticle Tint</span>
          </div>
          <div class="picker-row">
            <input type="color" id="picker-iris" value="#0072ff" class="color-picker-input" />
            <span class="picker-val">Eye Iris Tint</span>
          </div>
        </div>

        <!-- Accessories: Hats -->
        <div class="drawer-section">
          <label class="input-label">Hat & Headwear</label>
          <select id="select-hat" class="glass-select">
            <option value="none">None</option>
            <option value="party">Party Cone Hat 🎉</option>
            <option value="helmet">Worker Safety Helmet 👷</option>
            <option value="crown">Royal Gold Crown 👑</option>
            <option value="leaf">Cute Leaf Cap 🍃</option>
          </select>
        </div>

        <!-- Accessories: Eyewear -->
        <div class="drawer-section">
          <label class="input-label">Glasses & Eyewear</label>
          <select id="select-eyewear" class="glass-select">
            <option value="none">None</option>
            <option value="sunglasses">Cool Sunglasses 🕶️</option>
            <option value="glasses">Retro Wire Glasses 👓</option>
            <option value="goggles">Cyber Goggles 🥽</option>
          </select>
        </div>

        <!-- Props -->
        <div class="drawer-section">
          <label class="input-label">Hand Props</label>
          <select id="select-prop" class="glass-select">
            <option value="none">None</option>
            <option value="coffee">Coffee Cup ☕</option>
            <option value="leaf">Green Leaf 🍃</option>
            <option value="popper">Confetti Popper 🎉</option>
          </select>
        </div>
      </aside>

      <!-- Bottom Antmoji Sticker Grid Drawer -->
      <section id="sticker-drawer" class="bottom-sticker-drawer glass-panel active">
        <div class="drawer-header">
          <div class="drawer-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Antmoji Chat Sticker Pack (Auto-Generated)
          </div>
          <button id="btn-download-all-stickers" class="btn btn-primary btn-sm">
            Download Full Pack (.PNG)
          </button>
        </div>
        <div class="sticker-grid" id="sticker-grid">
          <div class="sticker-loading">Generating 3D transparent stickers...</div>
        </div>
      </section>
    `;
  }

  initPfpCropOverlay() {
    this.pfpFrame = document.getElementById('pfp-crop-frame');
    this.stickerDrawer = document.getElementById('sticker-drawer');
  }

  async generateStickers() {
    const gridEl = document.getElementById('sticker-grid');
    gridEl.innerHTML = `<div class="sticker-loading">Rendering 3D transparent stickers...</div>`;

    const stickers = await this.stickerEngine.generateStickerPack();

    gridEl.innerHTML = stickers.map(s => `
      <div class="sticker-card glass-panel" data-key="${s.key}">
        <img src="${s.dataURL}" alt="${s.title}" class="sticker-img" />
        <div class="sticker-info">
          <span class="sticker-name">${s.icon} ${s.title}</span>
          <button class="btn-download-sticker" data-key="${s.key}">
            Download PNG
          </button>
        </div>
      </div>
    `).join('');

    // Attach sticker download buttons
    const dlBtns = gridEl.querySelectorAll('.btn-download-sticker');
    dlBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        this.stickerEngine.downloadSticker(key);
      });
    });

    // Clicking card applies pose live to 3D scene
    const cards = gridEl.querySelectorAll('.sticker-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-key');
        this.sm.heroAnt.setPose(key);
      });
    });
  }

  attachEvents() {
    // 1. PFP Crop Guide Toggle
    const btnTogglePfp = document.getElementById('btn-toggle-pfp');
    btnTogglePfp.addEventListener('click', () => {
      this.showPfpPreview = !this.showPfpPreview;
      if (this.showPfpPreview) {
        this.pfpFrame.classList.add('active');
        btnTogglePfp.classList.add('active');
      } else {
        this.pfpFrame.classList.remove('active');
        btnTogglePfp.classList.remove('active');
      }
    });

    // 2. Sticker Drawer Toggle
    const btnToggleStickers = document.getElementById('btn-toggle-stickers');
    btnToggleStickers.addEventListener('click', () => {
      this.showStickerDrawer = !this.showStickerDrawer;
      if (this.showStickerDrawer) {
        this.stickerDrawer.classList.add('active');
        btnToggleStickers.classList.add('active');
      } else {
        this.stickerDrawer.classList.remove('active');
        btnToggleStickers.classList.remove('active');
      }
    });

    // 3. Generate Sticker Pack Button
    document.getElementById('btn-gen-stickers').addEventListener('click', () => {
      this.generateStickers();
    });

    document.getElementById('btn-download-all-stickers').addEventListener('click', () => {
      this.stickerEngine.downloadFullPack();
    });

    // 4. Color Presets
    const colorBtns = document.querySelectorAll('#color-presets-grid .color-preset-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        this.sm.heroAnt.setPreset(key);
        const config = ANT_COLOR_PRESETS[key];
        document.getElementById('picker-cuticle').value = config.color;
        document.getElementById('picker-iris').value = config.irisColor || '#0072ff';
      });
    });

    // 5. Custom Color Pickers
    document.getElementById('picker-cuticle').addEventListener('input', (e) => {
      this.sm.heroAnt.setCustomCuticleColor(e.target.value);
    });

    document.getElementById('picker-iris').addEventListener('input', (e) => {
      this.sm.heroAnt.setCustomIrisColor(e.target.value);
    });

    // 6. Accessories Selects
    document.getElementById('select-hat').addEventListener('change', (e) => {
      this.sm.heroAnt.accessories.setHat(e.target.value);
    });

    document.getElementById('select-eyewear').addEventListener('change', (e) => {
      this.sm.heroAnt.accessories.setEyewear(e.target.value);
    });

    document.getElementById('select-prop').addEventListener('change', (e) => {
      this.sm.heroAnt.accessories.setProp(e.target.value);
    });
  }
}
