import { loadSculpt } from './sculptCache.js';
import { OPTIONS } from './catalog.js';
import { ACCESSORY_SCULPTS } from './accessorySculpts.js';

/** Pre-sculpt every option in background workers so every tap is instant. */
let started = false;
export function warmAntmojiCache() {
  if (started) return;
  started = true;
  const keys = ['body'];
  for (const m of OPTIONS.mouth) keys.push(`head|${m.id}|none`);
  for (const m of OPTIONS.mandible) keys.push(`head|smile|${m.id}`);
  keys.push(...Object.keys(ACCESSORY_SCULPTS));
  // sequential chain keeps worker queues short so user-requested sculpts jump ahead
  keys.reduce((p, k) => p.then(() => loadSculpt(k)).catch(() => {}), new Promise((r) => setTimeout(r, 400)));
}
