// Shared QR Code Processing Functions
// Used by both scanner and generator to ensure consistent behavior

const STORAGE_KEY = 'qrCodeEntries';

// Parse QR code data into structured format
function parseQRData(data) {
    const lines = data.split('\n').map(line => line.trim());
    const fields = ['Manufacturer', 'Material', 'Color', 'Temp1', 'Temp2'];
    const parsedData = {};
    
    // Map lines to fields
    fields.forEach((field, index) => {
        if (index < lines.length && lines[index]) {
            parsedData[field] = lines[index];
        } else {
            parsedData[field] = null;
        }
    });
    
    // Validate required fields
    const requiredFields = ['Manufacturer', 'Material', 'Color'];
    const missingFields = requiredFields.filter(field => !parsedData[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Invalid QR code format. Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Set NA for missing temperature fields
    if (!parsedData.Temp1) parsedData.Temp1 = 'NA';
    if (!parsedData.Temp2) parsedData.Temp2 = 'NA';
    
    // Add timestamp and ID
    parsedData.timestamp = new Date().toISOString();
    parsedData.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    return parsedData;
}

// Create formatted HTML display for QR data
function createQRDataDisplay(parsedData) {
    return `
        <div class="field-list">
            <div class="field-row">
                <span class="field-label">Manufacturer:</span>
                <span class="field-value">${parsedData.Manufacturer}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Material:</span>
                <span class="field-value">${parsedData.Material}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Color:</span>
                <span class="field-value">${parsedData.Color}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Temp1:</span>
                <span class="field-value">${parsedData.Temp1}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Temp2:</span>
                <span class="field-value">${parsedData.Temp2}</span>
            </div>
        </div>
    `;
}

// Storage functions
function getStoredEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveToStorage(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Add entry to inventory with duplicate checking
function addToInventory(parsedData, options = {}) {
    const { 
        allowDuplicates = false, 
        showConfirmation = true,
        onSuccess = null,
        onError = null 
    } = options;
    
    try {
        const entries = getStoredEntries();
        
        // Check for duplicates if not allowing them
        if (!allowDuplicates) {
            const duplicate = entries.find(entry => 
                entry.Manufacturer === parsedData.Manufacturer &&
                entry.Material === parsedData.Material &&
                entry.Color === parsedData.Color
            );
            
            if (duplicate) {
                const shouldAdd = showConfirmation ? 
                    confirm('An entry with the same Manufacturer, Material, and Color already exists. Add anyway?') : 
                    true;
                
                if (!shouldAdd) {
                    if (onError) onError('User cancelled due to duplicate');
                    return false;
                }
            }
        }
        
        // Add to entries
        entries.unshift(parsedData);
        saveToStorage(entries);
        
        console.log('Added to inventory:', parsedData);
        
        // Auto-sync to cloud if available
        if (typeof window !== 'undefined' && window.cloudStorage && window.cloudStorage.isReady()) {
            window.cloudStorage.uploadData(entries).catch(err => 
                console.warn('Cloud sync after add failed:', err)
            );
        }
        
        if (onSuccess) {
            onSuccess(parsedData, entries);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error adding to inventory:', error);
        if (onError) {
            onError(error.message);
        }
        return false;
    }
}

// Validate QR data format
function validateQRData(data) {
    try {
        const parsed = parseQRData(data);
        return { valid: true, data: parsed };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.QRProcessor = {
        parseQRData,
        createQRDataDisplay,
        getStoredEntries,
        saveToStorage,
        addToInventory,
        validateQRData,
        STORAGE_KEY
    };
}