// FilamentDB Database Layer with Supabase
// Replaces localStorage with real database + cloud sync

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';

class FilamentDB {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
        this.config = {
            url: localStorage.getItem('supabase_url') || '',
            key: localStorage.getItem('supabase_key') || '',
        };
    }

    // Initialize database connection
    async init() {
        if (!this.config.url || !this.config.key) {
            console.log('📋 Supabase not configured - using localStorage fallback');
            return false;
        }

        try {
            this.supabase = createClient(this.config.url, this.config.key);
            
            // Test connection
            const { data, error } = await this.supabase.from('inventory').select('*', { count: 'exact', head: true });
            if (error) throw error;
            
            this.isInitialized = true;
            console.log('✅ Connected to Supabase database');
            
            // Auto-migrate localStorage data if this is first time
            await this.migrateFromLocalStorage();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Supabase:', error.message);
            return false;
        }
    }

    // Configure Supabase connection
    configure(url, key) {
        this.config = { url, key };
        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);
        return this.init();
    }

    // Check if database is available
    isReady() {
        return this.isInitialized && this.supabase;
    }

    // Get all filament entries with optional filters
    async getFilaments(filters = {}) {
        if (!this.isReady()) {
            return this.getFromLocalStorage();
        }

        try {
            let query = this.supabase.from('inventory').select('*');
            
            // Apply filters
            if (filters.manufacturer) {
                query = query.eq('manufacturer', filters.manufacturer);
            }
            if (filters.material) {
                query = query.eq('material', filters.material);
            }
            if (filters.color) {
                query = query.ilike('color', `%${filters.color}%`);
            }
            if (filters.search) {
                query = query.or(
                    `manufacturer.ilike.%${filters.search}%,` +
                    `material.ilike.%${filters.search}%,` +
                    `color.ilike.%${filters.search}%`
                );
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            console.log(`📦 Loaded ${data.length} entries from database`);
            return data || [];
        } catch (error) {
            console.error('❌ Failed to load from database:', error);
            return this.getFromLocalStorage();
        }
    }

    // Add new filament entry
    async addFilament(entry) {
        if (!this.isReady()) {
            return this.addToLocalStorage(entry);
        }

        try {
            // Ensure entry has required fields
            const dbEntry = {
                id: entry.id || crypto.randomUUID(),
                manufacturer: entry.Manufacturer || entry.manufacturer || '',
                material: entry.Material || entry.material || '',
                color: entry.Color || entry.color || '',
                hex_color: entry['Hex Color'] || entry.hex_color || '#000000',
                temp1: parseInt(entry['Print Temp 1'] || entry.temp1 || 0),
                temp2: parseInt(entry['Print Temp 2'] || entry.temp2 || 0),
                spool_count: parseInt(entry.spoolCount || 1),
                remaining_percentage: parseInt(entry.remainingPercentage || 100),
                notes: entry.notes || ''
            };

            const { data, error } = await this.supabase
                .from('inventory')
                .insert([dbEntry])
                .select();

            if (error) throw error;

            console.log('✅ Added entry to database:', data[0].id);
            return data[0];
        } catch (error) {
            console.error('❌ Failed to add to database:', error);
            return this.addToLocalStorage(entry);
        }
    }

    // Update existing entry
    async updateFilament(id, changes) {
        if (!this.isReady()) {
            return this.updateInLocalStorage(id, changes);
        }

        try {
            // Map UI/PascalCase fields to DB columns
            const toDb = (c) => {
                const m = {
                    manufacturer: c.Manufacturer ?? c.manufacturer,
                    material: c.Material ?? c.material,
                    color: c.Color ?? c.color,
                    hex_color: c.ColorHex ?? c['Hex Color'] ?? c.hex_color,
                    temp1: c.Temp1 != null ? parseInt(c.Temp1) : c.temp1,
                    temp2: c.Temp2 != null ? parseInt(c.Temp2) : c.temp2,
                    spool_count: c.spoolCount ?? c.spool_count,
                    remaining_percentage: c.remainingPercentage ?? c.remaining_percentage,
                    notes: c.notes
                };
                // Remove undefined keys to avoid overwriting with null
                Object.keys(m).forEach(k => m[k] === undefined && delete m[k]);
                return m;
            };
            const payload = toDb(changes || {});

            const { data, error } = await this.supabase
                .from('inventory')
                .update(payload)
                .eq('id', id)
                .select();

            if (error) throw error;

            console.log('✅ Updated entry in database:', id);
            return data[0];
        } catch (error) {
            console.error('❌ Failed to update in database:', error);
            return this.updateInLocalStorage(id, changes);
        }
    }

    // Delete entry
    async deleteFilament(id) {
        if (!this.isReady()) {
            return this.deleteFromLocalStorage(id);
        }

        try {
            const { error } = await this.supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Deleted entry from database:', id);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete from database:', error);
            return this.deleteFromLocalStorage(id);
        }
    }

    // Clear all entries
    async clearAll() {
        if (!this.isReady()) {
            localStorage.removeItem('qrCodeEntries');
            return true;
        }

        try {
            const { error } = await this.supabase
                .from('inventory')
                .delete()
                .neq('id', 'never-matches'); // Delete all

            if (error) throw error;

            console.log('✅ Cleared all entries from database');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear database:', error);
            localStorage.removeItem('qrCodeEntries');
            return false;
        }
    }

    // Subscribe to real-time changes
    subscribeToChanges(callback) {
        if (!this.isReady()) return null;

        const subscription = this.supabase
            .channel('inventory_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'inventory' }, 
                (payload) => {
                    console.log('📡 Real-time update:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        return subscription;
    }

    // Migrate localStorage data to Supabase (one-time)
    async migrateFromLocalStorage() {
        if (!this.isReady()) return;

        const localData = localStorage.getItem('qrCodeEntries');
        if (!localData) return;

        try {
            const entries = JSON.parse(localData);
            if (!Array.isArray(entries) || entries.length === 0) return;

            // Check if we already have data in Supabase
            const { data: existing } = await this.supabase
                .from('inventory')
                .select('id')
                .limit(1);

            if (existing && existing.length > 0) {
                console.log('📋 Database already has data, skipping migration');
                return;
            }

            console.log(`🔄 Migrating ${entries.length} entries from localStorage...`);
            
            // Convert entries to database format
            const dbEntries = entries.map(entry => ({
                id: entry.id || crypto.randomUUID(),
                manufacturer: entry.Manufacturer || '',
                material: entry.Material || '',
                color: entry.Color || '',
                hex_color: entry['Hex Color'] || '#000000',
                temp1: parseInt(entry['Print Temp 1'] || 0),
                temp2: parseInt(entry['Print Temp 2'] || 0),
                spool_count: parseInt(entry.spoolCount || 1),
                remaining_percentage: parseInt(entry.remainingPercentage || 100),
                notes: entry.notes || ''
            }));

            // Insert all entries
            const { data, error } = await this.supabase
                .from('inventory')
                .insert(dbEntries);

            if (error) throw error;

            console.log('✅ Migration completed successfully!');
            
            // Backup localStorage data
            localStorage.setItem('qrCodeEntries_backup', localData);
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }

    // LocalStorage fallback methods
    getFromLocalStorage() {
        const stored = localStorage.getItem('qrCodeEntries');
        return stored ? JSON.parse(stored) : [];
    }

    addToLocalStorage(entry) {
        const entries = this.getFromLocalStorage();
        entries.push({ ...entry, id: entry.id || Date.now().toString() });
        localStorage.setItem('qrCodeEntries', JSON.stringify(entries));
        return entry;
    }

    updateInLocalStorage(id, changes) {
        const entries = this.getFromLocalStorage();
        const index = entries.findIndex(e => e.id === id);
        if (index >= 0) {
            entries[index] = { ...entries[index], ...changes };
            localStorage.setItem('qrCodeEntries', JSON.stringify(entries));
        }
        return entries[index];
    }

    deleteFromLocalStorage(id) {
        const entries = this.getFromLocalStorage();
        const filtered = entries.filter(e => e.id !== id);
        localStorage.setItem('qrCodeEntries', JSON.stringify(filtered));
        return true;
    }

    // Get database statistics
    async getStats() {
        if (!this.isReady()) {
            const entries = this.getFromLocalStorage();
            return {
                total: entries.length,
                manufacturers: [...new Set(entries.map(e => e.Manufacturer))].length,
                materials: [...new Set(entries.map(e => e.Material))].length,
                colors: [...new Set(entries.map(e => e.Color))].length
            };
        }

        try {
            const { data, error } = await this.supabase
                .from('inventory')
                .select('manufacturer, material, color');

            if (error) throw error;

            return {
                total: data.length,
                manufacturers: [...new Set(data.map(e => e.manufacturer).filter(Boolean))].length,
                materials: [...new Set(data.map(e => e.material).filter(Boolean))].length,
                colors: [...new Set(data.map(e => e.color).filter(Boolean))].length
            };
        } catch (error) {
            console.error('❌ Failed to get stats:', error);
            return this.getStats(); // Fallback to localStorage
        }
    }
}

// Create singleton instance
const db = new FilamentDB();

// Export for use in other files
window.FilamentDB = db;

export default db;
