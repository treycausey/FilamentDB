/**
 * Cloud Storage for FilamentDB
 * Provides cross-device data synchronization using JSONBin.io (free tier)
 * Licensed under GPL-3.0-or-later
 */

class CloudStorage {
    constructor() {
        this.apiEndpoint = 'https://api.jsonbin.io/v3';
        this.binId = null;
        this.apiKey = null;
        this.isEnabled = false;
        this.syncInProgress = false;
        
        this.loadSettings();
    }

    // Load cloud storage settings from localStorage
    loadSettings() {
        try {
            const settings = localStorage.getItem('cloudStorageSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.binId = parsed.binId;
                this.apiKey = parsed.apiKey;
                this.isEnabled = parsed.enabled || false;
            }
        } catch (error) {
            console.warn('Failed to load cloud storage settings:', error);
        }
    }

    // Save cloud storage settings to localStorage
    saveSettings() {
        try {
            const settings = {
                binId: this.binId,
                apiKey: this.apiKey,
                enabled: this.isEnabled
            };
            localStorage.setItem('cloudStorageSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save cloud storage settings:', error);
        }
    }

    // Setup cloud storage with user's API key
    async setup(apiKey, binId = null) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new Error('API key is required');
        }

        this.apiKey = apiKey.trim();
        
        try {
            if (binId) {
                // Use existing bin ID
                this.binId = binId;
                // Temporarily enable to test the connection
                this.isEnabled = true;
                // Test that we can access this bin
                await this.downloadData();
            } else {
                // Create a new bin
                await this.initializeBin();
                this.isEnabled = true;
            }
            
            this.saveSettings();
            
            console.log('✅ Cloud storage setup successful');
            return { success: true, message: 'Cloud storage setup successful!' };
            
        } catch (error) {
            console.error('Cloud storage setup failed:', error);
            this.isEnabled = false;
            this.apiKey = null;
            this.binId = null;
            throw new Error('Setup failed: ' + error.message);
        }
    }

    // Initialize or find the FilamentDB bin
    async initializeBin() {
        // Try to create a new bin for FilamentDB
        const response = await fetch(`${this.apiEndpoint}/b`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': this.apiKey,
                'X-Bin-Name': 'FilamentDB-Inventory'
            },
            body: JSON.stringify({
                filamentInventory: [],
                lastUpdated: new Date().toISOString(),
                version: '1.0.0'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create storage bin: ${error}`);
        }

        const result = await response.json();
        this.binId = result.metadata.id;
        this.saveSettings();
    }

    // Upload local data to cloud
    async uploadData(data) {
        if (!this.isEnabled || !this.binId || !this.apiKey) {
            throw new Error('Cloud storage not configured');
        }

        this.syncInProgress = true;

        try {
            const payload = {
                filamentInventory: data,
                lastUpdated: new Date().toISOString(),
                version: '1.0.0',
                deviceId: this.getDeviceId()
            };

            const response = await fetch(`${this.apiEndpoint}/b/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Upload failed: ${error}`);
            }

            console.log('✅ Data uploaded to cloud successfully');
            return { success: true, timestamp: payload.lastUpdated };

        } catch (error) {
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    // Download data from cloud
    async downloadData() {
        if (!this.isEnabled || !this.binId || !this.apiKey) {
            throw new Error('Cloud storage not configured');
        }

        try {
            console.log(`Downloading from bin: ${this.binId}`);
            const response = await fetch(`${this.apiEndpoint}/b/${this.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.apiKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Download response:', response.status, errorText);
                
                if (response.status === 401) {
                    throw new Error('Invalid API key');
                } else if (response.status === 404) {
                    throw new Error('Storage bin not found - check Storage ID');
                } else {
                    throw new Error(`Download failed (${response.status}): ${errorText}`);
                }
            }

            const result = await response.json();
            console.log('✅ Data downloaded from cloud successfully');
            
            return {
                success: true,
                data: result.record.filamentInventory || [],
                lastUpdated: result.record.lastUpdated,
                version: result.record.version
            };

        } catch (error) {
            console.error('Failed to download data:', error);
            throw error;
        }
    }

    // Smart sync: merge local and cloud data
    async syncData() {
        if (!this.isEnabled) {
            return { success: false, message: 'Cloud sync disabled' };
        }

        if (this.syncInProgress) {
            return { success: false, message: 'Sync already in progress' };
        }

        try {
            // Get local data
            const localData = JSON.parse(localStorage.getItem('qrCodeEntries') || '[]');
            
            // Download cloud data
            const cloudResult = await this.downloadData();
            const cloudData = cloudResult.data;

            // Merge data (cloud data takes precedence for conflicts)
            const mergedData = this.mergeInventoryData(localData, cloudData);

            // Update local storage
            localStorage.setItem('qrCodeEntries', JSON.stringify(mergedData));

            // Upload merged data back to cloud
            await this.uploadData(mergedData);

            return {
                success: true,
                message: `Synced ${mergedData.length} items`,
                localCount: localData.length,
                cloudCount: cloudData.length,
                mergedCount: mergedData.length
            };

        } catch (error) {
            console.error('Sync failed:', error);
            return { success: false, message: 'Sync failed: ' + error.message };
        }
    }

    // Merge two inventory arrays, removing duplicates
    mergeInventoryData(localData, cloudData) {
        const merged = [...localData];
        const localKeys = new Set(localData.map(item => this.getItemKey(item)));

        // Add cloud items that don't exist locally
        for (const cloudItem of cloudData) {
            const key = this.getItemKey(cloudItem);
            if (!localKeys.has(key)) {
                merged.push(cloudItem);
            }
        }

        return merged;
    }

    // Generate unique key for inventory item
    getItemKey(item) {
        return `${item.Manufacturer}-${item.Material}-${item.Color}`.toLowerCase();
    }

    // Generate simple device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    // Disable cloud storage
    disable() {
        this.isEnabled = false;
        this.saveSettings();
    }

    // Check if cloud storage is enabled and configured
    isReady() {
        return this.isEnabled && this.binId && this.apiKey;
    }

    // Get sync status
    getStatus() {
        return {
            enabled: this.isEnabled,
            configured: this.binId && this.apiKey,
            syncing: this.syncInProgress
        };
    }
}

// Export for use in FilamentDB
window.CloudStorage = CloudStorage;