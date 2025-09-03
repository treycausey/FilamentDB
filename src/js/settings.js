// Settings Page Logic
(function() {
  const STORAGE_KEY = 'qrCodeEntries';

  // Initialize cloud storage instance
  let cs = null;
  document.addEventListener('DOMContentLoaded', () => {
    // Apply saved accent on load so the page reflects current theme
    if (window.Theme && typeof Theme.applyAccentFromStorage === 'function') {
      Theme.applyAccentFromStorage();
    }
    if (typeof CloudStorage !== 'undefined') {
      window.cloudStorage = new CloudStorage();
      cs = window.cloudStorage;
    }
    bindUI();
    refreshStatus();
  });

  function $(id) { return document.getElementById(id); }

  function bindUI() {
    $('syncNowBtn').addEventListener('click', async () => {
      if (!ensureReadyOrGuide()) return;
      await syncNow();
    });

    $('showSharingBtn').addEventListener('click', () => {
      if (!ensureReadyOrGuide()) return;
      showSharingInfo(cs.apiKey, cs.binId);
    });

    $('setupNewBtn').addEventListener('click', setupNewStorage);
    $('connectExistingBtn').addEventListener('click', setupExistingStorage);
    $('resetSyncBtn').addEventListener('click', resetCloudSync);

    $('enableCloudToggle').addEventListener('change', (e) => {
      if (!cs) return;
      if (!cs.binId || !cs.apiKey) {
        e.target.checked = false;
        alert('Cloud storage not configured yet. Use Setup first.');
        return;
      }
      cs.isEnabled = e.target.checked;
      cs.saveSettings();
      refreshStatus();
    });

    $('exportJsonBtn').addEventListener('click', exportJson);
    $('exportCsvBtn').addEventListener('click', exportCsv);
    $('clearAllBtn').addEventListener('click', clearAllInventory);

    // Snapshot controls
    const offlineOnlyToggle = document.getElementById('offlineOnlyToggle');
    const rebuildBtn = document.getElementById('rebuildSnapshotBtn');
    const clearSnapBtn = document.getElementById('clearSnapshotBtn');
    if (offlineOnlyToggle) {
      offlineOnlyToggle.checked = (localStorage.getItem('fcx_offline_only') || 'true') === 'true';
      offlineOnlyToggle.addEventListener('change', () => {
        localStorage.setItem('fcx_offline_only', offlineOnlyToggle.checked ? 'true' : 'false');
        updateSnapshotStatus();
      });
    }
    if (rebuildBtn) rebuildBtn.addEventListener('click', rebuildSnapshots);
    if (clearSnapBtn) clearSnapBtn.addEventListener('click', clearSnapshots);

    // Accent controls
    const picker = document.getElementById('accentPicker');
    const applyBtn = document.getElementById('applyAccentBtn');
    const resetBtn = document.getElementById('resetAccentBtn');
    if (picker && window.getComputedStyle) {
      // Initialize picker from current CSS variable
      const current = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#FF6B35';
      picker.value = rgbToHexIfNeeded(current);
    }
    if (applyBtn && picker) {
      applyBtn.addEventListener('click', () => {
        if (window.Theme) Theme.setAccentColor(picker.value);
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (window.Theme) Theme.setAccentColor('#FF6B35');
        if (picker) picker.value = '#FF6B35';
      });
    }
    document.querySelectorAll('.preset-accent').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hex;
        if (picker) picker.value = hex;
        if (window.Theme) Theme.setAccentColor(hex);
      });
    });
  }

  function rgbToHexIfNeeded(v){
    const s = (''+v).trim();
    if (s.startsWith('#')) return s.toUpperCase();
    const m = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (!m) return '#FF6B35';
    const r = parseInt(m[1],10), g=parseInt(m[2],10), b=parseInt(m[3],10);
    const to=(n)=>n.toString(16).padStart(2,'0');
    return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  }

  function refreshStatus() {
    if (!cs) return;
    const status = cs.getStatus();
    const configured = !!status.configured;
    const enabled = !!status.enabled;

    $('cloudStatusText').textContent = configured
      ? (enabled ? 'Cloud Sync is enabled and configured.' : 'Cloud Sync configured but disabled.')
      : 'Cloud Sync not configured.';

    const confPill = $('cloudConfiguredPill');
    confPill.textContent = configured ? 'Configured' : 'Not Configured';
    confPill.className = 'status-pill ' + (configured ? 'ok' : 'warn');

    const enPill = $('cloudEnabledPill');
    enPill.textContent = enabled ? 'Enabled' : 'Disabled';
    enPill.className = 'status-pill ' + (enabled ? 'ok' : 'warn');

    $('enableCloudToggle').checked = enabled;
    updateSnapshotStatus();
  }

  async function updateSnapshotStatus() {
    const statusEl = document.getElementById('snapshotStatus');
    if (!statusEl) return;
    try {
      const list = JSON.parse(localStorage.getItem('fcx_snapshot_types') || '[]');
      statusEl.textContent = `Status: ${list.length ? 'Loaded ' + list.join(', ') : 'No local snapshots'}`;
    } catch {
      statusEl.textContent = 'Status: Unknown';
    }
  }

  async function rebuildSnapshots() {
    const ok = confirm('This will fetch the latest color data from filamentcolors.xyz and store snapshots locally for offline suggestions. Continue?');
    if (!ok) return;
    const btn = document.getElementById('rebuildSnapshotBtn');
    btn.disabled = true; btn.textContent = 'Building…';
    try {
      const endpoint = 'https://filamentcolors.xyz/api';
      async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error('Network'); return r.json(); }
      let url = `${endpoint}/swatch/?page=1`; const all=[];
      while (url) {
        const page = await fetchJSON(url);
        const results = page.results || page;
        for (const s of results) {
          all.push({
            id: s.id,
            hex: (s.hex_color||'').replace('#','').toLowerCase(),
            name: s.color_name,
            mfr: s.manufacturer?.name || null,
            type: (s.filament_type?.parent_type?.name || s.filament_type?.name || '').toUpperCase()
          });
        }
        url = page.next || null;
        if (url && !url.startsWith('http')) url = endpoint.replace(/\/$/, '') + url;
        $('snapshotStatus').textContent = `Fetched ${all.length}…`;
      }
      const groups = { ALL: all };
      ['PLA','PETG','ABS','TPU'].forEach(t => { groups[t] = all.filter(x => (x.type||'').includes(t)); });
      // Store in localStorage and inject into worker
      const loaded = [];
      for (const [key, arr] of Object.entries(groups)) {
        localStorage.setItem('fcx_snapshot_' + key, JSON.stringify(arr));
        loaded.push(key);
        // Push into worker
        if (window.Worker) {
          try {
            const w = new Worker('workers/match-worker.js');
            // notify then terminate
            const id = Math.random().toString(36).slice(2);
            w.postMessage({ type: 'setSnapshot', id, snapshotType: key, snapshotData: arr });
            setTimeout(()=> w.terminate(), 200);
          } catch {}
        }
      }
      localStorage.setItem('fcx_snapshot_types', JSON.stringify(loaded));
      $('snapshotStatus').textContent = `Status: Loaded ${loaded.join(', ')}`;
      alert('Snapshots rebuilt successfully.');
    } catch (e) {
      alert('Failed to rebuild snapshots.');
    } finally {
      btn.disabled = false; btn.textContent = 'Rebuild Snapshots (Fetch)';
    }
  }

  function clearSnapshots() {
    ['ALL','PLA','PETG','ABS','TPU'].forEach(k => localStorage.removeItem('fcx_snapshot_' + k));
    localStorage.removeItem('fcx_snapshot_types');
    updateSnapshotStatus();
    alert('Local snapshots cleared.');
  }

  function ensureReadyOrGuide() {
    if (!cs) return false;
    if (!cs.isReady()) {
      alert('Cloud storage not configured yet. Use Setup to configure.');
      return false;
    }
    return true;
  }

  async function syncNow() {
    try {
      $('syncNowBtn').disabled = true;
      $('syncNowBtn').textContent = 'Syncing...';
      const result = await cs.syncData();
      if (!result.success) throw new Error(result.message);
      alert(`✅ Sync successful!\n\nLocal: ${result.localCount}\nCloud: ${result.cloudCount}\nTotal: ${result.mergedCount}`);
    } catch (e) {
      alert('❌ Sync failed: ' + e.message);
    } finally {
      $('syncNowBtn').disabled = false;
      $('syncNowBtn').textContent = 'Sync Now';
    }
  }

  async function setupNewStorage() {
    const apiKey = prompt('Enter your JSONBin.io API Key:');
    if (!apiKey) return;
    try {
      await cs.setup(apiKey.trim(), null);
      await syncNow();
      refreshStatus();
      const storageId = cs.binId;
      alert(`✅ Setup complete.\n\nShare code for other devices:\n${apiKey}|${storageId}`);
    } catch (e) {
      alert('❌ Setup failed: ' + e.message);
    }
  }

  async function setupExistingStorage() {
    const input = prompt('Enter sharing code (API_KEY|STORAGE_ID):');
    if (!input) return;
    const parts = input.split('|');
    if (parts.length !== 2) { alert('Invalid format. Use API_KEY|STORAGE_ID'); return; }
    const apiKey = parts[0].trim();
    const binId = parts[1].trim();
    try {
      await cs.setup(apiKey, binId);
      await syncNow();
      refreshStatus();
      alert('✅ Connected to existing storage.');
    } catch (e) {
      alert('❌ Setup failed: ' + e.message);
    }
  }

  function showSharingInfo(apiKey, storageId) {
    if (!apiKey || !storageId) {
      alert('❌ Storage info not available. Sync or setup first.');
      return;
    }
    const sharingCode = `${apiKey}|${storageId}`;
    const textarea = document.createElement('textarea');
    textarea.value = sharingCode;
    textarea.style.position = 'fixed';
    textarea.style.top = '50%';
    textarea.style.left = '50%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.width = '80%';
    textarea.style.height = '100px';
    textarea.style.zIndex = '10000';
    textarea.style.fontSize = '12px';
    textarea.style.fontFamily = 'monospace';
    // Use current accent color for border
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#FF6B35';
    textarea.style.border = `2px solid ${accent}`;
    textarea.style.padding = '10px';
    textarea.style.borderRadius = '8px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.focus();
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = 'calc(50% + 60px)';
    closeBtn.style.left = '50%';
    closeBtn.style.transform = 'translateX(-50%)';
    closeBtn.style.zIndex = '10001';
    closeBtn.style.background = accent;
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.padding = '10px 20px';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '14px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.onclick = () => {
      document.body.removeChild(textarea);
      document.body.removeChild(closeBtn);
    };
    document.body.appendChild(closeBtn);
    alert('Sharing code is selected. Copy it (Ctrl/Cmd+C).');
  }

  function resetCloudSync() {
    if (!cs) return;
    const ok = confirm('Reset Cloud Sync? This removes API key and Storage ID from this device (inventory not deleted).');
    if (!ok) return;
    cs.apiKey = null;
    cs.binId = null;
    cs.disable();
    cs.saveSettings();
    refreshStatus();
    alert('Cloud sync settings cleared on this device.');
  }

  function exportJson() {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filament_inventory_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const headers = ['Manufacturer','Material','Color','Temp1','Temp2','Date'];
    const rows = entries.map(e => [e.Manufacturer,e.Material,e.Color,e.Temp1,e.Temp2,new Date(e.timestamp).toISOString()].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filament_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function clearAllInventory() {
    const ok = confirm('Delete all inventory items on this device? This cannot be undone.');
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    alert('All local inventory entries deleted.');
  }
})();
