// Placeholder worker for offline/local snapshot matching.
// In the future, fetch a local JSON snapshot (e.g., `fcx-snapshot/pla.json`),
// compute closest by CIEDE2000. For now, just responds with null so the API
// path is the primary mechanism.

self.addEventListener('message', async (ev) => {
  const { type, id } = ev.data || {};
  if (type === 'match') {
    // TODO: implement local snapshot matching
    self.postMessage({ id, result: null });
  }
});

