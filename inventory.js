// DOM Elements
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const entriesList = document.getElementById('entriesList');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');
const importFile = document.getElementById('importFile');
const clearAllButton = document.getElementById('clearAllButton');
const cloudSyncButton = document.getElementById('cloudSyncButton');
const cloudSyncText = document.getElementById('cloudSyncText');
const emptyState = document.getElementById('emptyState');
const filterTags = document.getElementById('filterTags');
// Filter selects (may not exist until DOM is ready)
let manufacturerFilter = null;
let materialFilter = null;
let colorFilter = null;

// Stats elements
const totalEntriesEl = document.getElementById('totalEntries');
const uniqueManufacturersEl = document.getElementById('uniqueManufacturers');
const uniqueMaterialsEl = document.getElementById('uniqueMaterials');
const uniqueColorsEl = document.getElementById('uniqueColors');

// State
let allEntries = [];
let filteredEntries = [];
let currentView = 'list';
let activeFilters = new Set();
let tableSortField = null;
let tableSortDirection = 'asc';
const STORAGE_KEY = 'qrCodeEntries';
let colorPickerInput = null;
let colorInputSupported = null;

// Cloud storage instance (use global window.cloudStorage for consistency)

// Event Listeners
searchInput.addEventListener('input', handleSearch);
sortSelect.addEventListener('change', handleSort);
exportButton.addEventListener('click', exportEntries);
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', handleImport);
clearAllButton.addEventListener('click', clearAllEntries);
cloudSyncButton.addEventListener('click', handleCloudSync);

// View toggle
document.querySelectorAll('.view-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget; // ensure button element
        document.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        currentView = target.dataset.view;
        entriesList.className = `entries-list ${currentView}-view`;
        displayEntries(filteredEntries);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Ensure elements exist before populating options
    initializeCloudStorage();
    setupColorPicker();
    manufacturerFilter = document.getElementById('manufacturerFilter');
    materialFilter = document.getElementById('materialFilter');
    colorFilter = document.getElementById('colorFilter');
    bindFilterSelects();
    loadSavedEntries();
});

// Storage functions
function getStoredEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const entries = stored ? JSON.parse(stored) : [];
    
    // Migrate existing entries to include spoolCount and remainingPercentage fields
    let needsMigration = false;
    entries.forEach(entry => {
        if (!entry.spoolCount) {
            entry.spoolCount = 1;
            needsMigration = true;
        }
        if (entry.remainingPercentage === undefined) {
            entry.remainingPercentage = 100;
            needsMigration = true;
        }
    });
    
    // Save migrated data back to storage
    if (needsMigration) {
        saveToStorage(entries);
    }
    
    return entries;
}

function saveToStorage(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadSavedEntries() {
    allEntries = getStoredEntries();
    filteredEntries = [...allEntries];
    
    updateStats();
    populateFilterOptions();
    
    if (searchInput.value) {
        handleSearch();
    } else {
        handleSort();
    }
}

function updateStats() {
    totalEntriesEl.textContent = allEntries.length;
    
    const manufacturers = new Set(allEntries.map(e => e.Manufacturer));
    uniqueManufacturersEl.textContent = manufacturers.size;
    
    const materials = new Set(allEntries.map(e => e.Material));
    uniqueMaterialsEl.textContent = materials.size;
    
    const colors = new Set(allEntries.map(e => e.Color));
    uniqueColorsEl.textContent = colors.size;
}

function displayEntries(entries) {
    if (entries.length === 0) {
        if (allEntries.length === 0) {
            entriesList.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            entriesList.classList.remove('hidden');
            emptyState.classList.add('hidden');
            entriesList.innerHTML = '<p class="no-entries">No entries match your search</p>';
        }
        return;
    }
    
    entriesList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    if (currentView === 'grid') {
        entriesList.innerHTML = entries.map(entry => `
            <div class="entry-card-grid" data-id="${entry.id}">
                <div class="entry-card-header">
                    <span class="manufacturer-badge">${entry.Manufacturer}</span>
                    <button class="delete-entry" data-id="${entry.id}">×</button>
                </div>
                <div class="entry-card-body">
                    <div class="material-color">
                        <strong>${entry.Material}</strong>
                        <span class="color-indicator ${entry.ColorHex ? 'fcx' : ''}" title="${entry.ColorHex ? 'HEX: ' + entry.ColorHex : ''}" style="background: ${getEntryHex(entry)}"></span>
                        <span>${entry.Color}</span>
                        <button class="refine-color" data-id="${entry.id}" title="Refine color">Refine</button>
                    </div>
                    <div class="temp-info">
                        <span class="temp">T1: ${entry.Temp1}°</span>
                        <span class="temp">T2: ${entry.Temp2}°</span>
                    </div>
                    <div class="spool-info">
                        <span class="spool-count editable edit-spool" title="Edit spools">🧵 ${entry.spoolCount || 1} spool${(entry.spoolCount || 1) > 1 ? 's' : ''}</span>
                        <span class="remaining-percentage remaining-${getRemainingCategory(entry.remainingPercentage || 100)}">${entry.remainingPercentage || 100}% left</span>
                    </div>
                </div>
                <div class="entry-card-footer">
                    <span class="entry-date">${new Date(entry.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    } else {
        entriesList.innerHTML = `
            <table class="entries-table">
                <thead>
                    <tr>
                        <th data-sort="manufacturer">Manufacturer</th>
                        <th data-sort="material">Material</th>
                        <th data-sort="color">Color</th>
                        <th data-sort="temp1">Temp1</th>
                        <th data-sort="temp2">Temp2</th>
                        <th data-sort="spools">Spools</th>
                        <th data-sort="remaining">Remaining</th>
                        <th data-sort="date">Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(entry => `
                        <tr data-id="${entry.id}">
                            <td>${entry.Manufacturer}</td>
                            <td>${entry.Material}</td>
                            <td>
                                <div class="color-cell">
                                    <span class="color-indicator ${entry.ColorHex ? 'fcx' : ''}" title="${entry.ColorHex ? 'HEX: ' + entry.ColorHex : ''}" style="background: ${getEntryHex(entry)}"></span>
                                    ${entry.Color}
                                    <button class="refine-color" data-id="${entry.id}" title="Refine color">Refine</button>
                                </div>
                            </td>
                            <td>${entry.Temp1}</td>
                            <td>${entry.Temp2}</td>
                            <td><span class="edit-spool spool-count editable" title="Edit spools">${entry.spoolCount || 1}</span></td>
                            <td class="remaining-${getRemainingCategory(entry.remainingPercentage || 100)}">${entry.remainingPercentage || 100}%</td>
                            <td>${new Date(entry.timestamp).toLocaleDateString()}</td>
                            <td>
                                <button class="delete-entry table-delete" data-id="${entry.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Add sorting listeners to table headers
        document.querySelectorAll('.entries-table th[data-sort]').forEach(th => {
            th.addEventListener('click', (e) => {
                const sortField = e.target.dataset.sort;
                handleTableSort(sortField, e.target);
            });
        });
    }
    
    // Add delete listeners
    document.querySelectorAll('.delete-entry').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEntry(e.target.dataset.id);
        });
    });
    
    // Add spool edit listeners (grid and list)
    document.querySelectorAll('.edit-spool').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = e.target.closest('[data-id]');
            const id = container?.dataset.id;
            if (id) openSpoolEditor(id);
        });
    });

    // Add color picker listeners on swatches
    document.querySelectorAll('.color-indicator').forEach(sw => {
        sw.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = e.target.closest('[data-id]');
            const row = e.target.closest('tr');
            const id = container?.dataset.id || row?.dataset.id;
            if (id) openColorSelectionFlow(id);
        });
    });
    
    // Add refine listeners
    document.querySelectorAll('.refine-color').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.closest('[data-id]')?.dataset.id;
            if (id) openColorSelectionFlow(id);
        });
    });
    
    // Add click listeners for filtering
    document.querySelectorAll('.manufacturer-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            addFilter('manufacturer', e.target.textContent);
        });
    });
}

function getColorHex(colorName) {
    // Use the enhanced color utility that supports 285+ colors
    return ColorUtils.getColorHex(colorName);
}

function getEntryHex(entry) {
    if (entry && entry.ColorHex) return entry.ColorHex;
    return getColorHex(entry?.Color || '#000000');
}

function getRemainingCategory(percentage) {
    if (percentage <= 10) return 'low';
    if (percentage <= 25) return 'medium';
    if (percentage <= 50) return 'good';
    return 'high';
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredEntries = [...allEntries];
    } else {
        filteredEntries = allEntries.filter(entry => {
            return (
                entry.Manufacturer.toLowerCase().includes(searchTerm) ||
                entry.Material.toLowerCase().includes(searchTerm) ||
                entry.Color.toLowerCase().includes(searchTerm) ||
                entry.Temp1.toLowerCase().includes(searchTerm) ||
                entry.Temp2.toLowerCase().includes(searchTerm)
            );
        });
    }
    
    sortEntries(filteredEntries);
    displayEntries(filteredEntries);
}

function handleSort() {
    sortEntries(filteredEntries);
    displayEntries(filteredEntries);
}

function sortEntries(entries) {
    const sortValue = sortSelect.value;
    
    switch(sortValue) {
        case 'color-rainbow':
            entries.sort((a, b) => {
                // Get HEX values for both entries - prefer ColorHex field, fallback to color name mapping
                const aHex = a.ColorHex || getColorHex(a.Color);
                const bHex = b.ColorHex || getColorHex(b.Color);
                
                // Calculate hue from HEX values
                const ha = ColorUtils.hueFromColor(aHex);
                const hb = ColorUtils.hueFromColor(bHex);
                
                if (ha === hb) {
                    // fallback to alphabetical when hues equal or Infinity
                    return (a.Color || '').localeCompare(b.Color || '');
                }
                return ha - hb;
            });
            break;
        case 'date-desc':
            entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
        case 'date-asc':
            entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            break;
        case 'manufacturer':
            entries.sort((a, b) => a.Manufacturer.localeCompare(b.Manufacturer));
            break;
        case 'material':
            entries.sort((a, b) => a.Material.localeCompare(b.Material));
            break;
        case 'color':
            entries.sort((a, b) => a.Color.localeCompare(b.Color));
            break;
        case 'temp1':
            entries.sort((a, b) => {
                const aTemp = a.Temp1 === 'NA' ? Infinity : parseFloat(a.Temp1);
                const bTemp = b.Temp1 === 'NA' ? Infinity : parseFloat(b.Temp1);
                return aTemp - bTemp;
            });
            break;
        case 'temp2':
            entries.sort((a, b) => {
                const aTemp = a.Temp2 === 'NA' ? Infinity : parseFloat(a.Temp2);
                const bTemp = b.Temp2 === 'NA' ? Infinity : parseFloat(b.Temp2);
                return aTemp - bTemp;
            });
            break;
        case 'spools':
            entries.sort((a, b) => (b.spoolCount || 1) - (a.spoolCount || 1));
            break;
        case 'remaining':
            entries.sort((a, b) => (b.remainingPercentage || 100) - (a.remainingPercentage || 100));
            break;
    }
}

function addFilter(type, value) {
    const filterKey = `${type}:${value}`;
    if (!activeFilters.has(filterKey)) {
        activeFilters.add(filterKey);
        updateFilterTags();
        applyFilters();
    }
}

function removeFilter(filterKey) {
    activeFilters.delete(filterKey);
    updateFilterTags();
    applyFilters();
}

function updateFilterTags() {
    if (activeFilters.size === 0) {
        filterTags.innerHTML = '';
        syncFilterSelectUI();
        return;
    }
    
    filterTags.innerHTML = Array.from(activeFilters).map(filter => {
        const [type, value] = filter.split(':');
        return `
            <span class="filter-tag">
                ${value}
                <button class="remove-filter" data-filter="${filter}">×</button>
            </span>
        `;
    }).join('');
    
    document.querySelectorAll('.remove-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            removeFilter(e.target.dataset.filter);
        });
    });
    syncFilterSelectUI();
}

function applyFilters() {
    if (activeFilters.size === 0) {
        filteredEntries = [...allEntries];
    } else {
        filteredEntries = allEntries.filter(entry => {
            return Array.from(activeFilters).every(filter => {
                const [type, value] = filter.split(':');
                switch(type) {
                    case 'manufacturer':
                        return entry.Manufacturer === value;
                    case 'material':
                        return entry.Material === value;
                    case 'color':
                        return entry.Color === value;
                    default:
                        return true;
                }
            });
        });
    }
    
    if (searchInput.value) {
        handleSearch();
    } else {
        handleSort();
    }
}

// ===============================
// Filter Selects (Manufacturer / Material / Color)
// ===============================

function bindFilterSelects() {
    if (manufacturerFilter) {
        manufacturerFilter.addEventListener('change', () => handleFilterSelectChange('manufacturer', manufacturerFilter.value));
    }
    if (materialFilter) {
        materialFilter.addEventListener('change', () => handleFilterSelectChange('material', materialFilter.value));
    }
    if (colorFilter) {
        colorFilter.addEventListener('change', () => handleFilterSelectChange('color', colorFilter.value));
    }
}

function handleFilterSelectChange(type, value) {
    // remove existing of this type
    Array.from(activeFilters).forEach(key => { if (key.startsWith(type + ':')) activeFilters.delete(key); });
    if (value) activeFilters.add(`${type}:${value}`);
    updateFilterTags();
    applyFilters();
}

function populateFilterOptions() {
    const uniques = {
        manufacturer: Array.from(new Set(allEntries.map(e => e.Manufacturer))).sort((a,b) => a.localeCompare(b)),
        material: Array.from(new Set(allEntries.map(e => e.Material))).sort((a,b) => a.localeCompare(b)),
        color: Array.from(new Set(allEntries.map(e => e.Color))).sort((a,b) => a.localeCompare(b))
    };
    if (manufacturerFilter) setOptions(manufacturerFilter, ['All Manufacturers', ...uniques.manufacturer], 'All Manufacturers');
    if (materialFilter) setOptions(materialFilter, ['All Materials', ...uniques.material], 'All Materials');
    if (colorFilter) setOptions(colorFilter, ['All Colors', ...uniques.color], 'All Colors');
    syncFilterSelectUI();
}

function setOptions(selectEl, options, firstLabel) {
    const current = selectEl.value;
    selectEl.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = firstLabel;
    selectEl.appendChild(first);
    options.slice(1).forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        selectEl.appendChild(opt);
    });
    // try restore selection
    selectEl.value = current;
}

function syncFilterSelectUI() {
    if (!manufacturerFilter && !materialFilter && !colorFilter) return;
    const getActive = (type) => {
        for (const key of activeFilters) {
            if (key.startsWith(type + ':')) return key.split(':')[1];
        }
        return '';
    };
    if (manufacturerFilter) manufacturerFilter.value = getActive('manufacturer');
    if (materialFilter) materialFilter.value = getActive('material');
    if (colorFilter) colorFilter.value = getActive('color');
}

function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    allEntries = allEntries.filter(entry => entry.id !== id);
    saveToStorage(allEntries);
    loadSavedEntries();
}

// ===============================
// Color Picker Integration
// ===============================

function setupColorPicker() {
    colorInputSupported = isColorInputSupported();
    colorPickerInput = document.createElement('input');
    colorPickerInput.setAttribute('type', 'color');
    colorPickerInput.id = 'colorPickerHiddenInput';
    // Keep it technically present and focusable for mobile Safari
    colorPickerInput.style.position = 'fixed';
    colorPickerInput.style.opacity = '0';
    colorPickerInput.style.pointerEvents = 'none';
    colorPickerInput.style.width = '1px';
    colorPickerInput.style.height = '1px';
    colorPickerInput.style.bottom = '10px';
    colorPickerInput.style.right = '10px';
    colorPickerInput.setAttribute('aria-hidden', 'true');
    document.body.appendChild(colorPickerInput);

    colorPickerInput.addEventListener('change', async (e) => {
        const id = colorPickerInput.dataset.entryId;
        if (!id) return;
        const hex = e.target.value; // Always #RRGGBB
        const entry = allEntries.find(en => en.id === id);
        if (!entry) return;

        // Try filamentcolors.xyz suggestion first (with material hint), then fallback
        let suggested = null;
        try {
            if (window.FCX && typeof FCX.suggestColor === 'function') {
                suggested = await FCX.suggestColor(hex, entry.Material, entry.Manufacturer);
            }
        } catch {}

        // Always allow choosing by manufacturer with a dropdown
        const chosen = await showManufacturerSuggestionsDialog(hex, entry.Material, entry.Manufacturer);
        if (chosen && chosen.label) {
            entry.Color = chosen.label;
            if (chosen.hex) entry.ColorHex = chosen.hex.toUpperCase();
        } else if (suggested && suggested.color_name) {
            const pretty = `${suggested.color_name}` + (suggested.manufacturer ? ` (${suggested.manufacturer})` : '');
            const ok = confirm(`Use suggested color name from filamentcolors.xyz?\n\n${pretty}\n\nOK to apply, Cancel to keep generic.`);
            if (ok) {
                entry.Color = pretty;
                if (suggested.hex_color) entry.ColorHex = suggested.hex_color.toUpperCase();
            } else {
                entry.Color = hex.toUpperCase();
                entry.ColorHex = hex.toUpperCase();
            }
        } else {
            const rgb = ColorUtils.hexToRgb(hex);
            let newColor = hex.toUpperCase();
            if (rgb) {
                const closest = ColorUtils.findClosestColorName(rgb.r, rgb.g, rgb.b);
                if (closest && closest !== 'Unknown') {
                    newColor = closest;
                }
            }
            entry.Color = newColor;
            entry.ColorHex = hex.toUpperCase();
        }
        saveToStorage(allEntries);
        loadSavedEntries();
        // cleanup id so subsequent opens don't accidentally reuse
        delete colorPickerInput.dataset.entryId;
    });
}

function openColorPickerForEntry(id) {
    const entry = allEntries.find(en => en.id === id);
    if (!entry || !colorPickerInput) return;
    const current = entry.ColorHex || getColorHex(entry.Color);
    const hex = normalizeToHex(current);
    if (hex) {
        colorPickerInput.value = hex;
    }
    colorPickerInput.dataset.entryId = id;
    if (colorInputSupported) {
        // Attempt to open native picker
        colorPickerInput.focus();
        colorPickerInput.click();
    } else {
        // Fallback prompt for browsers without native color input
        fallbackColorPrompt(id, hex);
    }
}

// Redesigned color selection flow: tries filamentcolors suggestions and text search
async function openColorSelectionFlow(id) {
    const entry = allEntries.find(en => en.id === id);
    if (!entry) return;
    const material = entry.Material || undefined;
    const defaultMfr = '';
    const baseHex = normalizeToHex(entry.ColorHex || getColorHex(entry.Color) || '#000000');

    // Build overlay UI
    const overlay = document.createElement('div');
    overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='10000';
    const panel = document.createElement('div');
    panel.style.position='absolute'; panel.style.top='50%'; panel.style.left='50%'; panel.style.transform='translate(-50%, -50%)';
    panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.padding='16px'; panel.style.width='min(640px, 95vw)'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
    const title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='6px'; title.textContent='Select Color';
    const sub = document.createElement('div'); sub.style.fontSize='12px'; sub.style.color='#666'; sub.style.marginBottom='8px'; sub.textContent=`Current ${entry.Color} · ${baseHex.toUpperCase()} · Material ${material||'any'}`;
    const controls = document.createElement('div'); controls.style.display='grid'; controls.style.gridTemplateColumns='1fr 1fr'; controls.style.gap='8px'; controls.style.marginBottom='8px';
    const mfrSel = document.createElement('select'); mfrSel.style.padding='8px'; mfrSel.style.border='1px solid #eee'; mfrSel.style.borderRadius='8px';
    const search = document.createElement('input'); search.type='text'; search.placeholder='Search color name...'; search.style.padding='8px'; search.style.border='1px solid #eee'; search.style.borderRadius='8px';
    controls.appendChild(mfrSel); controls.appendChild(search);
    const list = document.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='6px'; list.style.maxHeight='50vh'; list.style.overflow='auto'; list.style.marginTop='4px';
    const actions = document.createElement('div'); actions.style.display='flex'; actions.style.justifyContent='space-between'; actions.style.marginTop='10px';
    const pickBtn = document.createElement('button'); pickBtn.textContent='Open Color Picker'; pickBtn.style.padding='8px 10px'; pickBtn.style.border='1px solid #ddd'; pickBtn.style.borderRadius='8px'; pickBtn.style.cursor='pointer';
    const cancelBtn = document.createElement('button'); cancelBtn.textContent='Cancel'; cancelBtn.style.padding='8px 10px'; cancelBtn.style.border='1px solid #ddd'; cancelBtn.style.borderRadius='8px'; cancelBtn.style.cursor='pointer';
    actions.appendChild(pickBtn); actions.appendChild(cancelBtn);
    panel.appendChild(title); panel.appendChild(sub); panel.appendChild(controls); panel.appendChild(list); panel.appendChild(actions); overlay.appendChild(panel); document.body.appendChild(overlay);

    function cleanup(){ try{ document.body.removeChild(overlay); } catch{} }

    // Populate manufacturer list
    (async () => {
        if (window.FCX) {
            const mfrs = await FCX.getManufacturers();
            const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='All manufacturers'; mfrSel.appendChild(optAll);
            mfrs.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; mfrSel.appendChild(o); });
            if (defaultMfr) mfrSel.value = defaultMfr;
        } else {
            const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='All manufacturers'; mfrSel.appendChild(optAll);
        }
        await loadSuggestions();
    })();

    let searchTimer = null;
    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadSuggestions, 250);
    });
    mfrSel.addEventListener('change', loadSuggestions);

    async function loadSuggestions(){
        list.innerHTML='Loading…';
        let items = [];
        try {
            // Ensure snapshots are injected/loaded at least once
            if (window.FCX && typeof FCX.getSnapshotStatus === 'function') {
                const st1 = await FCX.getSnapshotStatus();
                if (!st1.loaded || st1.loaded.length === 0) {
                    // give the worker a moment after injection
                    await new Promise(r=>setTimeout(r, 150));
                }
            }
            if (search.value && window.FCX) {
                items = await FCX.searchByText(search.value, mfrSel.value || null, null, 10);
            } else if (window.FCX) {
                // Suggested near current color
                items = await FCX.listSuggestions(baseHex, null, mfrSel.value || null, 5);
            }
        } catch {}
        list.innerHTML='';
        if (!items || !items.length) {
            // Try fallback to All manufacturers if a specific mfr is selected
            if ((mfrSel.value || '') && window.FCX) {
                try {
                    const allItems = search.value ? await FCX.searchByText(search.value, null, null, 10)
                                                 : await FCX.listSuggestions(baseHex, null, null, 5);
                    if (allItems && allItems.length) {
                        const hint = document.createElement('div');
                        hint.style.color = '#666';
                        hint.style.marginBottom = '6px';
                        hint.textContent = 'No matches for this manufacturer. Show results from all manufacturers?';
                        const showBtn = document.createElement('button');
                        showBtn.textContent = 'Show All';
                        showBtn.style.marginLeft = '8px'; showBtn.style.padding='4px 8px'; showBtn.style.border='1px solid #eee'; showBtn.style.borderRadius='8px'; showBtn.style.cursor='pointer';
                        showBtn.addEventListener('click', ()=>{ mfrSel.value=''; loadSuggestions(); });
                        const wrap = document.createElement('div'); wrap.appendChild(hint); wrap.appendChild(showBtn); list.appendChild(wrap);
                        return;
                    }
                } catch {}
            }
            // If still nothing, check snapshot status and guide to Settings if truly empty
            try {
                const st = await FCX.getSnapshotStatus();
                if (!st.loaded || st.loaded.length === 0) {
                    const note = document.createElement('div');
                    note.style.color='#666'; note.style.marginBottom='8px';
                    note.innerHTML = 'No local color snapshots found. Build them in Settings → Color Suggestions.';
                    const go = document.createElement('a'); go.textContent='Open Settings'; go.href='settings.html'; go.className='refine-color';
                    const wrap = document.createElement('div'); wrap.appendChild(note); wrap.appendChild(go); list.appendChild(wrap); return;
                }
            } catch {}
            const none=document.createElement('div'); none.textContent='No suggestions.'; none.style.color='#666'; list.appendChild(none); return;
        }
        items.forEach(s => {
            const btn = document.createElement('button');
            const label = `${s.color_name}${s.manufacturer ? ' ('+s.manufacturer+')' : ''}`;
            btn.textContent = `${label}${s.distance!=null? ' · ΔE '+s.distance : ''}`;
            btn.style.padding='8px 10px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer'; btn.style.textAlign='left';
            btn.addEventListener('click', ()=>{
                entry.Color = label; entry.ColorHex = (s.hex_color||'').toUpperCase();
                saveToStorage(allEntries); loadSavedEntries(); cleanup();
            });
            list.appendChild(btn);
        });
    }

    cancelBtn.addEventListener('click', ()=>{ cleanup(); });
    pickBtn.addEventListener('click', ()=>{ cleanup(); openColorPickerForEntry(id); });
}

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

// Minimal suggestions dialog (overlay)
async function showColorSuggestionsDialog(suggestions, hex) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='10000';
        const panel = document.createElement('div');
        panel.style.position='absolute'; panel.style.top='50%'; panel.style.left='50%'; panel.style.transform='translate(-50%, -50%)';
        panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.padding='16px'; panel.style.width='min(420px, 90vw)'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
        panel.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Suggestions from filamentcolors.xyz</div>
        <div style="font-size:12px;color:#666;margin-bottom:8px">Picked ${hex.toUpperCase()}</div>`;
        const list = document.createElement('div');
        list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px';
        suggestions.forEach(s => {
            const btn = document.createElement('button');
            const label = `${s.color_name}${s.manufacturer ? ' ('+s.manufacturer+')' : ''}`;
            btn.textContent = `${label} · ΔE ${s.distance}`;
            btn.dataset.label = label;
            btn.dataset.hex = s.hex_color || '';
            btn.style.padding='8px 10px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer'; btn.style.textAlign='left';
            btn.addEventListener('click', () => { cleanup(); resolve({ label: btn.dataset.label, hex: btn.dataset.hex }); });
            list.appendChild(btn);
        });
        const cancel = document.createElement('button');
        cancel.textContent = 'Keep generic';
        cancel.style.marginTop='12px'; cancel.style.padding='8px 10px'; cancel.style.border='1px solid #ddd'; cancel.style.borderRadius='8px'; cancel.style.cursor='pointer';
        cancel.addEventListener('click', ()=>{ cleanup(); resolve(null); });
        panel.appendChild(list); panel.appendChild(cancel); overlay.appendChild(panel); document.body.appendChild(overlay);
        function cleanup(){ try{ document.body.removeChild(overlay); } catch{} }
    });
}

// Manufacturer-aware suggestions dialog
async function showManufacturerSuggestionsDialog(hex, material, defaultMfr) {
    if (!window.FCX) return null;
    const mfrs = await FCX.getManufacturers();
    let currentMfr = defaultMfr || '';
    return new Promise(async (resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='10000';
        const panel = document.createElement('div');
        panel.style.position='absolute'; panel.style.top='50%'; panel.style.left='50%'; panel.style.transform='translate(-50%, -50%)';
        panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.padding='16px'; panel.style.width='min(520px, 95vw)'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
        const title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Color suggestions (filamentcolors.xyz)';
        const sub = document.createElement('div'); sub.style.fontSize='12px'; sub.style.color='#666'; sub.style.marginBottom='8px'; sub.textContent=`Picked ${hex.toUpperCase()} · Material ${material||'any'}`;
        const select = document.createElement('select'); select.style.width='100%'; select.style.marginBottom='8px'; select.style.padding='8px'; select.style.border='1px solid #eee'; select.style.borderRadius='8px';
        const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='All manufacturers'; select.appendChild(optAll);
        mfrs.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; select.appendChild(o); });
        if (currentMfr) select.value = currentMfr;
        const list = document.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px'; list.style.maxHeight='50vh'; list.style.overflow='auto';
        const cancel = document.createElement('button'); cancel.textContent='Cancel'; cancel.style.marginTop='12px'; cancel.style.padding='8px 10px'; cancel.style.border='1px solid #ddd'; cancel.style.borderRadius='8px'; cancel.style.cursor='pointer';
        cancel.addEventListener('click', ()=>{ cleanup(); resolve(null); });
        panel.appendChild(title); panel.appendChild(sub); panel.appendChild(select); panel.appendChild(list); panel.appendChild(cancel); overlay.appendChild(panel); document.body.appendChild(overlay);

        async function reload() {
            list.innerHTML='Loading…';
            const sugg = await FCX.listSuggestions(hex, material, select.value || null, 5);
            list.innerHTML='';
            if (!sugg || !sugg.length) { const none=document.createElement('div'); none.textContent='No suggestions.'; none.style.color='#666'; list.appendChild(none); return; }
            sugg.forEach(s => {
                const btn = document.createElement('button');
                const label = `${s.color_name}${s.manufacturer ? ' ('+s.manufacturer+')' : ''}`;
                btn.textContent = `${label} · ΔE ${s.distance ?? ''}`;
                btn.dataset.label = label;
                btn.dataset.hex = s.hex_color || '';
                btn.style.padding='8px 10px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer'; btn.style.textAlign='left';
                btn.addEventListener('click', ()=>{ cleanup(); resolve({ label: btn.dataset.label, hex: btn.dataset.hex }); });
                list.appendChild(btn);
            });
        }
        select.addEventListener('change', reload);
        reload();
        function cleanup(){ try{ document.body.removeChild(overlay); } catch{} }
    });
}

// ===============================
// Spool count editor
// ===============================

function openSpoolEditor(id) {
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;
    const current = parseInt(entry.spoolCount || 1, 10) || 1;
    const input = prompt('Enter number of spools (1-999):', String(current));
    if (input === null) return; // cancelled
    const value = parseInt(input.trim(), 10);
    if (isNaN(value) || value < 1 || value > 999) {
        alert('Please enter a valid number between 1 and 999.');
        return;
    }
    if (value === current) return;
    entry.spoolCount = value;
    saveToStorage(allEntries);
    loadSavedEntries();
}

function isColorInputSupported() {
    const input = document.createElement('input');
    input.setAttribute('type', 'color');
    const supported = input.type === 'color';
    return supported;
}

function fallbackColorPrompt(id, initialHex) {
    const current = allEntries.find(e => e.id === id);
    const currentLabel = current ? current.Color : '';
    const val = prompt('Enter a color (hex like #FF8800 or name):', initialHex || currentLabel || '#FF6B35');
    if (!val) return; // canceled
    let newDisplay = val.trim();
    // Normalize value
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(newDisplay)) {
        const hex = normalizeToHex(newDisplay);
        const rgb = ColorUtils.hexToRgb(hex);
        if (rgb) {
            const closest = ColorUtils.findClosestColorName(rgb.r, rgb.g, rgb.b);
            if (closest && closest !== 'Unknown') newDisplay = closest;
            else newDisplay = hex.toUpperCase();
        }
    }
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;
    entry.Color = newDisplay;
    saveToStorage(allEntries);
    loadSavedEntries();
}

function clearAllEntries() {
    if (!confirm('Are you sure you want to delete all saved entries? This cannot be undone.')) return;
    
    localStorage.removeItem(STORAGE_KEY);
    loadSavedEntries();
}

function exportEntries() {
    if (filteredEntries.length === 0) {
        alert('No entries to export');
        return;
    }
    
    const headers = ['Manufacturer', 'Material', 'Color', 'ColorHex', 'Temp1', 'Temp2', 'Date'];
    const csvContent = [
        headers.join(','),
        ...filteredEntries.map(entry => 
            [
                entry.Manufacturer,
                entry.Material,
                entry.Color,
                entry.ColorHex || '',
                entry.Temp1,
                entry.Temp2,
                new Date(entry.timestamp).toISOString()
            ].map(field => `"${field}"`).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filament_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            
            const imported = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].match(/(".*?"|[^,]+)/g).map(v => v.replace(/"/g, '').trim());
                const entry = {
                    Manufacturer: values[0],
                    Material: values[1],
                    Color: values[2],
                    Temp1: values[3],
                    Temp2: values[4],
                    timestamp: values[5] || new Date().toISOString(),
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                };
                imported.push(entry);
            }
            
            if (imported.length > 0) {
                allEntries = [...allEntries, ...imported];
                saveToStorage(allEntries);
                loadSavedEntries();
                alert(`Successfully imported ${imported.length} entries`);
            }
        } catch (error) {
            alert('Error importing CSV file. Please check the file format.');
            console.error(error);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    e.target.value = '';
}

// Table header sorting function
function handleTableSort(field, headerElement) {
    // Remove sorted classes from all headers
    document.querySelectorAll('.entries-table th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
    
    // Toggle sort direction if clicking same field
    if (tableSortField === field) {
        tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableSortField = field;
        tableSortDirection = 'asc';
    }
    
    // Add appropriate class to current header
    headerElement.classList.add(`sorted-${tableSortDirection}`);
    
    // Map field names to sort values
    const sortMap = {
        'manufacturer': tableSortDirection === 'asc' ? 'manufacturer' : 'manufacturer-desc',
        'material': tableSortDirection === 'asc' ? 'material' : 'material-desc',
        'color': tableSortDirection === 'asc' ? 'color' : 'color-desc',
        'temp1': tableSortDirection === 'asc' ? 'temp1' : 'temp1-desc',
        'temp2': tableSortDirection === 'asc' ? 'temp2' : 'temp2-desc',
        'spools': tableSortDirection === 'asc' ? 'spools' : 'spools-desc',
        'remaining': tableSortDirection === 'asc' ? 'remaining' : 'remaining-desc',
        'date': tableSortDirection === 'asc' ? 'date-asc' : 'date-desc'
    };
    
    // Update the sort select to match (if exists)
    if (sortSelect) {
        const mappedValue = sortMap[field];
        if (mappedValue) {
            // Check if the option exists
            const hasOption = Array.from(sortSelect.options).some(opt => opt.value === mappedValue);
            if (hasOption) {
                sortSelect.value = mappedValue;
            } else {
                // Use a simpler mapping for existing options
                const simpleMap = {
                    'manufacturer': 'manufacturer',
                    'material': 'material', 
                    'color': 'color',
                    'temp1': 'temp1',
                    'temp2': 'temp2',
                    'spools': 'spools',
                    'remaining': 'remaining',
                    'date': tableSortDirection === 'asc' ? 'date-asc' : 'date-desc'
                };
                sortSelect.value = simpleMap[field] || 'date-desc';
            }
        }
    }
    
    // Sort and redisplay
    handleSort();
}

// ========================================
// Cloud Storage Functions
// ========================================

// Initialize cloud storage
function initializeCloudStorage() {
    if (typeof CloudStorage !== 'undefined') {
        window.cloudStorage = new CloudStorage();
    }
    updateCloudSyncButton();
}

// Handle cloud sync button click
async function handleCloudSync() {
    if (!window.cloudStorage || !window.cloudStorage.isReady()) {
        // Not configured: take user to Settings to configure
        window.location.href = 'settings.html';
        return;
    }
    // Configured: run sync immediately
    await performCloudSync();
}

// Legacy cloud sync options menu removed (use Settings page instead)

// Show sharing information for adding other devices
function showSharingInfo(apiKey, storageId) {
    if (apiKey === 'Unknown' || storageId === 'Unknown') {
        alert('❌ Storage info not available.\n\nPlease sync first or reconfigure cloud storage.');
        return;
    }
    
    // Validate the storage ID looks correct
    if (!storageId || storageId.length < 20) {
        alert(`❌ Storage ID appears invalid: ${storageId}
        
This might be corrupted. Try:
1. Sync first (option 1)
2. Or reset and setup fresh (option 3)`);
        return;
    }
    
    const sharingCode = `${apiKey}|${storageId}`;
    
    // Show in a text area for easier copying
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
    textarea.style.border = '2px solid #FF6B35';
    textarea.style.padding = '10px';
    textarea.style.borderRadius = '8px';
    
    document.body.appendChild(textarea);
    textarea.select();
    textarea.focus();
    
    // Add close button to textarea
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = 'calc(50% + 60px)';
    closeBtn.style.left = '50%';
    closeBtn.style.transform = 'translateX(-50%)';
    closeBtn.style.zIndex = '10001';
    closeBtn.style.background = '#FF6B35';
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
    
    alert(`📱 Sharing Code Ready!

The sharing code is selected in the text box.
Copy it exactly as shown (Ctrl+C / Cmd+C).

API Key: ${apiKey.substring(0, 15)}...
Storage ID: ${storageId}

Click OK, then copy the code. Click the ✕ Close button when done.`);
}

// Show reconfigure dialog
function showReconfigureDialog() { window.location.href = 'settings.html'; }

// Reset cloud storage settings
// resetCloudStorage moved to Settings workflow

// Show cloud storage setup dialog
function showCloudSetupDialog() {
    const setupType = confirm(`Set up Cloud Sync

FilamentDB can sync your inventory across devices using JSONBin.io (free service).

Choose setup type:
• OK = First device (create new storage)
• Cancel = Additional device (use existing storage)

Click OK for first device, Cancel for additional devices.`);

    if (setupType) {
        // First device - create new storage
        showFirstDeviceSetup();
    } else {
        // Additional device - use existing storage
        showAdditionalDeviceSetup();
    }
}

// Setup for first device (creates new storage)
function showFirstDeviceSetup() { window.location.href = 'settings.html'; }

// Setup for additional devices (uses existing storage)
function showAdditionalDeviceSetup() { window.location.href = 'settings.html'; }

// Setup cloud storage with API key
async function setupCloudStorage(apiKey, binId = null) {
    try {
        cloudSyncText.textContent = 'Setting up...';
        cloudSyncButton.disabled = true;
        
        await window.cloudStorage.setup(apiKey, binId);
        
        // Initial sync after setup
        await performCloudSync();
        
        // Show setup success with sharing info
        if (!binId) {
            // New storage created - show sharing info
            const storageId = window.cloudStorage.binId;
            alert(`✅ Cloud sync setup successful!

Your inventory is now synced across all devices.

📱 To add other devices:
1. On other devices, click "Setup Cloud Sync" 
2. Choose "Additional device"
3. Enter: ${apiKey}|${storageId}

💾 Save this info somewhere safe for future devices!`);
        } else {
            // Existing storage connected
            alert('✅ Connected to existing cloud storage!\n\nYour inventory is now synced with your other devices.');
        }
        
    } catch (error) {
        console.error('Cloud storage setup failed:', error);
        alert(`❌ Setup failed: ${error.message}`);
    } finally {
        updateCloudSyncButton();
        cloudSyncButton.disabled = false;
    }
}

// Perform cloud sync
async function performCloudSync() {
    try {
        cloudSyncText.textContent = 'Syncing...';
        cloudSyncButton.disabled = true;
        
        const result = await window.cloudStorage.syncData();
        
        if (result.success) {
            // Reload inventory after sync
            loadSavedEntries();
            updateStats();
            
            cloudSyncText.textContent = `✅ Synced (${result.mergedCount} items)`;
            setTimeout(() => updateCloudSyncButton(), 3000);
            
            // Show detailed sync info if items were merged
            if (result.localCount !== result.mergedCount || result.cloudCount !== result.mergedCount) {
                alert(`✅ Sync successful!\n\nLocal: ${result.localCount} items\nCloud: ${result.cloudCount} items\nTotal: ${result.mergedCount} items`);
            }
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Cloud sync failed:', error);
        cloudSyncText.textContent = '❌ Sync failed';
        setTimeout(() => updateCloudSyncButton(), 3000);
        
        alert(`❌ Sync failed: ${error.message}\n\nYour local data is safe. Try again later.`);
    } finally {
        cloudSyncButton.disabled = false;
    }
}

// Update cloud sync button appearance
function updateCloudSyncButton() {
    const status = window.cloudStorage?.getStatus();
    
    if (!status || !status.configured) {
        cloudSyncText.textContent = 'Setup Cloud Sync';
        cloudSyncButton.className = 'cloud-sync-button setup';
    } else if (status.enabled) {
        cloudSyncText.textContent = 'Cloud Sync';
        cloudSyncButton.className = 'cloud-sync-button enabled';
    } else {
        cloudSyncText.textContent = 'Cloud Sync (Disabled)';
        cloudSyncButton.className = 'cloud-sync-button disabled';
    }
}
