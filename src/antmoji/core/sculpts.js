import { headSculpt } from './head.js';
import { bodySculpt } from './body.js';
import { ACCESSORY_SCULPTS } from './accessorySculpts.js';

/** key → typed-array mesh. Keys: 'body' | 'head|<mouth>|<mandible>' | 'hat|x' | 'hair|x' | 'neck|x' */
export function produceSculpt(key) {
  const [kind, a, b] = key.split('|');
  if (kind === 'body') return bodySculpt();
  if (kind === 'head') return headSculpt(a, b);
  const f = ACCESSORY_SCULPTS[key];
  if (!f) throw new Error('Unknown sculpt ' + key);
  return f();
}
