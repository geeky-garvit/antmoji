import { AntmojiStage } from '../core/Stage.js';
import { renderAntmojiImage } from '../core/snapshot.js';
import {
  OPTIONS, SKIN_COLORS, FINISHES, EYE_COLORS, HAIR_COLORS,
  parseConfig, encodeConfig, randomConfig,
} from '../core/catalog.js';

const ic = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  skin: ic('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.5 17 3 12 3Z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>'),
  eyes: ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  antenna: ic('<path d="M9 21c0-6-1-9-4-14"/><path d="M15 21c0-6 1-9 4-14"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>'),
  mouth: ic('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'),
  mandible: ic('<path d="M6 6c-2 4-1 9 4 12l1-3c-2-2-3-5-2-8Z"/><path d="M18 6c2 4 1 9-4 12l-1-3c2-2 3-5 2-8Z"/>'),
  hair: ic('<path d="M4 14c0-6 3.5-10 8-10s8 4 8 10"/><path d="M4 14c2-1 4-4 5-7 2 3 6 5 11 7"/>'),
  hat: ic('<path d="M3 17h18"/><path d="M6 17V11a6 6 0 0 1 12 0v6"/><path d="M12 5V3"/>'),
  eyewear: ic('<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 14c1-1 3-1 4 0M3 14 2 8M21 14l1-6"/>'),
  earring: ic('<path d="M12 3v3"/><circle cx="12" cy="13" r="6"/><path d="m12 9 2 4-2 4-2-4Z"/>'),
  neck: ic('<path d="m3 8 7 4-7 4Z"/><path d="m21 8-7 4 7 4Z"/><rect x="10" y="10" width="4" height="4" rx="1"/>'),
};

const CATEGORIES = [
  { id: 'skin', label: 'Cuticle', framing: 'full', sections: [
    { type: 'swatches', key: 'skin', title: 'Cuticle colour', items: SKIN_COLORS, custom: true },
    { type: 'chips', key: 'finish', title: 'Finish', items: FINISHES },
  ] },
  { id: 'eyes', label: 'Eyes', framing: 'face', sections: [
    { type: 'tiles', key: 'eyes', title: 'Eye style', items: OPTIONS.eyes },
    { type: 'swatches', key: 'eyeColor', title: 'Eye colour', items: EYE_COLORS, custom: true },
  ] },
  { id: 'antenna', label: 'Antennae', framing: 'head', sections: [{ type: 'tiles', key: 'antenna', title: 'Antenna style', items: OPTIONS.antenna }] },
  { id: 'mouth', label: 'Mouth', framing: 'face', sections: [{ type: 'tiles', key: 'mouth', title: 'Mouth', items: OPTIONS.mouth }] },
  { id: 'mandible', label: 'Mandibles', framing: 'face', sections: [{ type: 'tiles', key: 'mandible', title: 'Mandible shape', items: OPTIONS.mandible }] },
  { id: 'hair', label: 'Hair', framing: 'head', sections: [
    { type: 'tiles', key: 'hair', title: 'Hairstyle', items: OPTIONS.hair },
    { type: 'swatches', key: 'hairColor', title: 'Hair colour', items: HAIR_COLORS, custom: true },
  ] },
  { id: 'hat', label: 'Hats', framing: 'head', sections: [{ type: 'tiles', key: 'hat', title: 'Headwear', items: OPTIONS.hat }] },
  { id: 'eyewear', label: 'Eyewear', framing: 'face', sections: [{ type: 'tiles', key: 'eyewear', title: 'Eyewear', items: OPTIONS.eyewear }] },
  { id: 'earring', label: 'Jewellery', framing: 'face', sections: [{ type: 'tiles', key: 'earring', title: 'Earrings', items: OPTIONS.earring }] },
  { id: 'neck', label: 'Neck', framing: 'bust', sections: [{ type: 'tiles', key: 'neck', title: 'Neckwear', items: OPTIONS.neck }] },
];

// Hide whatever would cover the option being previewed
const THUMB_OVERRIDE = { hair: { hat: 'none' }, eyes: { eyewear: 'none' }, mandible: { neck: 'none' } };
const THUMB_FRAMING = { eyes: 'face', mouth: 'face', mandible: 'face', eyewear: 'face', earring: 'face', neck: 'bust' };

const STYLE = `
:host {
  --am-bg: #ffffff; --am-surface: #f1f2f5; --am-surface-2: #e7e9ee; --am-text: #12141a; --am-muted: #6b7180;
  --am-accent: #12141a; --am-on-accent: #ffffff; --am-ring: #12141a; --am-stage: linear-gradient(180deg,#e9ecf2 0%,#f7f8fa 70%);
  --am-radius: 18px;
  display: block; position: relative; height: 100%; min-height: 560px; color: var(--am-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--am-bg); overflow: hidden; -webkit-tap-highlight-color: transparent;
}
@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --am-bg: #121318; --am-surface: #1d1f26; --am-surface-2: #272a33; --am-text: #f2f3f6; --am-muted: #9aa0ad;
    --am-accent: #f2f3f6; --am-on-accent: #121318; --am-ring: #f2f3f6; --am-stage: linear-gradient(180deg,#22252e 0%,#16171c 75%);
  }
}
:host([theme="dark"]) {
  --am-bg: #121318; --am-surface: #1d1f26; --am-surface-2: #272a33; --am-text: #f2f3f6; --am-muted: #9aa0ad;
  --am-accent: #f2f3f6; --am-on-accent: #121318; --am-ring: #f2f3f6; --am-stage: linear-gradient(180deg,#22252e 0%,#16171c 75%);
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--am-ring); outline-offset: 2px; }
.shell { position: absolute; inset: 0; display: flex; flex-direction: column; }
.preview { position: relative; flex: 1 1 46%; min-height: 220px; background: var(--am-stage); }
.stage { position: absolute; inset: 0; }
.top { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; z-index: 2; }
.title { position: absolute; top: 22px; left: 64px; right: 64px; text-align: center; margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.02em; pointer-events: none; z-index: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stage { top: 56px; }
.round { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--am-bg) 70%, transparent); backdrop-filter: blur(10px); box-shadow: 0 1px 2px rgb(0 0 0 / .08); }
.save { height: 40px; padding: 0 16px; border-radius: 999px; background: var(--am-accent); color: var(--am-on-accent); font-weight: 700; font-size: 14px; transition: opacity .2s, transform .15s; }
.save:disabled { opacity: .45; cursor: default; }
.save:not(:disabled):active { transform: scale(.96); }
.tools { position: absolute; right: 14px; bottom: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 2; }
.tools .round svg { width: 20px; height: 20px; }
.sheet { position: relative; flex: 1 1 54%; min-height: 0; display: flex; flex-direction: column; background: var(--am-bg); border-radius: 26px 26px 0 0; margin-top: -22px; box-shadow: 0 -8px 30px rgb(0 0 0 / .08); z-index: 3; }
.grab { width: 40px; height: 5px; border-radius: 3px; background: var(--am-surface-2); margin: 9px auto 4px; flex: none; }
.tabs { display: flex; gap: 8px; overflow-x: auto; padding: 8px 16px 10px; scrollbar-width: none; flex: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { flex: none; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 70px; padding: 10px 8px 8px; border-radius: 16px; background: var(--am-surface); color: var(--am-muted); font-size: 12px; font-weight: 600; transition: background .2s, color .2s, box-shadow .2s; }
.tab[aria-selected="true"] { color: var(--am-text); background: var(--am-bg); box-shadow: inset 0 0 0 2px var(--am-ring); }
.panel { flex: 1; overflow-y: auto; padding: 4px 16px 28px; overscroll-behavior: contain; }
.sec-title { font-size: 13px; font-weight: 700; color: var(--am-muted); margin: 12px 2px 10px; text-transform: uppercase; letter-spacing: .06em; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.tile { position: relative; aspect-ratio: 1 / 1.08; border-radius: var(--am-radius); background: var(--am-surface); overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 7px; transition: transform .15s, box-shadow .2s; }
.tile:active { transform: scale(.96); }
.tile[aria-pressed="true"] { box-shadow: inset 0 0 0 2.5px var(--am-ring); background: var(--am-bg); }
.tile img { position: absolute; top: 0; left: 0; width: 100%; height: calc(100% - 28px); object-fit: contain; opacity: 0; transition: opacity .25s; }
.tile img.ok { opacity: 1; }
.tile span { position: relative; font-size: 12px; font-weight: 600; }
.tile .ph { position: absolute; inset: 12% 24% 38%; border-radius: 50%; background: linear-gradient(90deg, var(--am-surface-2), var(--am-surface), var(--am-surface-2)); background-size: 200% 100%; animation: sh 1.2s linear infinite; }
@keyframes sh { to { background-position: -200% 0; } }
.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 12px; }
.sw { aspect-ratio: 1; border-radius: 50%; position: relative; box-shadow: inset 0 -6px 10px rgb(0 0 0 / .25), inset 0 6px 10px rgb(255 255 255 / .25); transition: transform .15s; }
.sw[aria-pressed="true"]::after { content: ""; position: absolute; inset: -5px; border-radius: 50%; box-shadow: 0 0 0 2.5px var(--am-ring); }
.sw:active { transform: scale(.92); }
.sw.custom { background: conic-gradient(#f43f5e, #f59e0b, #facc15, #22c55e, #06b6d4, #3b82f6, #a855f7, #f43f5e); overflow: hidden; }
.sw.custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; border: 0; padding: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 10px 16px; border-radius: 999px; background: var(--am-surface); font-size: 14px; font-weight: 600; }
.chip[aria-pressed="true"] { background: var(--am-accent); color: var(--am-on-accent); }
@media (prefers-reduced-motion: reduce) { .tile, .sw, .save { transition: none; } .tile .ph { animation: none; } }
`;

/**
 * <antmoji-editor config="…"> — full customiser.
 * Events: `change` / `save` / `close`, each with detail { config, code }.
 */
export class AntmojiEditorElement extends HTMLElement {
  static observedAttributes = ['config'];

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style>
      <div class="shell">
        <div class="preview">
          <div class="stage"></div>
          <div class="top">
            <button class="round" data-act="close" aria-label="Close">${ic('<path d="M18 6 6 18M6 6l12 12"/>')}</button>
            <button class="save" data-act="save" disabled>Save</button>
          </div>
          <h2 class="title" part="title">My Antmoji</h2>
          <div class="tools">
            <button class="round" data-act="undo" aria-label="Undo" title="Undo">${ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>')}</button>
            <button class="round" data-act="shuffle" aria-label="Surprise me" title="Surprise me">${ic('<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>')}</button>
            <button class="round" data-act="wave" aria-label="Wave" title="Say hi">${ic('<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>')}</button>
          </div>
        </div>
        <section class="sheet" part="sheet">
          <div class="grab"></div>
          <nav class="tabs" role="tablist" aria-label="Customise"></nav>
          <div class="panel" role="tabpanel"></div>
        </section>
      </div>`;
    this.$ = (s) => root.querySelector(s);
    this._config = parseConfig(null);
    this._saved = encodeConfig(this._config);
    this._history = [];
    this._cat = CATEGORIES[0].id;
    this._thumbGen = 0;

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act) return this._action(b.dataset.act);
      if (b.dataset.cat) return this._selectCat(b.dataset.cat);
      if (b.dataset.key) return this._set(b.dataset.key, b.dataset.val);
    });
    root.addEventListener('input', (e) => {
      const inp = e.target;
      if (inp.dataset.key) this._set(inp.dataset.key, inp.value, { coalesce: true });
    });
  }

  get config() { return { ...this._config }; }
  set config(v) { this._load(v); }
  get code() { return encodeConfig(this._config); }

  attributeChangedCallback(name, _o, v) { if (name === 'config') this._load(v); }

  connectedCallback() {
    this._renderTabs();
    this._renderPanel();
    if (!this._stage) {
      this._stage = new AntmojiStage(this.$('.stage'), { config: this._config, framing: 'full', follow: 'pointer', idleGesture: false });
      setTimeout(() => this._stage?.play('wave'), 600);
    }
  }

  disconnectedCallback() { this._stage?.dispose(); this._stage = null; }

  _load(v) {
    this._config = parseConfig(v);
    this._saved = encodeConfig(this._config);
    this._history = [];
    this._stage?.setConfig(this._config);
    this._sync();
  }

  _set(key, val, { coalesce = false } = {}) {
    if (this._config[key] === val) return;
    const last = this._history[this._history.length - 1];
    if (!(coalesce && last?.key === key)) this._history.push({ key, config: { ...this._config } });
    if (this._history.length > 60) this._history.shift();
    this._config = parseConfig({ ...this._config, [key]: val });
    this._stage?.setConfig(this._config);
    if (key === 'eyes' || key === 'mouth') this._stage?.play('nod');
    this._emit('change');
    this._sync();
  }

  _action(act) {
    if (act === 'close') return this._emit('close');
    if (act === 'save') {
      this._saved = encodeConfig(this._config);
      this._stage?.play('jump');
      this._emit('save');
      return this._sync();
    }
    if (act === 'wave') return this._stage?.play('wave');
    if (act === 'undo') {
      const h = this._history.pop();
      if (!h) return;
      this._config = h.config;
      this._stage?.setConfig(this._config);
      this._emit('change');
      return this._sync();
    }
    if (act === 'shuffle') {
      this._history.push({ key: '*', config: { ...this._config } });
      this._config = randomConfig();
      this._stage?.setConfig(this._config);
      this._stage?.play('spin');
      this._emit('change');
      this._sync();
    }
  }

  _emit(type) {
    this.dispatchEvent(new CustomEvent(type, { detail: { config: this.config, code: this.code }, bubbles: true, composed: true }));
  }

  _sync() {
    if (!this.isConnected) return;
    this.$('.save').disabled = encodeConfig(this._config) === this._saved;
    this.$('[data-act="undo"]').disabled = !this._history.length;
    this.$('[data-act="undo"]').style.opacity = this._history.length ? 1 : 0.45;
    // pressed states
    for (const el of this.shadowRoot.querySelectorAll('[data-key]')) {
      if (el.tagName === 'INPUT') continue;
      el.setAttribute('aria-pressed', String(this._config[el.dataset.key] === el.dataset.val));
    }
    for (const inp of this.shadowRoot.querySelectorAll('input[data-key]')) {
      const key = inp.dataset.key;
      const known = [...this.shadowRoot.querySelectorAll(`button[data-key="${key}"]`)].some((b) => b.dataset.val === this._config[key]);
      inp.closest('.sw').setAttribute('aria-pressed', String(!known));
      inp.value = this._config[key];
    }
    clearTimeout(this._thumbTO);
    this._thumbTO = setTimeout(() => this._renderThumbs(), 220);
  }

  _selectCat(id) {
    this._cat = id;
    const cat = CATEGORIES.find((c) => c.id === id);
    this._stage?.setFraming(cat.framing);
    for (const t of this.shadowRoot.querySelectorAll('.tab')) t.setAttribute('aria-selected', String(t.dataset.cat === id));
    this._renderPanel();
    this.$('.panel').scrollTop = 0;
  }

  _renderTabs() {
    this.$('.tabs').innerHTML = CATEGORIES.map((c) => `
      <button class="tab" role="tab" data-cat="${c.id}" aria-selected="${c.id === this._cat}">${ICONS[c.id]}<span>${c.label}</span></button>`).join('');
  }

  _renderPanel() {
    const cat = CATEGORIES.find((c) => c.id === this._cat);
    this.$('.panel').innerHTML = cat.sections.map((s) => {
      const head = `<div class="sec-title">${s.title}</div>`;
      if (s.type === 'tiles') {
        return head + `<div class="tiles">${s.items.map((o) => `
          <button class="tile" data-key="${s.key}" data-val="${o.id}" aria-label="${o.label}">
            <div class="ph"></div><img alt="" data-thumb="${s.key}:${o.id}"><span>${o.label}</span>
          </button>`).join('')}</div>`;
      }
      if (s.type === 'swatches') {
        return head + `<div class="swatches">${s.items.map((o) => `
          <button class="sw" data-key="${s.key}" data-val="${o.hex}" style="background:${o.hex}" aria-label="${o.label}" title="${o.label}"></button>`).join('')}
          ${s.custom ? `<label class="sw custom" title="Custom colour"><input type="color" data-key="${s.key}" aria-label="Custom colour"></label>` : ''}
        </div>`;
      }
      return head + `<div class="chips">${s.items.map((o) => `<button class="chip" data-key="${s.key}" data-val="${o.id}">${o.label}</button>`).join('')}</div>`;
    }).join('');
    this._sync();
  }

  /** Render each option on *your* ant (like Snapchat/Bitmoji). */
  _renderThumbs() {
    const gen = ++this._thumbGen;
    const imgs = [...this.shadowRoot.querySelectorAll('img[data-thumb]')];
    (async () => {
      for (const img of imgs) {
        if (gen !== this._thumbGen) return;
        const [key, val] = img.dataset.thumb.split(':');
        const cfg = { ...this._config, ...THUMB_OVERRIDE[key], [key]: val };
        const url = await renderAntmojiImage(cfg, { size: 220, framing: THUMB_FRAMING[key] || 'head' });
        if (gen !== this._thumbGen) return;
        img.onload = () => { img.classList.add('ok'); img.previousElementSibling?.remove(); };
        img.src = url;
      }
    })();
  }
}
