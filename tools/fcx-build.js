#!/usr/bin/env node
// Build a local snapshot of filamentcolors.xyz swatches for offline matching.
// Usage: node tools/fcx-build.js [--endpoint=https://filamentcolors.xyz/api] [--out=fcx-snapshot]

const fs = require('fs');
const path = require('path');

const ENDPOINT = (process.argv.find(a => a.startsWith('--endpoint=')) || '').split('=')[1] || 'https://filamentcolors.xyz/api';
const OUTDIR = (process.argv.find(a => a.startsWith('--out=')) || '').split('=')[1] || path.join(process.cwd(), 'fcx-snapshot');

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function hexToRgb(hex) {
  hex = hex.replace('#','').trim();
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return [r,g,b];
}

// sRGB -> XYZ -> Lab
function pivotRgb(u){ u/=255; return u<=0.04045? u/12.92 : Math.pow((u+0.055)/1.055, 2.4);} 
function rgbToXyz([r,g,b]){
  r=pivotRgb(r); g=pivotRgb(g); b=pivotRgb(b);
  const x=r*0.4124+g*0.3576+b*0.1805;
  const y=r*0.2126+g*0.7152+b*0.0722;
  const z=r*0.0193+g*0.1192+b*0.9505;
  // D65 reference white scale to 100
  return [x*100,y*100,z*100];
}
function pivotLab(t){return t>Math.pow(6/29,3)? Math.cbrt(t) : (t/(3*Math.pow(6/29,2))) + 4/29;}
function xyzToLab([x,y,z]){
  // D65 reference white
  const xr=x/95.047, yr=y/100.000, zr=z/108.883;
  const fx=pivotLab(xr), fy=pivotLab(yr), fz=pivotLab(zr);
  const L=(116*fy)-16, a=500*(fx-fy), b=200*(fy-fz);
  return [L,a,b];
}
function hexToLab(hex){ return xyzToLab(rgbToXyz(hexToRgb(hex))); }

function round3(v){ return Math.round(v*1000)/1000; }

function normType(s){
  if(!s) return 'OTHER';
  s=String(s).toUpperCase();
  if(s.includes('PLA')) return 'PLA';
  if(s.includes('PETG')) return 'PETG';
  if(s.includes('ABS')) return 'ABS';
  if(s.includes('TPU')) return 'TPU';
  return s.split(' ')[0] || 'OTHER';
}

async function fetchAllSwatches(){
  const out=[];
  let url=`${ENDPOINT}/swatch/?page=1`;
  while(url){
    const page=await fetchJSON(url);
    const results=page.results||page; // handle if API returns array
    for(const s of results){
      const lab=hexToLab(s.hex_color);
      out.push({
        id: s.id,
        hex: s.hex_color.replace('#','').toLowerCase(),
        lab: lab.map(round3),
        name: s.color_name,
        mfr: s.manufacturer?.name || null,
        type: normType(s.filament_type?.parent_type?.name || s.filament_type?.name)
      });
    }
    url=page.next || null;
    if(url && !url.startsWith('http')) { url = ENDPOINT.replace(/\/$/, '') + url; }
    process.stdout.write(`\rFetched ${out.length} swatches...`);
  }
  console.log(`\nTotal swatches: ${out.length}`);
  return out;
}

async function main(){
  if(!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  const data=await fetchAllSwatches();
  // write all.json
  fs.writeFileSync(path.join(OUTDIR,'all.json'), JSON.stringify(data));
  // by type
  const groups={};
  for(const s of data){
    const t=s.type||'OTHER';
    if(!groups[t]) groups[t]=[];
    groups[t].push(s);
  }
  for(const t of Object.keys(groups)){
    fs.writeFileSync(path.join(OUTDIR, `${t.toLowerCase()}.json`), JSON.stringify(groups[t]));
  }
  console.log(`Snapshot written to ${OUTDIR}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

