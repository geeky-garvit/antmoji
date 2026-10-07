/**
 * Sculpts are meshed in a small Web Worker pool so the UI and animation never
 * hitch, even at high resolution. Falls back to the main thread if workers
 * are unavailable (e.g. strict CSP).
 */
import { geometryFromData } from './sdf.js';

const cache = new Map();
const pending = new Map();
let pool = null, rr = 0, seq = 0;
const waiters = new Map();

function getPool() {
  if (pool) return pool;
  pool = [];
  try {
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./sculpt.worker.js', import.meta.url), { type: 'module' });
      w.onmessage = ({ data }) => {
        const p = waiters.get(data.id);
        waiters.delete(data.id);
        if (data.error) p.reject(new Error(data.error)); else p.resolve(data.data);
      };
      w.onerror = () => { pool = []; };
      pool.push(w);
    }
  } catch { pool = []; }
  return pool;
}

async function computeOnMain(key) {
  const { produceSculpt } = await import('./sculpts.js');
  return produceSculpt(key);
}

function compute(key) {
  const workers = getPool();
  if (!workers.length) return computeOnMain(key);
  const id = ++seq;
  const w = workers[rr++ % workers.length];
  return new Promise((resolve, reject) => {
    waiters.set(id, { resolve, reject });
    w.postMessage({ id, key });
  }).catch(() => computeOnMain(key));
}

/** Cached geometry or null. */
export function getSculpt(key) { return cache.get(key) || null; }

/** Resolve once the sculpt for `key` is ready. */
export function loadSculpt(key) {
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (!pending.has(key)) {
    pending.set(key, compute(key).then((data) => {
      const g = geometryFromData(data);
      cache.set(key, g);
      pending.delete(key);
      return g;
    }));
  }
  return pending.get(key);
}
