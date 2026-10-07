import { produceSculpt } from './sculpts.js';

self.onmessage = ({ data: { id, key } }) => {
  try {
    const d = produceSculpt(key);
    const transfer = [d.position.buffer, d.normal.buffer, d.index.buffer];
    if (d.color) transfer.push(d.color.buffer);
    self.postMessage({ id, data: d }, transfer);
  } catch (e) {
    self.postMessage({ id, error: String(e) });
  }
};
