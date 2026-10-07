/**
 * Mood & Status View — View C
 * Pose selector, custom status text, one-click publish.
 */
import { globalState } from '../state/AntmojiState.js';

const POSES = [
  { id: 'working',     emoji: '💻', label: 'Working'     },
  { id: 'cool',        emoji: '😎', label: 'Chilling'    },
  { id: 'celebration', emoji: '🎉', label: 'Celebrating' },
  { id: 'sleepy',      emoji: '😴', label: 'Sleepy'      },
  { id: 'confused',    emoji: '🤔', label: 'Confused'    },
  { id: 'laughing',    emoji: '😂', label: 'Laughing'    },
];

export function buildMoodView(navigate, scene, showToast) {
  const view = document.createElement('div');
  view.className = 'view';
  view.id = 'view-mood';

  const sheet = document.createElement('div');
  sheet.className = 'card mood-sheet';
  view.appendChild(sheet);

  // Header
  const header = document.createElement('div');
  header.className = 'mood-header';
  header.innerHTML = `
    <button class="btn btn-icon" id="mv-back">←</button>
    <span class="mood-title">My Mood & Status</span>
    <div style="width:40px"></div>
  `;
  header.querySelector('#mv-back').addEventListener('click', () => navigate('profile'));
  sheet.appendChild(header);

  // Pose section label
  const poseLabel = document.createElement('div');
  poseLabel.style.cssText = 'font-size:0.78rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em;';
  poseLabel.textContent = 'Choose Your Mood';
  sheet.appendChild(poseLabel);

  // Pose grid
  const poseGrid = document.createElement('div');
  poseGrid.className = 'pose-grid';

  let selectedPose = globalState.get('status.pose') || 'working';

  POSES.forEach(pose => {
    const chip = document.createElement('button');
    chip.className = 'pose-chip' + (selectedPose === pose.id ? ' active' : '');
    chip.dataset.pose = pose.id;
    chip.innerHTML = `<span class="pose-emoji">${pose.emoji}</span><span class="pose-label">${pose.label}</span>`;
    chip.addEventListener('click', () => {
      selectedPose = pose.id;
      poseGrid.querySelectorAll('.pose-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      // Live preview on 3D avatar
      if (scene.heroAnt) scene.heroAnt.setPose(pose.id);
    });
    poseGrid.appendChild(chip);
  });
  sheet.appendChild(poseGrid);

  // Status text input
  const inputGroup = document.createElement('div');
  inputGroup.className = 'status-input-group';
  inputGroup.innerHTML = `
    <label>Custom Status Message</label>
    <input
      class="status-input"
      type="text"
      id="mv-status-text"
      maxlength="80"
      placeholder="What's on your mind? 🐜"
      value="${globalState.get('status.text') || ''}"
    />
  `;
  sheet.appendChild(inputGroup);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'mood-actions';
  actions.innerHTML = `
    <button class="btn btn-ghost btn-sm" id="mv-cancel">Cancel</button>
    <button class="btn btn-yellow btn-lg" id="mv-publish" style="flex:1">
      🚀 Publish Status
    </button>
  `;

  actions.querySelector('#mv-cancel').addEventListener('click', () => {
    // Reset avatar
    if (scene.heroAnt) scene.heroAnt.setPose('neutral');
    navigate('profile');
  });

  actions.querySelector('#mv-publish').addEventListener('click', () => {
    const text = sheet.querySelector('#mv-status-text').value.trim()
      || `${POSES.find(p => p.id === selectedPose)?.emoji || '🐜'} Feeling ${selectedPose}!`;
    globalState.publishStatus(text, selectedPose);
    showToast('🚀 Status published!');
    navigate('profile');
  });

  sheet.appendChild(actions);

  // When view becomes active, seed the input with current status text
  view.addEventListener('transitionend', () => {
    if (view.classList.contains('active')) {
      const inp = sheet.querySelector('#mv-status-text');
      if (inp) inp.value = globalState.get('status.text') || '';
    }
  });

  return view;
}
