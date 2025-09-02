// FilamentColors.xyz client with simple caching and optional worker fallback
// MIT-licensed upstream; please credit https://filamentcolors.xyz

(function (global) {
  const ENDPOINT = 'https://filamentcolors.xyz/api';
  const CACHE_KEY = 'fcx_cache_v1';
  const VERSION_KEY = 'fcx_version_v1';

  function now() { return Date.now(); }

  function readLS(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`FCX request failed ${res.status}`);
    return res.json();
  }

  async function fetchVersion() {
    const data = await fetchJSON(`${ENDPOINT}/version/`);
    const version = { db_version: data.db_version, db_last_modified: data.db_last_modified };
    writeLS(VERSION_KEY, version);
    return version;
  }

  function getCachedVersion() { return readLS(VERSION_KEY, null); }

  async function ensureFreshVersion() {
    try { return await fetchVersion(); } catch { return getCachedVersion(); }
  }

  function cacheGet(key) {
    const c = readLS(CACHE_KEY, {});
    return c[key];
  }
  function cacheSet(key, value) {
    const c = readLS(CACHE_KEY, {});
    c[key] = value; writeLS(CACHE_KEY, c);
  }
  function cacheClear() { writeLS(CACHE_KEY, {}); }

  function buildKey(hex, material) {
    return `${hex.toUpperCase()}__${(material || 'any').toUpperCase()}`;
  }

  async function maybeInvalidateCache() {
    const latest = await ensureFreshVersion();
    const stored = getCachedVersion();
    if (!stored || !latest) return; // nothing to do
    if (stored.db_last_modified !== latest.db_last_modified) {
      cacheClear();
    }
  }

  async function bulkColorMatch(hexes, materials) {
    // hexes: array of #RRGGBB; materials optional array of strings
    const colors = hexes.map(h => h.replace('#','%23')).join(',');
    const mat = materials && materials.length ? `&materials=${encodeURIComponent(materials.join(','))}` : '';
    const url = `${ENDPOINT}/swatch/bulk_colormatch/?colors=${colors}${mat}`;
    return fetchJSON(url);
  }

  async function getBestMatch(hex, material) {
    await maybeInvalidateCache();
    const key = buildKey(hex, material);
    const cached = cacheGet(key);
    if (cached) return cached;

    try {
      const data = await bulkColorMatch([hex], material ? [material] : undefined);
      const swatch = data[hex];
      if (swatch) {
        const result = {
          color_name: swatch.color_name,
          manufacturer: swatch.manufacturer?.name,
          hex_color: swatch.hex_color,
          filament_type: swatch.filament_type?.parent_type?.name || swatch.filament_type?.name,
          td: swatch.td,
          url: swatch.url || null,
        };
        cacheSet(key, result);
        return result;
      }
    } catch (e) {
      // ignore network errors
    }
    return null;
  }

  // Optional: worker fallback (for future offline snapshots)
  let worker = null;
  function startWorker() {
    if (worker || !global.Worker) return null;
    try {
      worker = new Worker('workers/match-worker.js');
      return worker;
    } catch { return null; }
  }

  async function suggestColor(hex, material) {
    // Try API first; if fails and worker exists, fall back
    const apiResult = await getBestMatch(hex, material);
    if (apiResult) return apiResult;
    const w = startWorker();
    if (!w) return null;
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      function onMsg(ev) {
        if (ev.data && ev.data.id === id) {
          worker.removeEventListener('message', onMsg);
          resolve(ev.data.result || null);
        }
      }
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'match', id, hex, material: material || null, top: 3 });
      setTimeout(() => { worker.removeEventListener('message', onMsg); resolve(null); }, 2000);
    });
  }

  global.FCX = { fetchVersion, getBestMatch, suggestColor };
})(window);
