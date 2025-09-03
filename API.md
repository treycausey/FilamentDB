# FilamentDB API Documentation

## Database API (Supabase)

FilamentDB supports a first-class database backend using Supabase. When configured, the app reads/writes inventory to the `inventory` table and enables real‑time updates. If not configured, the app transparently falls back to localStorage.

### Class: `FilamentDB`

Location: `src/utils/database.js` (ES module)

#### Key Methods

- `init(): Promise<boolean>` — Initializes the Supabase client (no-op if credentials missing)
- `isReady(): boolean` — True when connected to Supabase
- `getFilaments(filters?): Promise<Row[]>` — Returns rows from DB or local fallback
- `addFilament(entry): Promise<Row>` — Inserts a new row (maps UI fields automatically)
- `updateFilament(id, changes): Promise<Row>` — Updates a row by id (UI→DB mapping applied)
- `deleteFilament(id): Promise<boolean>` — Deletes a row
- `clearAll(): Promise<boolean>` — Removes all rows
- `subscribeToChanges(callback)` — Real-time channel for live updates

#### Row Schema (database)

```
id UUID/STRING
manufacturer TEXT
material TEXT
color TEXT
hex_color TEXT
temp1 INTEGER
temp2 INTEGER
spool_count INTEGER
remaining_percentage INTEGER
created_at TIMESTAMP (default now())
notes TEXT
```

### UI <→ DB Field Mapping

The UI historically used PascalCase keys. Normalization is handled centrally in `src/utils/shared-utils.js`.

- UI → DB: `Manufacturer/Material/Color/ColorHex/Temp1/Temp2/spoolCount/remainingPercentage` → `manufacturer/material/color/hex_color/temp1/temp2/spool_count/remaining_percentage`
- DB → UI: `getStoredEntries()` maps DB rows back to UI shape and supplies sensible defaults (e.g., `Temp1/Temp2` = 'NA').

### Local Fallback

If Supabase URL/key are not configured, `FilamentDB` stores and retrieves data from `localStorage` under `qrCodeEntries`.

---

## Legacy Cloud Storage API (Optional)

FilamentDB still ships the previous JSONBin-based sync as an optional feature. New deployments should prefer the database backend.

### Overview

The `CloudStorage` class provides a complete cloud sync solution for FilamentDB inventory data:

- **Service**: JSONBin.io (free tier available)
- **Data Format**: JSON
- **Security**: Private bins with API key authentication
- **Sync Strategy**: Smart merging with conflict resolution

### Class: `CloudStorage`

Located in `src/utils/cloud-storage.js`

#### Constructor

```javascript
const storage = new CloudStorage();
```

**Initializes:**
- API endpoint: `https://api.jsonbin.io/v3`
- Loads settings from localStorage
- Sets up device ID generation

#### Methods

##### `setup(apiKey, binId?)`

Sets up cloud storage with user's API key.

**Parameters:**
- `apiKey` (string): JSONBin.io API key (required)
- `binId` (string, optional): Existing bin ID to use

**Returns:** Promise\<{success: boolean, message: string}>

**Example:**
```javascript
// First device setup (creates new storage)
await storage.setup('$2b$10$abc123...');

// Additional device setup (uses existing storage)
await storage.setup('$2b$10$abc123...', '64f5a9b2e8c7d6f1a2b3c4d5');
```

##### `syncData()`

Performs intelligent data synchronization between local and cloud storage.

**Returns:** Promise\<SyncResult>

```typescript
interface SyncResult {
  success: boolean;
  message: string;
  localCount?: number;
  cloudCount?: number; 
  mergedCount?: number;
}
```

**Sync Process:**
1. Download cloud data
2. Merge with local data (removes duplicates)
3. Update local storage
4. Upload merged data to cloud

**Example:**
```javascript
const result = await storage.syncData();
if (result.success) {
  console.log(`Synced ${result.mergedCount} items`);
}
```

##### `uploadData(data)`

Uploads local inventory data to cloud.

**Parameters:**
- `data` (Array): Inventory entries array

**Returns:** Promise\<{success: boolean, timestamp: string}>

##### `downloadData()`

Downloads inventory data from cloud.

**Returns:** Promise\<DownloadResult>

```typescript
interface DownloadResult {
  success: boolean;
  data: Array<InventoryEntry>;
  lastUpdated: string;
  version: string;
}
```

##### `isReady()`

Checks if cloud storage is properly configured.

**Returns:** boolean

**Example:**
```javascript
if (storage.isReady()) {
  // Cloud sync is available
  await storage.syncData();
}
```

##### `getStatus()`

Returns current cloud storage status.

**Returns:** StatusObject

```typescript
interface StatusObject {
  enabled: boolean;
  configured: boolean;
  syncing: boolean;
}
```

##### `disable()`

Disables cloud storage without removing settings.

### Inventory Entry (UI shape)

```typescript
interface InventoryEntry {
  id: string;
  Manufacturer: string;    // e.g., "Hatchbox"
  Material: string;        // e.g., "PLA"
  Color: string;           // e.g., "Black"
  ColorHex?: string;       // optional #RRGGBB
  Temp1: string;           // e.g., "210" or 'NA'
  Temp2: string;           // e.g., "60" or 'NA'
  spoolCount?: number;     // default 1
  remainingPercentage?: number; // default 100
  timestamp: string;       // ISO 8601
  notes?: string;
}
```

#### Cloud Storage Format

```typescript
interface CloudStorageData {
  filamentInventory: InventoryEntry[];
  lastUpdated: string;
  version: string;
  deviceId: string;
}
```

### Auto-Sync Integration (legacy)

FilamentDB automatically syncs data when items are added through the scanner or generator pages.

**Integration in `shared-qr-processing.js`:**
```javascript
// Auto-sync after adding inventory item
if (typeof window !== 'undefined' && 
    window.cloudStorage && 
    window.cloudStorage.isReady()) {
  
  window.cloudStorage.uploadData(entries).catch(err => 
    console.warn('Cloud sync after add failed:', err)
  );
}
```

### Setup Flow (legacy)

#### First Device Setup

1. User creates JSONBin.io account
2. User obtains API key from profile
3. User calls `setup(apiKey)` (no binId)
4. System creates new storage bin
5. System returns sharing code: `apiKey|binId`

#### Additional Device Setup

1. User has sharing code from first device
2. User calls `setup(apiKey, binId)` 
3. System tests connection to existing bin
4. Automatic sync pulls existing data

### Error Handling

The CloudStorage class handles various error scenarios:

#### Setup Errors
- **Invalid API Key**: `Error: Invalid API key`
- **Network Issues**: `Error: Setup failed: [network error]`
- **Bin Not Found**: `Error: Storage bin not found - check Storage ID`

#### Sync Errors
- **Offline**: `{success: false, message: 'Cloud sync disabled'}`
- **In Progress**: `{success: false, message: 'Sync already in progress'}`
- **Network Failure**: `{success: false, message: 'Sync failed: [error]'}`

### Security Considerations

1. **API Key Storage**: Stored in localStorage (client-side only)
2. **Private Bins**: Each user controls their own storage bin
3. **No User Data on Server**: Only inventory data stored in JSONBin.io
4. **HTTPS**: All API communications use HTTPS
5. **User Control**: Users can reset/disable cloud sync anytime

### JSONBin.io API Details

FilamentDB uses these JSONBin.io endpoints:

- **Create Bin**: `POST /v3/b`
- **Update Bin**: `PUT /v3/b/{BIN_ID}`
- **Read Bin**: `GET /v3/b/{BIN_ID}/latest`

**Required Headers:**
- `X-Master-Key`: User's API key
- `Content-Type`: `application/json`
- `X-Bin-Name`: `FilamentDB-Inventory` (for creation)

### Usage Examples

#### Complete Setup Flow

```javascript
// Initialize cloud storage
const cloudStorage = new CloudStorage();

// Setup for first device
try {
  const result = await cloudStorage.setup(userApiKey);
  console.log(result.message);
  
  // Get sharing code for other devices
  const sharingCode = `${userApiKey}|${cloudStorage.binId}`;
  console.log('Sharing code:', sharingCode);
  
} catch (error) {
  console.error('Setup failed:', error.message);
}
```

#### Manual Sync

```javascript
// Perform manual sync
try {
  const result = await cloudStorage.syncData();
  
  if (result.success) {
    console.log(`✅ Synced successfully!`);
    console.log(`Local: ${result.localCount}, Cloud: ${result.cloudCount}, Total: ${result.mergedCount}`);
  }
} catch (error) {
  console.error('Sync failed:', error.message);
}
```

#### Check Status

```javascript
const status = cloudStorage.getStatus();

if (status.configured && status.enabled) {
  console.log('Cloud sync ready');
} else if (status.syncing) {
  console.log('Sync in progress...');
} else {
  console.log('Cloud sync not configured');
}
```

---

## Shared QR Processing API

The `QRProcessor` object provides shared utilities for QR code handling across all FilamentDB pages.

### Methods

#### `parseQRData(rawData)`

Parses raw QR code string into structured inventory entry.

**Parameters:**
- `rawData` (string): Raw QR code content (newline-separated)

**Returns:** InventoryEntry object

**Example:**
```javascript
const qrData = "Hatchbox\\nPLA\\nBlack\\n210\\n60";
const parsed = QRProcessor.parseQRData(qrData);
// Result: {Manufacturer: "Hatchbox", Material: "PLA", ...}
```

#### `validateQRData(rawData)`

Validates QR code data format.

**Returns:** {valid: boolean, data?: InventoryEntry, error?: string}

#### `addToInventory(parsedData, options?)`

Adds parsed entry to inventory with duplicate checking.

**Parameters:**
- `parsedData` (InventoryEntry): Parsed inventory entry
- `options` (object, optional): Configuration options

**Options:**
```typescript
interface AddOptions {
  allowDuplicates?: boolean;
  showConfirmation?: boolean;
  onSuccess?: (entry, entries) => void;
  onError?: (error) => void;
}
```

#### `getStoredEntries()`

Retrieves all inventory entries from localStorage.

**Returns:** InventoryEntry[]

#### `saveToStorage(entries)`

Saves inventory entries to localStorage.

**Parameters:**
- `entries` (InventoryEntry[]): Array of inventory entries

---

*Last updated: December 2024*
