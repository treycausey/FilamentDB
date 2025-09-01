// DOM Elements
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const entriesList = document.getElementById('entriesList');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');
const importFile = document.getElementById('importFile');
const clearAllButton = document.getElementById('clearAllButton');
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
const STORAGE_KEY = 'qrCodeEntries';

// Event Listeners
searchInput.addEventListener('input', handleSearch);
sortSelect.addEventListener('change', handleSort);
exportButton.addEventListener('click', exportEntries);
importButton.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', handleImport);
clearAllButton.addEventListener('click', clearAllEntries);

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
document.addEventListener('DOMContentLoaded', loadSavedEntries);

// Storage functions
function getStoredEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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
                        <th>Manufacturer</th>
                        <th>Material</th>
                        <th>Color</th>
                        <th>Temp1</th>
                        <th>Temp2</th>
                        <th>Date</th>
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
                            <td>${new Date(entry.timestamp).toLocaleDateString()}</td>
                            <td>
                                <button class="delete-entry table-delete" data-id="${entry.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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