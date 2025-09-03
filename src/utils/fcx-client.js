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

  async function maybeInvalidateCache() { /* offline-only: no remote versioning */ }

  async function bulkColorMatch(hexes, materials) {
    // hexes: array of #RRGGBB; materials optional array of strings
    const colors = hexes.map(h => h.replace('#','%23')).join(',');
    const mat = materials && materials.length ? `&materials=${encodeURIComponent(materials.join(','))}` : '';
    const url = `${ENDPOINT}/swatch/bulk_colormatch/?colors=${colors}${mat}`;
    return fetchJSON(url);
  }

  // Local helpers for manufacturer-specific matching
  function h2d(h){return parseInt(h,16);} 
  function hexToRgb(hex){ hex=hex.replace('#','').toLowerCase(); return [h2d(hex.slice(0,2)),h2d(hex.slice(2,4)),h2d(hex.slice(4,6))]; }
  function pivotRgb(u){ u/=255; return u<=0.04045? u/12.92 : Math.pow((u+0.055)/1.055, 2.4);} 
  function rgbToXyz([r,g,b]){ r=pivotRgb(r); g=pivotRgb(g); b=pivotRgb(b); return [ (r*0.4124+g*0.3576+b*0.1805)*100, (r*0.2126+g*0.7152+b*0.0722)*100, (r*0.0193+g*0.1192+b*0.9505)*100 ]; }
  function pivotLab(t){return t>Math.pow(6/29,3)? Math.cbrt(t) : (t/(3*Math.pow(6/29,2))) + 4/29;}
  function xyzToLab([x,y,z]){ const xr=x/95.047, yr=y/100.0, zr=z/108.883; const fx=pivotLab(xr), fy=pivotLab(yr), fz=pivotLab(zr); return [(116*fy)-16, 500*(fx-fy), 200*(fy-fz)]; }
  function hexToLab(hex){ return xyzToLab(rgbToXyz(hexToRgb(hex))); }
  function deg2rad(d){return d*(Math.PI/180);} function rad2deg(r){return r*(180/Math.PI);} 
  function deltaE00(lab1, lab2){
    const [L1,a1,b1]=lab1, [L2,a2,b2]=lab2; const avgLp=(L1+L2)/2;
    const C1=Math.sqrt(a1*a1+b1*b1), C2=Math.sqrt(a2*a2+b2*b2);
    const avgC=(C1+C2)/2; const G=0.5*(1-Math.sqrt(Math.pow(avgC,7)/(Math.pow(avgC,7)+Math.pow(25,7))));
    const a1p=(1+G)*a1, a2p=(1+G)*a2; const C1p=Math.sqrt(a1p*a1p+b1*b1), C2p=Math.sqrt(a2p*a2p+b2*b2);
    const avgCp=(C1p+C2p)/2; let h1p=Math.atan2(b1,a1p); if(h1p<0) h1p+=2*Math.PI; let h2p=Math.atan2(b2,a2p); if(h2p<0) h2p+=2*Math.PI;
    const avgHp= Math.abs(h1p-h2p) > Math.PI ? (h1p+h2p+2*Math.PI)/2 : (h1p+h2p)/2;
    const T = 1 - 0.17*Math.cos(avgHp - deg2rad(30)) + 0.24*Math.cos(2*avgHp) + 0.32*Math.cos(3*avgHp + deg2rad(6)) - 0.20*Math.cos(4*avgHp - deg2rad(63));
    let dhp = h2p - h1p; if (Math.abs(dhp) > Math.PI) dhp -= Math.sign(dhp)*2*Math.PI;
    const dLp=L2-L1, dCp=C2p-C1p, dHp=2*Math.sqrt(C1p*C2p)*Math.sin(dhp/2);
    const SL=1+((0.015*Math.pow(avgLp-50,2))/Math.sqrt(20+Math.pow(avgLp-50,2))); const SC=1+0.045*avgCp; const SH=1+0.015*avgCp*T;
    const dTheta=deg2rad(30)*Math.exp(-Math.pow((rad2deg(avgHp)-275)/25,2)); const RC=2*Math.sqrt(Math.pow(avgCp,7)/(Math.pow(avgCp,7)+Math.pow(25,7)));
    const RT=-RC*Math.sin(2*dTheta); const KL=1, KC=1, KH=1;
    const dE=Math.sqrt(Math.pow(dLp/(SL*KL),2)+Math.pow(dCp/(SC*KC),2)+Math.pow(dHp/(SH*KH),2)+RT*(dCp/(SC*KC))*(dHp/(SH*KH)));
    return dE;
  }

  async function fetchManufacturerAndMatch(hex, manufacturer, material) {
    const labT = hexToLab(hex);
    let url = `${ENDPOINT}/swatch/?manufacturer__name__icontains=${encodeURIComponent(manufacturer)}`;
    if (material) url += `&filament_type__parent_type__name=${encodeURIComponent(material)}`;
    let best = null;
    while (url) {
      const page = await fetchJSON(url);
      const results = page.results || page;
      for (const s of results) {
        const d = deltaE00(labT, hexToLab(s.hex_color));
        if (!best || d < best.d) {
          best = { d, swatch: s };
        }
      }
      url = page.next || null;
      if (url && !url.startsWith('http')) { url = ENDPOINT.replace(/\/$/, '') + url; }
    }
    if (best) {
      const swatch = best.swatch;
      return {
        color_name: swatch.color_name,
        manufacturer: swatch.manufacturer?.name,
        hex_color: swatch.hex_color,
        filament_type: swatch.filament_type?.parent_type?.name || swatch.filament_type?.name,
        td: swatch.td,
        url: swatch.url || null,
        distance: Math.round(best.d*100)/100,
      };
    }
    return null;
  }

  async function getBestMatch(hex, material, manufacturer) {
    await maybeInvalidateCache();
    const key = buildKey(hex, material);
    const cached = cacheGet(key);
    if (cached) return cached;

    try {
      const w = await startWorker();
      if (!w) return null;
      const arr = await new Promise((resolve) => {
        const id = Math.random().toString(36).slice(2);
        function onMsg(ev){ if (ev.data && ev.data.id === id) { worker.removeEventListener('message', onMsg); resolve(ev.data.result || []); } }
        worker.addEventListener('message', onMsg);
        worker.postMessage({ type: 'match', id, hex, material: material || null, manufacturer: manufacturer || null, top: 1 });
        setTimeout(()=>{ worker.removeEventListener('message', onMsg); resolve([]); }, 1500);
      });
      const result = Array.isArray(arr) ? arr[0] : null;
      if (result) { cacheSet(key, result); return result; }
    } catch (e) {
      // ignore network errors
    }
    return null;
  }

  // Optional: worker fallback (for future offline snapshots)
  let worker = null;
  
  async function ensureSnapshots() {
    try {
      const types = JSON.parse(localStorage.getItem('fcx_snapshot_types') || '[]');
      if (!types || types.length === 0) {
        // Try to fetch default snapshots
        try {
          const response = await fetch('/assets/fcx-snapshot/all.json');
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('fcx_snapshot_types', JSON.stringify(['ALL']));
            localStorage.setItem('fcx_snapshot_ALL', JSON.stringify(data));
            return true;
          }
        } catch {}
      }
      return types && types.length > 0;
    } catch {
      return false;
    }
  }
  
  async function injectSnapshotsIntoWorker() {
    try {
      // Ensure snapshots exist first
      await ensureSnapshots();
      
      const types = JSON.parse(localStorage.getItem('fcx_snapshot_types') || '[]');
      types.forEach(t => {
        const data = JSON.parse(localStorage.getItem('fcx_snapshot_' + t) || '[]');
        if (Array.isArray(data) && data.length) {
          const id = Math.random().toString(36).slice(2);
          worker.postMessage({ type: 'setSnapshot', id, snapshotType: t, snapshotData: data });
        }
      });
    } catch {}
  }

  async function startWorker() {
    if (!global.Worker) return null;
    if (worker) return worker;
    try {
      worker = new Worker('workers/match-worker.js');
      // Bootstrap worker with any snapshots stored in localStorage
      await injectSnapshotsIntoWorker();
      return worker;
    } catch { return null; }
  }

  async function getSnapshotStatus() {
    const w = await startWorker(); if (!w) return { loaded: [] };
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      async function onMsg(ev){
        if (ev.data && ev.data.id === id) {
          worker.removeEventListener('message', onMsg);
          const res = ev.data.result || { loaded: [] };
          if (!res.loaded || !res.loaded.length) {
            // attempt a second try by injecting snapshots now
            await injectSnapshotsIntoWorker();
            // ask again quickly
            const id2 = Math.random().toString(36).slice(2);
            function onMsg2(ev2){ if (ev2.data && ev2.data.id === id2) { worker.removeEventListener('message', onMsg2); resolve(ev2.data.result || {loaded: []}); } }
            worker.addEventListener('message', onMsg2);
            worker.postMessage({ type: 'getStatus', id: id2 });
          } else {
            resolve(res);
          }
        }
      }
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'getStatus', id });
      setTimeout(()=>{ worker.removeEventListener('message', onMsg); resolve({ loaded: [] }); }, 1000);
    });
  }

  async function suggestColor(hex, material, manufacturer) {
    // Try API first; if fails and worker exists, fall back
    const apiResult = await getBestMatch(hex, material, manufacturer);
    if (apiResult) return apiResult;
    const w = startWorker();
    if (!w) return null;
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      function onMsg(ev) { if (ev.data && ev.data.id === id) { worker.removeEventListener('message', onMsg); resolve(ev.data.result || null); } }
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'match', id, hex, material: material || null, manufacturer: manufacturer || null, top: 3 });
      setTimeout(() => { worker.removeEventListener('message', onMsg); resolve(null); }, 2000);
    });
  }

  // Manufacturers list (cached) and multi suggestions for UI
  const MFR_CACHE_KEY = 'fcx_mfrs_v1';
  async function getManufacturers(material) {
    const cached = readLS(MFR_CACHE_KEY, null);
    if (cached && cached.ts && (now() - cached.ts < 1000*60*60*24*7) && cached.list) return cached.list;
    const w = startWorker();
    if (!w) return [];
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      function onMsg(ev){ if (ev.data && ev.data.id === id) { worker.removeEventListener('message', onMsg); const list=(ev.data.result||[]); writeLS(MFR_CACHE_KEY,{ts:now(),list}); resolve(list); } }
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'manufacturers', id, material: material || null });
      setTimeout(()=>{ worker.removeEventListener('message', onMsg); resolve([]); }, 1500);
    });
  }

  async function listSuggestions(hex, material, manufacturer, top = 5) {
    const w = startWorker();
    if (!w) return [];
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      function onMsg(ev){ if (ev.data && ev.data.id === id) { worker.removeEventListener('message', onMsg); resolve(ev.data.result || []); } }
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'match', id, hex, material: material || null, manufacturer: manufacturer || null, top });
      setTimeout(()=>{ worker.removeEventListener('message', onMsg); resolve([]); }, 1500);
    });
  }

  // Text search by color name (optionally filter by manufacturer and material)
  async function searchByText(query, manufacturer, material, limit = 10) {
    if (!query || !query.trim()) return [];
    const w = startWorker();
    if (!w) return [];
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      function onMsg(ev){ if (ev.data && ev.data.id === id) { worker.removeEventListener('message', onMsg); resolve(ev.data.result || []); } }
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'search', id, query: query.trim(), material: material || null, manufacturer: manufacturer || null, limit });
      setTimeout(()=>{ worker.removeEventListener('message', onMsg); resolve([]); }, 1500);
    });
  }

  global.FCX = { fetchVersion: async()=>({}), getBestMatch, suggestColor, listSuggestions, getManufacturers, searchByText, getSnapshotStatus };
})(window);
