import { buildHead } from './head.js';
import { buildHat, buildHair, buildNeckwear, createAccessoryMaterials, WARMABLE } from './accessories.js';
import { OPTIONS } from './catalog.js';

/**
 * Pre-sculpt every option during idle time so the first tap on any option
 * in the editor is instant. Safe to call more than once.
 */
let started = false;
export function warmAntmojiCache() {
  if (started) return;
  started = true;
  const m = createAccessoryMaterials();
  const jobs = [];
  for (const mouth of OPTIONS.mouth) jobs.push(() => buildHead(mouth.id, 'none'));
  for (const mand of OPTIONS.mandible) jobs.push(() => buildHead('smile', mand.id));
  for (const h of WARMABLE.hat) jobs.push(() => buildHat(h, m));
  for (const h of WARMABLE.hair) jobs.push(() => buildHair(h, m));
  for (const n of WARMABLE.neck) jobs.push(() => buildNeckwear(n, m));
  const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 50));
  const step = (deadline) => {
    while (jobs.length && deadline.timeRemaining() > 6) jobs.shift()();
    if (jobs.length) idle(step, { timeout: 2000 });
  };
  idle(step, { timeout: 2000 });
}
