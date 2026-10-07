import { AntmojiStage } from '../core/Stage.js';
import { renderAntmojiImage } from '../core/snapshot.js';
import { parseConfig, encodeConfig } from '../core/catalog.js';

/**
 * <ant-moji config="a1…" framing="bust" mode="live|image" interactive>
 *
 * Drop-in avatar for any app. `mode="live"` (default) renders the animated 3D
 * character; `mode="image"` renders a static PNG through one shared context,
 * which is what you want in lists, chats and comment threads.
 */
export class AntmojiAvatarElement extends HTMLElement {
  static observedAttributes = ['config', 'framing', 'mode', 'size', 'interactive', 'follow'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-block; position: relative; width: 160px; aspect-ratio: 1; contain: content; }
        .wrap, img { position: absolute; inset: 0; width: 100%; height: 100%; }
        img { object-fit: contain; display: block; }
        .wrap { touch-action: pan-y; }
      </style>
      <div class="wrap" part="canvas"></div>`;
    this._wrap = this.shadowRoot.querySelector('.wrap');
    this._config = parseConfig(null);
  }

  get config() { return { ...this._config }; }
  set config(v) {
    this._config = parseConfig(v);
    this._apply();
  }
  /** Compact string you can store on the user record. */
  get code() { return encodeConfig(this._config); }

  get stage() { return this._stage || null; }

  connectedCallback() { this._connected = true; this._render(); }
  disconnectedCallback() {
    this._connected = false;
    this._stage?.dispose(); this._stage = null;
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'config') { this._config = parseConfig(val); this._apply(); return; }
    if (name === 'framing' && this._stage) { this._stage.setFraming(val || 'bust'); return; }
    if (this._connected) this._render();
  }

  play(gesture = 'wave') { this._stage?.play(gesture); }

  /** PNG data URL of this avatar — e.g. to upload as a classic profile picture. */
  toImage({ size = 512, framing } = {}) {
    return renderAntmojiImage(this._config, { size, framing: framing || this.getAttribute('framing') || 'bust' });
  }

  _apply() {
    if (!this._connected) return;
    if (this._stage) this._stage.setConfig(this._config);
    else this._renderImage();
  }

  _render() {
    const mode = this.getAttribute('mode') || 'live';
    this._stage?.dispose(); this._stage = null;
    this.shadowRoot.querySelector('img')?.remove();
    if (mode === 'image') { this._renderImage(); return; }
    this._stage = new AntmojiStage(this._wrap, {
      config: this._config,
      framing: this.getAttribute('framing') || 'bust',
      interactive: this.getAttribute('interactive') !== 'false',
      follow: this.getAttribute('follow') || 'pointer',
    });
  }

  async _renderImage() {
    const px = Math.round((parseInt(this.getAttribute('size'), 10) || this.clientWidth || 160) * Math.min(window.devicePixelRatio || 1, 2));
    const size = Math.min(1024, Math.max(64, px));
    const ticket = (this._ticket = (this._ticket || 0) + 1);
    const url = await renderAntmojiImage(this._config, { size, framing: this.getAttribute('framing') || 'bust' });
    if (ticket !== this._ticket || !this._connected || this._stage) return;
    let img = this.shadowRoot.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.part = 'image';
      img.alt = 'Antmoji avatar';
      this.shadowRoot.appendChild(img);
    }
    img.src = url;
  }
}
