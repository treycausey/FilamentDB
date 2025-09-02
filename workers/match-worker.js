// Offline/local snapshot matcher with CIEDE2000 distance
let cache = { material: null, items: null };
const localSnapshots = {}; // optional injected snapshots from main thread

function h2d(h){return parseInt(h,16);} 
function hexToRgb(hex){ hex=hex.replace('#','').toLowerCase(); return [h2d(hex.slice(0,2)),h2d(hex.slice(2,4)),h2d(hex.slice(4,6))]; }
function pivotRgb(u){ u/=255; return u<=0.04045? u/12.92 : Math.pow((u+0.055)/1.055, 2.4);} 
function rgbToXyz([r,g,b]){ r=pivotRgb(r); g=pivotRgb(g); b=pivotRgb(b); return [ (r*0.4124+g*0.3576+b*0.1805)*100, (r*0.2126+g*0.7152+b*0.0722)*100, (r*0.0193+g*0.1192+b*0.9505)*100 ]; }
function pivotLab(t){return t>Math.pow(6/29,3)? Math.cbrt(t) : (t/(3*Math.pow(6/29,2))) + 4/29;}
function xyzToLab([x,y,z]){ const xr=x/95.047, yr=y/100.0, zr=z/108.883; const fx=pivotLab(xr), fy=pivotLab(yr), fz=pivotLab(zr); return [(116*fy)-16, 500*(fx-fy), 200*(fy-fz)]; }
function hexToLab(hex){ return xyzToLab(rgbToXyz(hexToRgb(hex))); }

// CIEDE2000
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

async function loadSnapshot(material){
  if(cache.items && cache.material===material) return cache.items;
  const type = material ? String(material).toUpperCase() : 'ALL';
  if (localSnapshots[type]) { cache = { material: type, items: localSnapshots[type] }; return cache.items; }
  const file = type && ['PLA','PETG','ABS','TPU'].includes(type) ? `fcx-snapshot/${type.toLowerCase()}.json` : 'fcx-snapshot/all.json';
  try{
    const res = await fetch(file, { cache: 'force-cache' });
    if(!res.ok) throw new Error('no snapshot');
    const data = await res.json();
    cache = { material:type, items:data };
    return data;
  }catch{ return null; }
}

function toLab(hex){ return hexToLab(hex); }

function bestMatches(hex, items, top=3){
  const target = toLab(hex);
  const scored = [];
  for(const it of items){
    const d = deltaE00(target, it.lab || toLab('#'+it.hex));
    scored.push({ d, it });
  }
  scored.sort((a,b)=>a.d-b.d);
  return scored.slice(0, top).map(s=>({
    color_name: s.it.name,
    manufacturer: s.it.mfr,
    hex_color: '#'+s.it.hex,
    filament_type: s.it.type,
    distance: Math.round(s.d*100)/100
  }));
}

self.addEventListener('message', async (ev) => {
  const { type, id, hex, material, manufacturer, top, query, limit, snapshotType, snapshotData } = ev.data || {};
  if (type === 'match') {
    const items = await loadSnapshot(material);
    if(!items) return self.postMessage({ id, result: null });
    const filtered = manufacturer ? items.filter(it => (it.mfr||'').toLowerCase() === manufacturer.toLowerCase()) : items;
    const results = bestMatches(hex, filtered, top || 3);
    self.postMessage({ id, result: results });
  } else if (type === 'search') {
    const items = await loadSnapshot(material);
    if(!items) return self.postMessage({ id, result: [] });
    const q = (query || '').toLowerCase();
    let filtered = items;
    if (manufacturer) filtered = filtered.filter(it => (it.mfr||'').toLowerCase() === manufacturer.toLowerCase());
    if (q) filtered = filtered.filter(it => (it.name||'').toLowerCase().includes(q));
    const out = filtered.slice(0, limit || 10).map(it => ({
      color_name: it.name,
      manufacturer: it.mfr,
      hex_color: '#'+it.hex,
      filament_type: it.type
    }));
    self.postMessage({ id, result: out });
  } else if (type === 'manufacturers') {
    const items = await loadSnapshot(material);
    if(!items) return self.postMessage({ id, result: [] });
    const set = new Set();
    items.forEach(it => { if (it.mfr) set.add(it.mfr); });
    const list = Array.from(set).sort((a,b)=>a.localeCompare(b));
    self.postMessage({ id, result: list });
  } else if (type === 'setSnapshot') {
    // Set/replace a snapshot for a given type from the main thread
    if (snapshotType && Array.isArray(snapshotData)) {
      localSnapshots[snapshotType] = snapshotData;
      if (cache.material === snapshotType) { cache = { material: null, items: null }; }
    }
    self.postMessage({ id, result: true });
  } else if (type === 'getStatus') {
    self.postMessage({ id, result: { loaded: Object.keys(localSnapshots) } });
  }
});
