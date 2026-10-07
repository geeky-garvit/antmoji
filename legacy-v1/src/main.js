/**
 * Complete Main Application Entry Point
 * Initialises Three.js scene, creates all UI views, wires navigation.
 */
import { SceneManager } from './scene/SceneManager.js';
import { globalState }  from './state/AntmojiState.js';
import { buildProfileView }   from './ui/ProfileHomeView.js';
import { buildCustomizerView } from './ui/CustomizerView.js';
import { buildMoodView }       from './ui/MoodStatusView.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webgl-canvas');
  const app    = document.getElementById('app');
  if (!canvas || !app) return;

  /* ── Scene ─────────────────────────────────────────────── */
  const scene = new SceneManager(canvas);

  /* ── Toast helper ──────────────────────────────────────── */
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  document.body.appendChild(toastEl);
  let toastTimer;
  const showToast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  };

  /* ── Navigation ────────────────────────────────────────── */
  const views = {};
  const navItems = {};

  const navigate = (to) => {
    const from = globalState.get('activeView');
    if (from === to) return;

    // Camera mode
    scene.setCameraMode(to);

    // View transition
    if (views[from]) {
      views[from].classList.remove('active');
      views[from].classList.add(to === 'profile' ? 'exit-right' : 'exit-left');
      setTimeout(() => views[from]?.classList.remove('exit-left', 'exit-right'), 400);
    }
    if (views[to]) views[to].classList.add('active');

    // Nav highlight
    Object.entries(navItems).forEach(([k, el]) => el.classList.toggle('active', k === to));

    globalState.set('activeView', to);
  };

  /* ── Build Views ───────────────────────────────────────── */
  views.profile    = buildProfileView(navigate, scene, showToast);
  views.customizer = buildCustomizerView(navigate, scene, showToast);
  views.mood       = buildMoodView(navigate, scene, showToast);

  Object.values(views).forEach(v => app.appendChild(v));
  views.profile.classList.add('active');

  /* ── Bottom Navigation ─────────────────────────────────── */
  const navData = [
    { id: 'profile',    icon: '🐜', label: 'Profile'    },
    { id: 'customizer', icon: '✏️', label: 'My Antmoji' },
    { id: 'mood',       icon: '😊', label: 'My Mood'    },
  ];

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  navData.forEach(({ id, icon, label }) => {
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (id === 'profile' ? ' active' : '');
    btn.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-label">${label}</span>`;
    btn.addEventListener('click', () => navigate(id));
    nav.appendChild(btn);
    navItems[id] = btn;
  });

  document.body.appendChild(nav);

  /* ── State subscriptions ───────────────────────────────── */
  globalState.subscribe((key, value, state) => {
    if (key === 'customization' || key.startsWith('customization.')) {
      const c = state.customization;
      const ant = scene.heroAnt;
      if (!ant) return;

      // Colour preset or custom
      if (c.preset && c.preset !== 'custom') {
        ant.setPreset(c.preset);
      } else {
        ant.setCustomCuticleColor(c.cuticleColor);
        ant.setCustomIrisColor(c.irisColor);
      }

      ant.accessories.setHat(c.hat);
      ant.accessories.setEyewear(c.eyewear);
      ant.accessories.setPiercing(c.piercing);
      ant.accessories.setProp(c.prop);
      ant.setExpression(c.expression || 'happy', 0.5);
    }
  });

  /* ── Start render loop ─────────────────────────────────── */
  scene.startLoop();
});
