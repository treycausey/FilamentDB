// Simple theme helper to manage app accent color
(function(){
  const DEFAULT = '#FF6B35';
  function clamp01(v){ return Math.min(1, Math.max(0, v)); }
  function hexToRgb(hex){
    if (!hex) return {r:255,g:107,b:53};
    let s = (''+hex).trim();
    if (s[0] !== '#') s = '#' + s;
    if (/^#([a-fA-F0-9]{3})$/.test(s)) {
      const r=s[1],g=s[2],b=s[3]; s = `#${r}${r}${g}${g}${b}${b}`;
    }
    const m = s.match(/^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/);
    if (!m) return {r:255,g:107,b:53};
    return { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) };
  }
  function rgbToHex(r,g,b){
    const to = (n)=> n.toString(16).padStart(2,'0');
    return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  }
  function lighten(hex, amt){
    const {r,g,b} = hexToRgb(hex);
    const f = clamp01(amt);
    return rgbToHex(
      Math.round(r + (255 - r)*f),
      Math.round(g + (255 - g)*f),
      Math.round(b + (255 - b)*f)
    );
  }
  function darken(hex, amt){
    const {r,g,b} = hexToRgb(hex);
    const f = clamp01(amt);
    return rgbToHex(
      Math.round(r*(1-f)),
      Math.round(g*(1-f)),
      Math.round(b*(1-f))
    );
  }

  function setAccentColor(hex){
    try {
      if (!hex) hex = DEFAULT;
      let c = hex.trim();
      if (c[0] !== '#') c = '#' + c;
      if (/^#([a-fA-F0-9]{3})$/.test(c)) {
        const r=c[1],g=c[2],b=c[3]; c = `#${r}${r}${g}${g}${b}${b}`;
      }
      if (!/^#([a-fA-F0-9]{6})$/.test(c)) c = DEFAULT;
      const root = document.documentElement;
      const dark = darken(c, 0.2);
      const light = lighten(c, 0.25);
      root.style.setProperty('--primary', c);
      root.style.setProperty('--primary-dark', dark);
      root.style.setProperty('--primary-light', light);
      root.style.setProperty('--accent', c);
      // Keep gradients in sync where they directly reference primary
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${c} 0%, var(--secondary) 100%)`);
      root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, var(--secondary) 0%, ${c} 100%)`);
      root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${c} 0%, ${light} 100%)`);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', c);
      try { localStorage.setItem('appAccentColor', c); } catch {}
      return c;
    } catch { return DEFAULT; }
  }

  function applyAccentFromStorage(){
    try {
      const saved = localStorage.getItem('appAccentColor');
      if (saved) setAccentColor(saved);
    } catch {}
  }

  window.Theme = { setAccentColor, applyAccentFromStorage };
})();

