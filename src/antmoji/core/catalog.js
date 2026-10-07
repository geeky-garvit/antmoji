/**
 * Antmoji option catalog + config schema.
 * One source of truth shared by the 3D character, the editor UI and any app
 * that stores a user's avatar (as JSON or a compact URL-safe string).
 */

export const SKIN_COLORS = [
  { id: 'obsidian', label: 'Obsidian', hex: '#161b28' },
  { id: 'midnight', label: 'Midnight', hex: '#1e2b4f' },
  { id: 'cocoa', label: 'Cocoa', hex: '#4a2a1a' },
  { id: 'ruby', label: 'Ruby', hex: '#8a1628' },
  { id: 'ember', label: 'Ember', hex: '#c2410c' },
  { id: 'honey', label: 'Honey', hex: '#c58a1d' },
  { id: 'jade', label: 'Jade', hex: '#0f766e' },
  { id: 'lime', label: 'Lime', hex: '#65a30d' },
  { id: 'sky', label: 'Sky', hex: '#2f74c0' },
  { id: 'lilac', label: 'Lilac', hex: '#7c5cc4' },
  { id: 'rose', label: 'Rose', hex: '#d0607f' },
  { id: 'snow', label: 'Snow', hex: '#e6e8ee' },
];

export const FINISHES = [
  { id: 'gloss', label: 'Gloss' },
  { id: 'satin', label: 'Satin' },
  { id: 'pearl', label: 'Pearl' },
  { id: 'chrome', label: 'Chrome' },
];

export const EYE_COLORS = [
  { id: 'sky', label: 'Sky', hex: '#3b8fe8' },
  { id: 'brown', label: 'Brown', hex: '#7a4a24' },
  { id: 'green', label: 'Green', hex: '#2f9e58' },
  { id: 'amber', label: 'Amber', hex: '#e09a1a' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { id: 'gray', label: 'Gray', hex: '#6b7a90' },
  { id: 'rose', label: 'Rose', hex: '#e2557e' },
  { id: 'black', label: 'Onyx', hex: '#1d2230' },
];

export const HAIR_COLORS = [
  { id: 'chestnut', label: 'Chestnut', hex: '#8a4b24' },
  { id: 'black', label: 'Black', hex: '#1a1a1f' },
  { id: 'blonde', label: 'Blonde', hex: '#e2b65c' },
  { id: 'ginger', label: 'Ginger', hex: '#c8551f' },
  { id: 'pink', label: 'Pink', hex: '#f472b6' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'mint', label: 'Mint', hex: '#34d399' },
  { id: 'silver', label: 'Silver', hex: '#d4d7de' },
];

export const OPTIONS = {
  antenna: [
    { id: 'elbow', label: 'Elbowed' },
    { id: 'curve', label: 'Swoop' },
    { id: 'curly', label: 'Curly' },
    { id: 'bobble', label: 'Bobble' },
    { id: 'short', label: 'Stubby' },
  ],
  mandible: [
    { id: 'none', label: 'None' },
    { id: 'nubs', label: 'Nubs' },
    { id: 'fangs', label: 'Fangs' },
    { id: 'pincers', label: 'Pincers' },
  ],
  mouth: [
    { id: 'smile', label: 'Smile' },
    { id: 'grin', label: 'Grin' },
    { id: 'smirk', label: 'Smirk' },
    { id: 'cat', label: 'Cat' },
    { id: 'o', label: 'Wow' },
    { id: 'tongue', label: 'Cheeky' },
  ],
  eyes: [
    { id: 'normal', label: 'Bright' },
    { id: 'happy', label: 'Happy' },
    { id: 'sleepy', label: 'Chill' },
    { id: 'wink', label: 'Wink' },
  ],
  hair: [
    { id: 'none', label: 'None' },
    { id: 'tuft', label: 'Tuft' },
    { id: 'swoop', label: 'Swoop' },
    { id: 'bob', label: 'Bob' },
    { id: 'curly', label: 'Curly' },
    { id: 'mohawk', label: 'Mohawk' },
    { id: 'buns', label: 'Buns' },
  ],
  hat: [
    { id: 'none', label: 'None' },
    { id: 'propeller', label: 'Propeller' },
    { id: 'beanie', label: 'Beanie' },
    { id: 'cap', label: 'Cap' },
    { id: 'crown', label: 'Crown' },
    { id: 'party', label: 'Party' },
    { id: 'headphones', label: 'Headphones' },
    { id: 'bow', label: 'Bow' },
  ],
  eyewear: [
    { id: 'none', label: 'None' },
    { id: 'round', label: 'Round' },
    { id: 'square', label: 'Square' },
    { id: 'shades', label: 'Aviators' },
    { id: 'heart', label: 'Hearts' },
  ],
  earring: [
    { id: 'none', label: 'None' },
    { id: 'stud', label: 'Studs' },
    { id: 'hoop', label: 'Hoops' },
    { id: 'pearl', label: 'Pearls' },
  ],
  neck: [
    { id: 'none', label: 'None' },
    { id: 'bowtie', label: 'Bow tie' },
    { id: 'scarf', label: 'Scarf' },
    { id: 'chain', label: 'Chain' },
  ],
};

export const DEFAULT_CONFIG = Object.freeze({
  v: 1,
  skin: '#161b28',
  finish: 'gloss',
  eyeColor: '#3b8fe8',
  eyes: 'normal',
  antenna: 'elbow',
  mandible: 'none',
  mouth: 'smile',
  hair: 'none',
  hairColor: '#8a4b24',
  hat: 'none',
  eyewear: 'none',
  earring: 'none',
  neck: 'none',
});

const HEX = /^#[0-9a-f]{6}$/i;
const ENUM_KEYS = ['antenna', 'mandible', 'mouth', 'eyes', 'hair', 'hat', 'eyewear', 'earring', 'neck'];

/** Fill defaults and drop anything unknown, so stored configs never break rendering. */
export function normalizeConfig(input = {}) {
  const c = { ...DEFAULT_CONFIG };
  if (!input || typeof input !== 'object') return c;
  for (const k of ['skin', 'eyeColor', 'hairColor']) {
    if (typeof input[k] === 'string' && HEX.test(input[k])) c[k] = input[k].toLowerCase();
  }
  if (FINISHES.some((f) => f.id === input.finish)) c.finish = input.finish;
  for (const k of ENUM_KEYS) {
    if (OPTIONS[k].some((o) => o.id === input[k])) c[k] = input[k];
  }
  return c;
}

/* ── Compact encoding: "1.161b28.0.3b8fe8.0.0.0.0.0.8a4b24.0.0.0.0" → base64url ── */
const ORDER = ['skin', 'finish', 'eyeColor', 'eyes', 'antenna', 'mandible', 'mouth', 'hair', 'hairColor', 'hat', 'eyewear', 'earring', 'neck'];

export function encodeConfig(config) {
  const c = normalizeConfig(config);
  const parts = ORDER.map((k) => {
    if (k === 'skin' || k === 'eyeColor' || k === 'hairColor') return c[k].slice(1);
    const list = k === 'finish' ? FINISHES : OPTIONS[k];
    return list.findIndex((o) => o.id === c[k]).toString(36);
  });
  return 'a1' + parts.join('');
}

export function decodeConfig(str) {
  if (typeof str !== 'string' || !str.startsWith('a1')) return normalizeConfig();
  let i = 2;
  const out = {};
  try {
    for (const k of ORDER) {
      if (k === 'skin' || k === 'eyeColor' || k === 'hairColor') {
        out[k] = '#' + str.slice(i, i + 6); i += 6;
      } else {
        const list = k === 'finish' ? FINISHES : OPTIONS[k];
        const o = list[parseInt(str[i], 36)];
        if (o) out[k] = o.id;
        i += 1;
      }
    }
  } catch { /* fall through to defaults */ }
  return normalizeConfig(out);
}

/** Parse whatever an app hands us: object, JSON string or compact code. */
export function parseConfig(value) {
  if (!value) return normalizeConfig();
  if (typeof value === 'object') return normalizeConfig(value);
  const s = String(value).trim();
  if (s.startsWith('{')) {
    try { return normalizeConfig(JSON.parse(s)); } catch { return normalizeConfig(); }
  }
  return decodeConfig(s);
}

/** A few ready-made looks (used for demo friends + "shuffle"). */
export const PRESETS = [
  { name: 'Classic', config: { ...DEFAULT_CONFIG } },
  { name: 'Nerd', config: { ...DEFAULT_CONFIG, hat: 'propeller', eyewear: 'round', earring: 'stud', mouth: 'smile' } },
  { name: 'Royal', config: { ...DEFAULT_CONFIG, skin: '#c58a1d', finish: 'pearl', hat: 'crown', eyeColor: '#8b5cf6', neck: 'chain', mouth: 'smirk' } },
  { name: 'Cozy', config: { ...DEFAULT_CONFIG, skin: '#8a1628', hat: 'beanie', neck: 'scarf', eyes: 'happy', mouth: 'grin', eyeColor: '#7a4a24' } },
  { name: 'DJ', config: { ...DEFAULT_CONFIG, skin: '#7c5cc4', hat: 'headphones', eyewear: 'shades', hair: 'mohawk', hairColor: '#f472b6', mouth: 'tongue' } },
  { name: 'Sweet', config: { ...DEFAULT_CONFIG, skin: '#d0607f', hair: 'buns', hairColor: '#8a4b24', hat: 'bow', eyewear: 'heart', mouth: 'cat', antenna: 'curly', mandible: 'nubs' } },
  { name: 'Mint', config: { ...DEFAULT_CONFIG, skin: '#0f766e', finish: 'satin', hair: 'swoop', hairColor: '#e2b65c', antenna: 'bobble', neck: 'bowtie', eyeColor: '#2f9e58' } },
  { name: 'Chrome', config: { ...DEFAULT_CONFIG, skin: '#e6e8ee', finish: 'chrome', mandible: 'pincers', antenna: 'curve', eyes: 'sleepy', mouth: 'o', hat: 'cap' } },
];

export function randomConfig(rng = Math.random) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return normalizeConfig({
    skin: pick(SKIN_COLORS).hex,
    finish: pick(FINISHES).id,
    eyeColor: pick(EYE_COLORS).hex,
    hairColor: pick(HAIR_COLORS).hex,
    ...Object.fromEntries(ENUM_KEYS.map((k) => [k, pick(OPTIONS[k]).id])),
  });
}
