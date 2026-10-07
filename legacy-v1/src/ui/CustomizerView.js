/**
 * Antmoji Customizer View — View B
 * Snapchat-style bottom sheet with tabbed categories and option grids.
 */
import { globalState } from '../state/AntmojiState.js';
import { ANT_COLOR_PRESETS } from '../components/AntMemoji.js';

// ── Category definitions ────────────────────────────────────
const CATEGORIES = [
  { id: 'color',       icon: '🎨', label: 'Color'       },
  { id: 'hair',        icon: '💇', label: 'Hair'        },
  { id: 'hat',         icon: '🎩', label: 'Hats'        },
  { id: 'eyewear',     icon: '🕶️', label: 'Eyewear'     },
  { id: 'piercing',    icon: '💎', label: 'Piercings'   },
  { id: 'prop',        icon: '🎁', label: 'Props'       },
  { id: 'expression',  icon: '😊', label: 'Expression'  },
];

const HAIR_OPTIONS = [
  { id: 'none',  icon: '🚫', label: 'None'    },
  { id: 'tufts', icon: '🌱', label: 'Tufts'   },
  { id: 'wavy',  icon: '〰️', label: 'Wavy'   },
];

const HAT_OPTIONS = [
  { id: 'none',    icon: '🚫', label: 'None'     },
  { id: 'beanie',  icon: '🧢', label: 'Beanie'   },
  { id: 'party',   icon: '🎉', label: 'Party'    },
  { id: 'helmet',  icon: '👷', label: 'Helmet'   },
  { id: 'crown',   icon: '👑', label: 'Crown'    },
  { id: 'leaf',    icon: '🍃', label: 'Leaf'     },
];

const EYEWEAR_OPTIONS = [
  { id: 'none',        icon: '🚫', label: 'None'        },
  { id: 'glasses',     icon: '👓', label: 'Glasses'     },
  { id: 'sunglasses',  icon: '🕶️', label: 'Sunglasses' },
  { id: 'goggles',     icon: '🥽', label: 'Goggles'     },
];

const PIERCING_OPTIONS = [
  { id: 'none',      icon: '🚫', label: 'None'       },
  { id: 'earring',   icon: '💍', label: 'Earring'    },
  { id: 'nose_stud', icon: '💎', label: 'Nose Stud'  },
];

const PROP_OPTIONS = [
  { id: 'none',   icon: '🚫', label: 'None'    },
  { id: 'coffee', icon: '☕', label: 'Coffee'  },
  { id: 'leaf',   icon: '🍃', label: 'Leaf'    },
  { id: 'popper', icon: '🎉', label: 'Popper'  },
];

const EXPRESSION_OPTIONS = [
  { id: 'happy',    icon: '😊', label: 'Happy'    },
  { id: 'wink',     icon: '😉', label: 'Wink'     },
  { id: 'curious',  icon: '🤔', label: 'Curious'  },
  { id: 'surprised',icon: '😮', label: 'Surprised'},
  { id: 'sleepy',   icon: '😴', label: 'Sleepy'   },
  { id: 'laughing', icon: '😂', label: 'Laughing' },
];

// ── Build options panel for a category ─────────────────────
function buildOptionsPanel(catId, state, onOptionChange) {
  const panel = document.createElement('div');
  panel.className = 'options-panel';

  const c = state.customization;

  if (catId === 'color') {
    // Preset swatches
    const grid = document.createElement('div');
    grid.className = 'color-options-grid';

    Object.entries(ANT_COLOR_PRESETS).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn' + (c.preset === key ? ' active' : '');
      btn.title = preset.name;
      btn.innerHTML = `<div class="color-btn-inner" style="background:${preset.sssColor}"></div>`;
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onOptionChange('preset', key);
        onOptionChange('cuticleColor', preset.color);
        onOptionChange('irisColor', preset.irisColor || '#38bdf8');
      });
      grid.appendChild(btn);
    });
    panel.appendChild(grid);

    // Custom pickers
    const row1 = document.createElement('div');
    row1.className = 'color-custom-row';
    row1.innerHTML = `<label>Custom Body Color</label><input type="color" id="picker-cuticle" value="${c.cuticleColor}" />`;
    row1.querySelector('#picker-cuticle').addEventListener('input', e => {
      onOptionChange('preset', 'custom');
      onOptionChange('cuticleColor', e.target.value);
    });

    const row2 = document.createElement('div');
    row2.className = 'color-custom-row';
    row2.innerHTML = `<label>Custom Eye Color</label><input type="color" id="picker-iris" value="${c.irisColor}" />`;
    row2.querySelector('#picker-iris').addEventListener('input', e => {
      onOptionChange('preset', 'custom');
      onOptionChange('irisColor', e.target.value);
    });

    panel.appendChild(row1);
    panel.appendChild(row2);

  } else if (catId === 'expression') {
    const grid = document.createElement('div');
    grid.className = 'expr-grid';
    EXPRESSION_OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'expr-chip' + (c.expression === opt.id ? ' active' : '');
      btn.innerHTML = `<span class="expr-icon">${opt.icon}</span><span class="expr-label">${opt.label}</span>`;
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.expr-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onOptionChange('expression', opt.id);
      });
      grid.appendChild(btn);
    });
    panel.appendChild(grid);

  } else {
    // Generic option grid
    const optionMap = {
      hair: HAIR_OPTIONS, hat: HAT_OPTIONS, eyewear: EYEWEAR_OPTIONS,
      piercing: PIERCING_OPTIONS, prop: PROP_OPTIONS,
    };
    const options = optionMap[catId] || [];
    const currentVal = c[catId] || 'none';

    const grid = document.createElement('div');
    grid.className = 'options-grid';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (currentVal === opt.id ? ' active' : '');
      btn.innerHTML = `<span class="opt-icon">${opt.icon}</span><span class="opt-label">${opt.label}</span>`;
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onOptionChange(catId, opt.id);
      });
      grid.appendChild(btn);
    });
    panel.appendChild(grid);
  }

  return panel;
}

// ── Main builder ────────────────────────────────────────────
export function buildCustomizerView(navigate, scene, showToast) {
  const view = document.createElement('div');
  view.className = 'view';
  view.id = 'view-customizer';

  // Header
  const header = document.createElement('div');
  header.className = 'studio-header';
  header.innerHTML = `
    <button class="btn btn-icon" id="cv-back">←</button>
    <span class="studio-title">My Antmoji</span>
    <button class="btn btn-yellow btn-sm" id="cv-save">Save ✓</button>
  `;
  header.querySelector('#cv-back').addEventListener('click', () => navigate('profile'));
  header.querySelector('#cv-save').addEventListener('click', () => {
    showToast('✅ Antmoji saved!');
    navigate('profile');
  });
  view.appendChild(header);

  // Bottom Sheet
  const sheet = document.createElement('div');
  sheet.className = 'studio-sheet';
  view.appendChild(sheet);

  // Drag handle
  const handle = document.createElement('div');
  handle.className = 'sheet-handle';
  sheet.appendChild(handle);

  // Category tabs
  const tabStrip = document.createElement('div');
  tabStrip.className = 'category-tabs';
  sheet.appendChild(tabStrip);

  // Options container
  const optionsContainer = document.createElement('div');
  sheet.appendChild(optionsContainer);

  let currentCat = 'color';
  let currentPanel = null;

  const pendingChanges = {};

  const applyChange = (key, value) => {
    pendingChanges[key] = value;
    globalState.set(`customization.${key}`, value);

    // Live preview on 3D avatar
    const ant = scene.heroAnt;
    if (!ant) return;
    if (key === 'preset') {
      if (value !== 'custom') ant.setPreset(value);
    } else if (key === 'cuticleColor') {
      ant.setCustomCuticleColor(value);
    } else if (key === 'irisColor') {
      ant.setCustomIrisColor(value);
    } else if (key === 'hat') {
      ant.accessories.setHat(value);
    } else if (key === 'eyewear') {
      ant.accessories.setEyewear(value);
    } else if (key === 'piercing') {
      ant.accessories.setPiercing(value);
    } else if (key === 'prop') {
      ant.accessories.setProp(value);
    } else if (key === 'expression') {
      ant.setExpression(value, 0.5);
    }
  };

  const switchCategory = (catId) => {
    currentCat = catId;

    // Tab highlight
    tabStrip.querySelectorAll('.cat-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.cat === catId));

    // Rebuild panel
    if (currentPanel) optionsContainer.removeChild(currentPanel);
    currentPanel = buildOptionsPanel(catId, globalState.state, applyChange);
    optionsContainer.appendChild(currentPanel);
  };

  // Build tabs
  CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'cat-tab' + (cat.id === currentCat ? ' active' : '');
    tab.dataset.cat = cat.id;
    tab.innerHTML = `<span class="cat-icon">${cat.icon}</span>${cat.label}`;
    tab.addEventListener('click', () => switchCategory(cat.id));
    tabStrip.appendChild(tab);
  });

  // Initial panel
  currentPanel = buildOptionsPanel(currentCat, globalState.state, applyChange);
  optionsContainer.appendChild(currentPanel);

  return view;
}
