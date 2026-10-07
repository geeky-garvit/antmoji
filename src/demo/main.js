import { defineAntmojiElements, PRESETS, encodeConfig, parseConfig, warmAntmojiCache } from '../antmoji/index.js';

defineAntmojiElements();

/* ── Persistence (an app would save `code` on the user record) ── */
const KEY = 'antmoji.code';
const load = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const store = (code) => { try { localStorage.setItem(KEY, code); } catch { /* private mode */ } };

let code = load() || encodeConfig(PRESETS[1].config);
const avatar = document.getElementById('avatar');
const full = document.getElementById('full');
avatar.config = code;
full.config = code;

/* ── Toast ── */
const toastEl = document.getElementById('toast');
let toastT;
const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
};

/* ── Friends + chat use image mode (shared renderer, no extra GPU contexts) ── */
const friends = document.getElementById('friends');
const names = ['Classic', 'Nerd', 'Royal', 'Cozy', 'DJ', 'Sweet', 'Mint', 'Chrome'];
PRESETS.forEach((p, i) => {
  const el = document.createElement('button');
  el.className = 'friend';
  el.innerHTML = `<ant-moji mode="image" framing="bust" size="88"></ant-moji><span>${names[i]}</span>`;
  el.querySelector('ant-moji').config = p.config;
  el.addEventListener('click', () => {
    code = encodeConfig(p.config);
    applyEverywhere(code);
    toast(`Tried on “${p.name}” — open the editor to save it`);
  });
  friends.appendChild(el);
});

const chat = document.getElementById('chat');
const renderChat = () => {
  chat.innerHTML = '';
  const msgs = [
    { me: false, cfg: PRESETS[3].config, text: 'Love the new look!! 🐜' },
    { me: true, cfg: code, text: 'Thanks — built it in like 30 seconds' },
    { me: false, cfg: PRESETS[4].config, text: 'Those antennae 🔥' },
  ];
  for (const m of msgs) {
    const row = document.createElement('div');
    row.className = 'msg' + (m.me ? ' me' : '');
    row.innerHTML = `<ant-moji mode="image" framing="face" size="40"></ant-moji><p></p>`;
    row.querySelector('p').textContent = m.text;
    row.querySelector('ant-moji').config = m.cfg;
    chat.appendChild(row);
  }
};
renderChat();

function applyEverywhere(c) {
  avatar.config = c;
  full.config = c;
  renderChat();
}

/* ── Editor dialog ── */
const dialog = document.getElementById('editor-dialog');
const host = document.getElementById('editor-host');
let editor = null;

function openEditor() {
  editor = document.createElement('antmoji-editor');
  editor.setAttribute('theme', 'light');
  editor.config = code;
  editor.addEventListener('save', (e) => {
    code = e.detail.code;
    store(code);
    applyEverywhere(code);
    toast('Antmoji saved');
    setTimeout(closeEditor, 700);
  });
  editor.addEventListener('close', closeEditor);
  host.appendChild(editor);
  dialog.showModal();
}
function closeEditor() {
  dialog.close();
}
dialog.addEventListener('close', () => { editor?.remove(); editor = null; });
dialog.addEventListener('click', (e) => { if (e.target === dialog) closeEditor(); });

document.getElementById('edit-btn').addEventListener('click', openEditor);
document.getElementById('edit-fab').addEventListener('click', openEditor);
document.getElementById('wave-btn').addEventListener('click', () => { avatar.play('wave'); full.play('wave'); });
document.getElementById('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(code); toast(`Copied avatar code ${code}`); }
  catch { toast(code); }
});

// Pre-sculpt every option while the user reads the profile
warmAntmojiCache();

// Debug/automation hooks
window.__antmoji = { openEditor, parseConfig, get code() { return code; } };
const q = new URLSearchParams(location.search);
if (q.has('edit')) {
  openEditor();
  if (q.get('edit')) setTimeout(() => editor?._selectCat(q.get('edit')), 50);
}
