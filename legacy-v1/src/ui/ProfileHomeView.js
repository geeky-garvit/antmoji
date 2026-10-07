/**
 * Profile Home View — View A
 * Shows live 3D avatar, editable profile, status pill, and quick-action buttons.
 */
import { globalState } from '../state/AntmojiState.js';

export function buildProfileView(navigate, scene, showToast) {
  const view = document.createElement('div');
  view.className = 'view';
  view.id = 'view-profile';

  // ── Edit Modal ───────────────────────────────────────────
  const editOverlay = document.createElement('div');
  editOverlay.className = 'edit-overlay';
  editOverlay.innerHTML = `
    <div class="edit-modal">
      <h3>Edit Profile</h3>
      <div class="edit-field">
        <label>Display Name</label>
        <input id="ep-name" type="text" maxlength="40" />
      </div>
      <div class="edit-field">
        <label>Handle</label>
        <input id="ep-handle" type="text" maxlength="30" />
      </div>
      <div class="edit-field">
        <label>Bio</label>
        <textarea id="ep-bio" rows="3" maxlength="120"></textarea>
      </div>
      <div class="edit-actions">
        <button class="btn btn-ghost btn-sm" id="ep-cancel">Cancel</button>
        <button class="btn btn-dark btn-sm" id="ep-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(editOverlay);

  const openEdit = () => {
    const p = globalState.get('profile');
    editOverlay.querySelector('#ep-name').value   = p.name;
    editOverlay.querySelector('#ep-handle').value = p.handle;
    editOverlay.querySelector('#ep-bio').value    = p.bio;
    editOverlay.classList.add('open');
  };
  editOverlay.querySelector('#ep-cancel').addEventListener('click', () => editOverlay.classList.remove('open'));
  editOverlay.querySelector('#ep-save').addEventListener('click', () => {
    globalState.updateProfile({
      name:   editOverlay.querySelector('#ep-name').value.trim()   || 'Your Name',
      handle: editOverlay.querySelector('#ep-handle').value.trim() || '@antmoji',
      bio:    editOverlay.querySelector('#ep-bio').value.trim(),
    });
    editOverlay.classList.remove('open');
    renderCard();
    showToast('✅ Profile saved!');
  });
  // Close on backdrop click
  editOverlay.addEventListener('click', e => { if (e.target === editOverlay) editOverlay.classList.remove('open'); });

  // ── Card ─────────────────────────────────────────────────
  const card = document.createElement('div');
  card.className = 'card profile-card';
  view.appendChild(card);

  const renderCard = () => {
    const p = globalState.get('profile');
    const s = globalState.get('status');
    card.innerHTML = `
      <div class="profile-top">
        <div class="profile-avatar-thumb">🐜</div>
        <div class="profile-info">
          <div class="profile-name" id="pv-name">${p.name}</div>
          <div class="profile-handle">${p.handle}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="pv-edit">Edit ✏️</button>
      </div>
      <div class="profile-bio" id="pv-bio">${p.bio}</div>
      <div class="profile-status-pill">
        <div class="status-dot"></div>
        <span>${s.text}</span>
      </div>
      <div class="profile-actions">
        <button class="btn btn-dark btn-lg" id="pv-btn-customizer">✏️ My Antmoji</button>
        <button class="btn btn-yellow btn-lg" id="pv-btn-mood">😊 My Mood</button>
      </div>
    `;

    card.querySelector('#pv-edit').addEventListener('click', openEdit);
    card.querySelector('#pv-name').addEventListener('click', openEdit);
    card.querySelector('#pv-bio').addEventListener('click', openEdit);
    card.querySelector('#pv-btn-customizer').addEventListener('click', () => navigate('customizer'));
    card.querySelector('#pv-btn-mood').addEventListener('click', () => navigate('mood'));
  };

  renderCard();

  // Reactive updates
  globalState.subscribe((key) => {
    if (key === 'profile' || key === 'status') renderCard();
  });

  return view;
}
