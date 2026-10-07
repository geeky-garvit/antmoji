/**
 * Antmoji SDK — 3D ant avatars for any app.
 *
 *   import { defineAntmojiElements } from 'antmoji';
 *   defineAntmojiElements();
 *   <ant-moji config="a1…" framing="bust"></ant-moji>
 *   <antmoji-editor config="a1…"></antmoji-editor>
 */
import { AntmojiAvatarElement } from './elements/AntmojiAvatar.js';
import { AntmojiEditorElement } from './elements/AntmojiEditor.js';
import { warmAntmojiCache } from './core/warm.js';

export { AntCharacter } from './core/AntCharacter.js';
export { AntmojiStage, FRAMINGS } from './core/Stage.js';
export { renderAntmojiImage, renderAntmojiBlob } from './core/snapshot.js';
export {
  DEFAULT_CONFIG, OPTIONS, SKIN_COLORS, EYE_COLORS, HAIR_COLORS, FINISHES, PRESETS,
  normalizeConfig, parseConfig, encodeConfig, decodeConfig, randomConfig,
} from './core/catalog.js';
export { AntmojiAvatarElement, AntmojiEditorElement, warmAntmojiCache };

export function defineAntmojiElements({ avatarTag = 'ant-moji', editorTag = 'antmoji-editor' } = {}) {
  if (!customElements.get(avatarTag)) customElements.define(avatarTag, AntmojiAvatarElement);
  if (!customElements.get(editorTag)) customElements.define(editorTag, AntmojiEditorElement);
}
