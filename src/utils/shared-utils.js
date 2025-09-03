// Shared utility functions for FilamentDB
// Now uses database instead of localStorage

const STORAGE_KEY = 'qrCodeEntries'; // For legacy compatibility

// Initialize database
let dbInitialized = false;
async function initDatabase() {
    if (dbInitialized) return;
    if (!window.FilamentDB) {
        // Import database module
        await import('./database.js');
    }
    await window.FilamentDB.init();
    dbInitialized = true;
}

// Get all entries (async now) and normalize field names for UI consumption
async function getStoredEntries() {
    await initDatabase();
    const rows = await window.FilamentDB.getFilaments();
    // Normalize DB rows (snake_case) to legacy UI shape (PascalCase)
    return (rows || []).map((r) => ({
        id: String(r.id ?? r.ID ?? Date.now().toString() + Math.random().toString(36).slice(2)),
        Manufacturer: r.Manufacturer ?? r.manufacturer ?? '',
        Material: r.Material ?? r.material ?? '',
        Color: r.Color ?? r.color ?? '',
        ColorHex: r.ColorHex ?? r.hex_color ?? '',
        Temp1: r.Temp1 ?? (r.temp1 != null ? String(r.temp1) : 'NA'),
        Temp2: r.Temp2 ?? (r.temp2 != null ? String(r.temp2) : 'NA'),
        spoolCount: r.spoolCount ?? r.spool_count ?? 1,
        remainingPercentage: r.remainingPercentage ?? r.remaining_percentage ?? 100,
        timestamp: r.timestamp ?? r.created_at ?? new Date().toISOString(),
        notes: r.notes ?? ''
    }));
}

// Add single entry (async now) 
async function addEntry(entry) {
    await initDatabase();
    return await window.FilamentDB.addFilament(entry);
}

// Update entry (new function)
async function updateEntry(id, changes) {
    await initDatabase();
    return await window.FilamentDB.updateFilament(id, changes);
}

// Delete entry (new function)
async function deleteEntry(id) {
    await initDatabase();
    return await window.FilamentDB.deleteFilament(id);
}

// Legacy saveToStorage for backward compatibility - deprecated, use addEntry/updateEntry instead
async function saveToStorage(entries) {
    console.warn('⚠️ saveToStorage is deprecated. Use addEntry/updateEntry/deleteEntry instead');
    await initDatabase();
    
    if (Array.isArray(entries)) {
        // Bulk operation - this should be avoided but handle gracefully
        console.error('❌ Bulk saveToStorage called - this can cause data duplication');
        // Don't actually save to prevent duplication
        return;
    } else {
        // Single entry
        await window.FilamentDB.addFilament(entries);
    }
}

// Color normalization function
function normalizeToHex(colorStr) {
    if (!colorStr) return '#000000';
    const s = ('' + colorStr).trim();
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(s)) {
        // Expand 3-digit hex to 6-digit
        if (s.length === 4) {
            const r = s[1], g = s[2], b = s[3];
            return ('#' + r + r + g + g + b + b).toUpperCase();
        }
        return s.toUpperCase();
    }
    const m = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m) {
        const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
        return ColorUtils.rgbToHex(r, g, b).toUpperCase();
    }
    // Fallback: try computing from name then convert if rgb
    const computed = ColorUtils.getColorHex(s);
    if (/^#/.test(computed)) return computed.toUpperCase();
    const m2 = computed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (m2) {
        const r = parseInt(m2[1], 10), g = parseInt(m2[2], 10), b = parseInt(m2[3], 10);
        return ColorUtils.rgbToHex(r, g, b).toUpperCase();
    }
    return '#000000';
}

// Simple color suggestions dialog
async function showColorSuggestionsDialog(suggestions, hex, options = {}) {
    const buttonText = options.cancelText || 'Cancel';
    const titleText = options.titleText || 'Current';
    
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='10000';
        const panel = document.createElement('div');
        panel.style.position='absolute'; panel.style.top='50%'; panel.style.left='50%'; panel.style.transform='translate(-50%, -50%)';
        panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.padding='16px'; panel.style.width='min(420px, 90vw)'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
        panel.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Suggestions from filamentcolors.xyz</div>
        <div style="font-size:12px;color:#666;margin-bottom:8px">${titleText} ${hex.toUpperCase()}</div>`;
        const list = document.createElement('div');
        list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px';
        suggestions.forEach(s => {
            const btn = document.createElement('button');
            const label = `${s.color_name}${s.manufacturer ? ' ('+s.manufacturer+')' : ''}`;
            btn.textContent = `${label} · ΔE ${s.distance}`;
            btn.dataset.label = label;
            btn.dataset.hex = s.hex_color || '';
            btn.style.padding='8px 10px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer'; btn.style.textAlign='left';
            btn.addEventListener('click', () => {
                cleanup();
                if (options.returnObject) {
                    resolve({ label: btn.dataset.label, hex: btn.dataset.hex });
                } else {
                    resolve(btn.textContent.split(' · ')[0]);
                }
            });
            list.appendChild(btn);
        });
        const cancel = document.createElement('button');
        cancel.textContent = buttonText;
        cancel.style.marginTop='12px'; cancel.style.padding='8px 10px'; cancel.style.border='1px solid #ddd'; cancel.style.borderRadius='8px'; cancel.style.cursor='pointer';
        cancel.addEventListener('click', ()=>{ cleanup(); resolve(null); });
        panel.appendChild(list); panel.appendChild(cancel); overlay.appendChild(panel); document.body.appendChild(overlay);
        function cleanup(){ try{ document.body.removeChild(overlay); } catch{} }
    });
}

// Manufacturer-aware suggestions dialog
async function showManufacturerSuggestionsDialog(hex, material, defaultMfr, options = {}) {
    if (!window.FCX) return null;
    const mfrs = await FCX.getManufacturers();
    const titleText = options.titleText || 'Current';
    
    return new Promise(async (resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='10000';
        const panel = document.createElement('div');
        panel.style.position='absolute'; panel.style.top='50%'; panel.style.left='50%'; panel.style.transform='translate(-50%, -50%)';
        panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.padding='16px'; panel.style.width='min(520px, 95vw)'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
        const title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Color suggestions (filamentcolors.xyz)';
        const sub = document.createElement('div'); sub.style.fontSize='12px'; sub.style.color='#666'; sub.style.marginBottom='8px'; sub.textContent=`${titleText} ${hex.toUpperCase()} · Material ${material||'any'}`;
        const select = document.createElement('select'); select.style.width='100%'; select.style.marginBottom='8px'; select.style.padding='8px'; select.style.border='1px solid #eee'; select.style.borderRadius='8px';
        const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='All manufacturers'; select.appendChild(optAll);
        mfrs.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; select.appendChild(o); });
        if (defaultMfr) select.value = defaultMfr;
        const list = document.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px'; list.style.maxHeight='50vh'; list.style.overflow='auto';
        const cancel = document.createElement('button'); cancel.textContent='Cancel'; cancel.style.marginTop='12px'; cancel.style.padding='8px 10px'; cancel.style.border='1px solid #ddd'; cancel.style.borderRadius='8px'; cancel.style.cursor='pointer';
        cancel.addEventListener('click', ()=>{ cleanup(); resolve(null); });
        panel.appendChild(title); panel.appendChild(sub); panel.appendChild(select); panel.appendChild(list); panel.appendChild(cancel); overlay.appendChild(panel); document.body.appendChild(overlay);

        async function reload() {
            list.innerHTML='Loading…';
            if (options.checkSnapshot && window.FCX && typeof FCX.getSnapshotStatus === 'function') {
                await FCX.getSnapshotStatus();
                await new Promise(r=>setTimeout(r,100));
            }
            let sugg = await FCX.listSuggestions(hex, material, select.value || null, 5);
            list.innerHTML='';
            if (!sugg || !sugg.length) {
                if ((select.value||'') && options.allowFallback) {
                    const all = await FCX.listSuggestions(hex, material, null, 5);
                    if (all && all.length) {
                        const hint=document.createElement('div'); hint.style.color='#666'; hint.style.marginBottom='6px'; hint.textContent='No matches for this manufacturer. Show results from all manufacturers?';
                        const btn=document.createElement('button'); btn.textContent='Show All'; btn.style.marginLeft='8px'; btn.style.padding='4px 8px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer';
                        btn.addEventListener('click', ()=>{ select.value=''; reload(); });
                        const wrap=document.createElement('div'); wrap.appendChild(hint); wrap.appendChild(btn); list.appendChild(wrap); return;
                    }
                }
                if (options.checkSnapshot) {
                    try { 
                        const st = await FCX.getSnapshotStatus(); 
                        if (!st.loaded || st.loaded.length===0) { 
                            const msg=document.createElement('div'); 
                            msg.style.color='#666'; 
                            msg.innerHTML='No local color snapshots found. Build them in Settings → Color Suggestions.'; 
                            const a=document.createElement('a'); 
                            a.textContent='Open Settings'; 
                            a.href='settings.html'; 
                            a.className='refine-color'; 
                            const wrap=document.createElement('div'); 
                            wrap.appendChild(msg); 
                            wrap.appendChild(a); 
                            list.appendChild(wrap); 
                            return; 
                        } 
                    } catch {}
                }
                const none=document.createElement('div'); none.textContent='No suggestions.'; none.style.color='#666'; list.appendChild(none); return;
            }
            sugg.forEach(s => {
                const btn = document.createElement('button');
                const label = `${s.color_name}${s.manufacturer ? ' ('+s.manufacturer+')' : ''}`;
                btn.textContent = `${label} · ΔE ${s.distance ?? ''}`;
                btn.style.padding='8px 10px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer'; btn.style.textAlign='left';
                btn.addEventListener('click', ()=>{ cleanup(); resolve({ label: label, hex: s.hex_color || '' }); });
                list.appendChild(btn);
            });
        }
        select.addEventListener('change', reload);
        reload();
        function cleanup(){ try{ document.body.removeChild(overlay); } catch{} }
    });
}

// Error display utilities
function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function hideError() {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Cloud storage initialization
function initializeCloudStorage() {
    if (typeof CloudStorage !== 'undefined' && CloudStorage.isEnabled()) {
        CloudStorage.sync();
        CloudStorage.onDataChange(() => location.reload());
    }
}

// Export shared utilities
window.SharedUtils = {
    STORAGE_KEY,
    getStoredEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    saveToStorage, // Legacy compatibility
    normalizeToHex,
    showColorSuggestionsDialog,
    showManufacturerSuggestionsDialog,
    showError,
    hideError,
    initializeCloudStorage,
    initDatabase
};
