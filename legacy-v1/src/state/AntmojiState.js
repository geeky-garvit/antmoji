/**
 * Centralized Reactive State Manager for Antmoji
 */
export class AntmojiState {
  constructor() {
    this.state = {
      profile: {
        name: 'Your Name',
        handle: '@antmoji',
        bio: 'Just a cute ant living my best life 🐜✨',
      },
      customization: {
        preset: 'obsidian',
        cuticleColor: '#111827',
        irisColor: '#38bdf8',
        hat: 'none',
        eyewear: 'none',
        piercing: 'none',
        prop: 'none',
        expression: 'happy',
        hair: 'none',
      },
      status: {
        text: '🚀 Building something great!',
        pose: 'working',
        timestamp: 'Just now',
      },
      activeView: 'profile',
    };

    this._listeners = new Set();
  }

  get(path) {
    const keys = path.split('.');
    let curr = this.state;
    for (const k of keys) {
      if (curr == null) return undefined;
      curr = curr[k];
    }
    return curr;
  }

  set(path, value) {
    const keys = path.split('.');
    let curr = this.state;
    for (let i = 0; i < keys.length - 1; i++) curr = curr[keys[i]];
    const last = keys[keys.length - 1];
    if (curr[last] === value) return;
    curr[last] = value;
    this._notify(path, value);
  }

  updateProfile({ name, handle, bio }) {
    if (name !== undefined) this.state.profile.name = name;
    if (handle !== undefined) this.state.profile.handle = handle;
    if (bio !== undefined) this.state.profile.bio = bio;
    this._notify('profile', this.state.profile);
  }

  publishStatus(text, poseKey) {
    this.state.status = { text, pose: poseKey, timestamp: 'Just now' };
    // Sync accessories to pose
    const map = {
      working:     { hat: 'helmet', eyewear: 'none', prop: 'coffee',  expression: 'curious' },
      celebration: { hat: 'party',  eyewear: 'none', prop: 'popper',  expression: 'happy'   },
      cool:        { hat: 'none',   eyewear: 'sunglasses', prop: 'none', expression: 'wink' },
      sleepy:      { hat: 'none',   eyewear: 'none', prop: 'none',    expression: 'sleepy'  },
      confused:    { hat: 'none',   eyewear: 'none', prop: 'none',    expression: 'curious' },
      laughing:    { hat: 'none',   eyewear: 'none', prop: 'none',    expression: 'happy'   },
    };
    const pose = map[poseKey] || {};
    Object.entries(pose).forEach(([k, v]) => { this.state.customization[k] = v; });
    this._notify('status', this.state.status);
    this._notify('customization', this.state.customization);
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify(key, value) {
    this._listeners.forEach(fn => fn(key, value, this.state));
  }
}

export const globalState = new AntmojiState();
