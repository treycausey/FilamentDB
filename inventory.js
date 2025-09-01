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

// Stats elements
const totalEntriesEl = document.getElementById('totalEntries');
const uniqueManufacturersEl = document.getElementById('uniqueManufacturers');
const uniqueMaterialsEl = document.getElementById('uniqueMaterials');
const uniqueColorsEl = document.getElementById('uniqueColors');

// State
let allEntries = [];
let filteredEntries = [];
let currentView = 'grid';
let activeFilters = new Set();
let tableSortField = null;
let tableSortDirection = 'asc';
const STORAGE_KEY = 'qrCodeEntries';

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
        document.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentView = e.target.dataset.view;
        entriesList.className = `entries-list ${currentView}-view`;
        displayEntries(filteredEntries);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSavedEntries();
    initializeCloudStorage();
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
                        <span class="color-indicator" style="background: ${getColorHex(entry.Color)}"></span>
                        <span>${entry.Color}</span>
                    </div>
                    <div class="temp-info">
                        <span class="temp">T1: ${entry.Temp1}°</span>
                        <span class="temp">T2: ${entry.Temp2}°</span>
                    </div>
                    <div class="spool-info">
                        <span class="spool-count">🧵 ${entry.spoolCount || 1} spool${(entry.spoolCount || 1) > 1 ? 's' : ''}</span>
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
                                    <span class="color-indicator" style="background: ${getColorHex(entry.Color)}"></span>
                                    ${entry.Color}
                                </div>
                            </td>
                            <td>${entry.Temp1}</td>
                            <td>${entry.Temp2}</td>
                            <td>${entry.spoolCount || 1}</td>
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

function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    allEntries = allEntries.filter(entry => entry.id !== id);
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
    
    const headers = ['Manufacturer', 'Material', 'Color', 'Temp1', 'Temp2', 'Date'];
    const csvContent = [
        headers.join(','),
        ...filteredEntries.map(entry => 
            [
                entry.Manufacturer,
                entry.Material,
                entry.Color,
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
        showCloudSetupDialog();
    } else {
        // Show options for configured cloud storage
        showCloudSyncOptions();
    }
}

// Show cloud sync options when already configured
function showCloudSyncOptions() {
    const storageId = window.cloudStorage?.binId || 'Unknown';
    const apiKey = window.cloudStorage?.apiKey || 'Unknown';
    
    // Use a more detailed dialog with three options
    const choice = prompt(`Cloud Sync Menu

Current Storage ID: ${storageId}

Choose an option:
1 = Sync now
2 = Show sharing info for other devices  
3 = Reconfigure/Reset

Enter 1, 2, or 3:`);

    if (choice === '1') {
        // Sync now
        performCloudSync();
    } else if (choice === '2') {
        // Show sharing info
        showSharingInfo(apiKey, storageId);
    } else if (choice === '3') {
        // Show reconfigure options
        showReconfigureDialog();
    }
}

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
function showReconfigureDialog() {
    const option = confirm(`Reconfigure Cloud Sync

• OK = Reset and setup new storage
• Cancel = Connect to different storage

Choose OK to start fresh, or Cancel to connect to existing storage.`);

    if (option) {
        // Reset and start fresh
        resetCloudStorage();
    } else {
        // Connect to existing storage
        showAdditionalDeviceSetup();
    }
}

// Reset cloud storage settings
function resetCloudStorage() {
    const confirmed = confirm(`⚠️ Reset Cloud Storage?

This will:
• Clear your cloud sync settings
• Keep your local inventory safe
• Allow you to setup new cloud storage

Your local data will NOT be deleted.

Continue?`);

    if (confirmed) {
        // Clear cloud storage settings
        localStorage.removeItem('cloudStorageSettings');
        
        // Reinitialize cloud storage
        if (typeof CloudStorage !== 'undefined') {
            window.cloudStorage = new CloudStorage();
        }
        updateCloudSyncButton();
        
        alert('✅ Cloud storage reset successfully!\n\nYou can now set up cloud sync again.');
        
        // Show setup dialog
        setTimeout(() => showCloudSetupDialog(), 500);
    }
}

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
function showFirstDeviceSetup() {
    const apiKey = prompt(`First Device Setup

Steps:
1. Go to https://jsonbin.io and create a free account
2. Go to your profile and copy your API Key
3. Paste your API Key below:

This will create new cloud storage for your inventory.`);

    if (apiKey && apiKey.trim()) {
        setupCloudStorage(apiKey.trim());
    }
}

// Setup for additional devices (uses existing storage)
function showAdditionalDeviceSetup() {
    const input = prompt(`Additional Device Setup

You need:
1. Your JSONBin.io API Key
2. Your Storage ID (get this from your first device)

Enter in this format:
API_KEY|STORAGE_ID

Example:
$2b$10$abc123...|64f5a9b2e8c7d6...`);

    if (input && input.trim()) {
        const parts = input.trim().split('|');
        if (parts.length === 2) {
            const apiKey = parts[0].trim();
            const binId = parts[1].trim();
            
            // Validate inputs
            if (apiKey.length < 10) {
                alert('❌ API Key seems too short. Please check your API key.');
                return;
            }
            
            if (binId.length < 10) {
                alert('❌ Storage ID seems too short. Please check your Storage ID.');
                return;
            }
            
            setupCloudStorage(apiKey, binId);
        } else {
            alert('❌ Invalid format. Please use: API_KEY|STORAGE_ID\n\nMake sure there is exactly one | character separating them.');
        }
    }
}

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