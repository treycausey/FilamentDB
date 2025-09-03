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
    
    // Add timestamp, ID, spool count, and remaining percentage
    parsedData.timestamp = new Date().toISOString();
    parsedData.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    parsedData.spoolCount = 1; // Default to 1 spool for new entries
    parsedData.remainingPercentage = 100; // Default to 100% remaining for new entries
    
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
            <div class="field-row">
                <span class="field-label">Spool Count:</span>
                <span class="field-value">${parsedData.spoolCount || 1}</span>
            </div>
            <div class="field-row">
                <span class="field-label">Remaining:</span>
                <span class="field-value">${parsedData.remainingPercentage || 100}%</span>
            </div>
        </div>
    `;
}

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

// Add entry to inventory with duplicate checking and spool counting
function addToInventory(parsedData, options = {}) {
    const { 
        allowDuplicates = false, 
        showConfirmation = true,
        onSuccess = null,
        onError = null 
    } = options;
    
    try {
        const entries = getStoredEntries();
        
        // Check for duplicates
        const duplicate = entries.find(entry => 
            entry.Manufacturer === parsedData.Manufacturer &&
            entry.Material === parsedData.Material &&
            entry.Color === parsedData.Color
        );
        
        if (duplicate) {
            // Ask user if this is a duplicate or a new spool
            const isDuplicate = showConfirmation ? 
                confirm(`A filament with these details already exists:\n\n${duplicate.Manufacturer} ${duplicate.Material} - ${duplicate.Color}\nCurrent spool count: ${duplicate.spoolCount || 1}\n\nIs this the same filament (click OK to add another spool) or a different one (click Cancel to add as new entry)?`) : 
                true;
            
            if (isDuplicate) {
                // Increment spool count instead of adding new entry
                duplicate.spoolCount = (duplicate.spoolCount || 1) + 1;
                duplicate.timestamp = new Date().toISOString(); // Update timestamp
                // Keep the original remaining percentage (don't update it when adding spools)
                saveToStorage(entries);
                
                console.log('Incremented spool count for existing filament:', duplicate);
                
                // Auto-sync to cloud if available
                if (typeof window !== 'undefined' && window.cloudStorage && window.cloudStorage.isReady()) {
                    window.cloudStorage.uploadData(entries).catch(err => 
                        console.warn('Cloud sync after spool count update failed:', err)
                    );
                }
                
                if (onSuccess) {
                    onSuccess(duplicate, entries, 'spool_incremented');
                }
                
                return true;
            } else if (!allowDuplicates) {
                // User said it's different, but we're not allowing duplicates
                // In this case, we still add it as they indicated it's different
                // The allowDuplicates flag is more about automatic prevention
            }
        }
        
        // Ensure new entry has spool count and remaining percentage
        if (!parsedData.spoolCount) {
            parsedData.spoolCount = 1;
        }
        if (parsedData.remainingPercentage === undefined) {
            parsedData.remainingPercentage = 100;
        }
        
        // Add as new entry
        entries.unshift(parsedData);
        saveToStorage(entries);
        
        console.log('Added new filament to inventory:', parsedData);
        
        // Auto-sync to cloud if available
        if (typeof window !== 'undefined' && window.cloudStorage && window.cloudStorage.isReady()) {
            window.cloudStorage.uploadData(entries).catch(err => 
                console.warn('Cloud sync after add failed:', err)
            );
        }
        
        if (onSuccess) {
            onSuccess(parsedData, entries, 'new_entry');
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