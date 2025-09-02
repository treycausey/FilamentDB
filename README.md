# FilamentDB

<div align="center">

**A beautiful, modern 3D printing filament inventory management system**

*Scan QR codes, organize your filament collection, and never lose track of your materials again*

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [License](#license)

</div>

---

## 🎯 Overview

FilamentDB is a web-based inventory management system specifically designed for 3D printing enthusiasts. Built with a focus on simplicity and beauty, it helps you organize, track, and manage your filament collection using QR codes.

### Why FilamentDB?

- 📱 **Mobile-First**: Beautiful, responsive design inspired by award-winning mobile apps
- 🎨 **Modern Interface**: Clean Dieter Rams-inspired aesthetic with orange and yellow accents
- 📊 **Smart Organization**: Automatic sorting, filtering, and statistics
- 🔍 **QR Code Integration**: Generate and scan QR codes for instant filament identification
- 🌐 **Offline-First**: Works completely offline - no internet required
- 🚀 **Fast & Reliable**: Local libraries, no CDN dependencies

## Features

### 📷 QR Code Scanner
- **Live camera scanning** with rear camera priority for optimal QR code detection
- Scan QR codes from images, camera, or files
- Drag & drop image upload
- Paste from clipboard (Ctrl+V / Cmd+V)  
- Automatic filament data extraction
- Recent scans history
- **HTTPS support** for mobile camera access via `npm run mobile`

### 🏷️ QR Code Generator
- Create QR codes for your filament spools
- Professional format with embedded text overlay
- Download as PNG or SVG
- Print-ready output with filament details
- **AI-powered color detection** via camera
- **Universal printing support for any printer**
- Direct save to inventory

### 📦 Inventory Management  
- Complete filament database with **285+ supported colors**
- Smart search and filtering
- Default rainbow color sort (ROYGBIV) with additional date/manufacturer/material sorts
- Statistics dashboard (total entries, unique colors, materials)
- Bulk operations (export CSV, import CSV, clear all)
- **Grid and list view modes** (List is default)
- Tag-based organization with click-to-filter
 - Click a color swatch to edit the color with a native color picker (stores closest known color name when possible)
 - Optional color suggestions powered by filamentcolors.xyz API (with local cache). Offline fallback via local snapshot + worker.

### ☁️ **NEW: Cross-Device Cloud Sync**
- **Sync inventory across multiple devices** using JSONBin.io
- **Real-time synchronization** when adding/scanning items
- **Multi-device setup** with secure sharing codes
- **Offline-first** with automatic cloud backup
- **Data merging** prevents duplicates across devices
- **Private & secure** - your data, your API key

### 🎨 Supported Materials
- PLA, PLA+, ABS, PETG, TPU
- Wood-filled, Metal-filled, Carbon Fiber
- Custom material types
- Temperature settings (extruder + bed)

## Quick Start

### Prerequisites
- Node.js (for development server and HTTPS mobile support) 
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone or download the repository**
   ```bash
   git clone <repository-url>
   cd filamentdb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Choose your server option:**

   **Option A: Standard Development Server**
   ```bash
   npm start
   ```
   The app will open at `http://localhost:3000`

   **Option B: HTTPS Mobile Server (Recommended for camera features)**
   ```bash
   npm run mobile
   ```
   The app will open at `https://localhost:3000` with self-signed certificates
   
   *Accept the security warning to enable camera access on mobile devices*

### Alternative: Direct Usage
You can also open `index.html` directly in a web browser without a server for basic functionality (camera features require HTTPS).

## Documentation

### 🏠 Scanner Page (`index.html`)
The main entry point for scanning QR codes and viewing recent entries.

**Features:**
- Image upload via file picker, drag & drop, or paste
- Camera integration for live scanning
- Recent scans list with quick access
- Automatic filament data extraction

### 🏷️ Generator Page (`generator.html`) 
Create professional QR codes for your filament spools.

**Features:**
- Form-based filament data entry
- QR code generation with text overlay
- Multiple download formats (PNG, SVG)
- Print functionality
- Color detection via camera
- Direct save to inventory

### 📦 Inventory Page (`inventory.html`)
Comprehensive filament collection management.

**Features:**
- Grid and list view modes (List default)
- Advanced search and filtering
- Default rainbow color sort (ROYGBIV), with additional sort options
- Statistics dashboard
- Export/import functionality (CSV format)
- Tag management with click-to-filter
- **Cloud sync integration** for cross-device access (configure in Settings)

### ☁️ Cloud Sync Setup

All cloud configuration now lives in the dedicated Settings page.

**First Device (create storage):**
1. Go to [JSONBin.io](https://jsonbin.io) and create a free account
2. Copy your API key from your profile
3. Open Settings → Cloud Sync → "Setup (New Storage)"
4. Paste your API key. The app creates storage and shows a sharing code

**Additional Device (join existing):**
1. On your first device, copy the sharing code from Settings → "Show Sharing Info"
2. On the new device, open Settings → "Setup (Additional Device)"
3. Paste the sharing code (`API_KEY|STORAGE_ID`) and connect

**Usage:**
- Inventory page "Cloud Sync" button runs Sync Now if configured, or opens Settings if not
- Smart merging prevents duplicates across devices
- Reset/disable/toggle available in Settings

### 🛠️ Data Format

FilamentDB uses a standardized format for filament data:

```
Manufacturer (e.g., "Hatchbox")
Material (e.g., "PLA")  
Color (e.g., "Black")
Temperature 1 (e.g., "210")
Temperature 2 (e.g., "60")
```

**Temperature Guidelines:**
- **Temperature 1**: Extruder/nozzle temperature (°C)
- **Temperature 2**: Bed temperature (°C)

### 🖨️ Universal Printing

FilamentDB supports printing QR codes on any printer through your browser's standard print dialog.

**How to Print:**
1. Generate a QR code in the Generator page
2. Click the **"Print"** button
3. Use your browser's print dialog to select any connected printer
4. Choose your preferred paper size and quality settings
5. Print to any standard printer or label printer

**Print Output:**
- **High-resolution QR code**: 400px resolution for crisp printing
- **Clean layout**: QR code only, no additional text
- **Universal compatibility**: Works with any printer through system print dialog
- **Optimized rendering**: Sharp edges and maximum contrast for reliable scanning

**Tips for Best Results:**
- Use high-quality print settings for crisp QR codes
- White paper or labels provide best contrast
- Test scan the printed QR code before applying to filament spools
- For label printers: adjust printer settings to fit your label size

**Safety Warning:**
The system will warn you before navigating away if you've printed a QR code but haven't saved it to inventory, preventing accidental loss of your filament data.

## 🎨 Design Philosophy

FilamentDB follows **Dieter Rams' "Less but Better"** design principles:

- **Innovative**: Modern web technologies, offline-first approach
- **Useful**: Solves real 3D printing workflow problems  
- **Aesthetic**: Beautiful, minimal interface
- **Understandable**: Intuitive navigation and clear information hierarchy
- **Unobtrusive**: Focuses on content, not interface
- **Honest**: No unnecessary features or complexity
- **Long-lasting**: Timeless design that won't feel outdated
- **Thorough**: Every detail carefully considered
- **Environmentally Friendly**: Efficient code, minimal resource usage
- **As Little Design as Possible**: Maximum functionality, minimum interface

### Color Palette
- **Primary**: Orange (#FF6B35) for key actions
- **Accent**: Yellow (#FFD23F) for highlights  
- **Base**: Clean blacks, whites, and grays
- **Typography**: Inter font family for modern readability

## 🧪 Testing

### Test Suites
FilamentDB includes comprehensive testing:

- **`tests.html`**: Complete test suite with 30+ test cases
  - Cloud storage functionality tests
  - Camera integration tests  
  - QR code processing tests
  - Inventory management tests
  - Error handling and regression tests

### Running Tests
1. Start the development server: `npm start` or `npm run mobile`
2. Navigate to test suite: http://localhost:3000/tests.html
3. Click "Run All Tests" to execute the complete test battery
4. View detailed results with pass/fail indicators

## 🏗️ Architecture

### File Structure
```
filamentdb/
├── index.html              # Scanner page (main entry)
├── generator.html           # QR code generator
├── inventory.html           # Inventory management
├── settings.html            # Settings (Cloud Sync, exports)
├── fcx-client.js            # FilamentColors.xyz API client + cache
├── workers/match-worker.js  # Offline matcher (snapshot, CIEDE2000)
├── tools/fcx-build.js       # Node script to build local snapshot JSON
├── fcx-snapshot/            # Snapshot output (all.json, pla.json, ...)
├── app.js                   # Scanner functionality
├── generator.js             # Generator functionality  
├── inventory.js             # Inventory functionality
├── settings.js              # Settings page logic
├── shared-qr-processing.js  # Shared QR utilities
├── cloud-storage.js         # Cloud sync functionality
├── color-detection.js       # Camera color detection
├── color-utils.js           # Color name/hex utilities
├── styles.css               # Complete design system
├── jsqr-local.js            # QR scanning library
├── qrious-local.js          # QR generation library
├── mobile-server.js         # HTTPS development server
├── tests.html               # Comprehensive test suite
├── error-handling-tests.js  # Error handling tests
├── validate.js              # Code validation script
└── manifest.json            # PWA configuration
```

### Key Technologies
- **HTML5**: Semantic markup, modern APIs
- **CSS3**: Custom properties, Grid, Flexbox
- **JavaScript**: ES6+, Local Storage, Canvas API
- **QR Libraries**: jsQR (scanning), QRious (generation)
- **PWA**: Offline functionality, mobile experience

### Data Storage
- **Local Storage**: Primary storage in browser (offline-first)
- **Cloud Sync**: Optional JSONBin.io integration for cross-device access
- **No Database**: Self-contained, no complex setup required
- **Privacy-First**: You control your data and API keys

## 🔧 Development

### Available Scripts
- `npm start` / `npm run dev`: Start standard HTTP development server
- `npm run mobile`: Start HTTPS development server with self-signed certificates
- `npm run serve`: Alternative HTTP server
- `node validate.js`: Run code quality validation
- Open `tests.html`: Run comprehensive test suite

### FilamentColors.xyz Integration
- Default path: API with caching via `fcx-client.js` (lightweight and current).
- Offline fallback: build a local snapshot and use the worker.

Build snapshot locally:
```
node tools/fcx-build.js --endpoint=https://filamentcolors.xyz/api --out=fcx-snapshot
```
This creates `fcx-snapshot/all.json` and material shards (e.g., `pla.json`, `petg.json`). The worker will load the best shard by Material, compute CIEDE2000, and surface the nearest suggestions when the API is unavailable.

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly  
5. Submit a pull request

### Code Style
- Clean, readable JavaScript
- Consistent naming conventions
- Comprehensive error handling
- Mobile-first responsive design

## 📱 Browser Support

**Recommended:**
- Chrome/Chromium 90+
- Firefox 90+
- Safari 14+
- Edge 90+

**Required APIs:**
- File API (file uploads)
- Canvas API (QR processing)
- Local Storage (data persistence)
- Media Devices API (camera access)

## License

This project is licensed under **GPL-3.0-or-later** due to the inclusion of the GPL-3.0 licensed QRious library.

### Third-Party Licenses
- **QRious v4.0.2**: GPL-3.0 (QR code generation)
- **jsQR v1.4.0**: Apache-2.0 (QR code scanning)

See [LICENSES.md](LICENSES.md) for complete license information and attribution requirements.

### Key License Points
- ✅ Free to use, modify, and distribute
- ✅ Commercial use allowed
- ⚠️ Source code must be made available when distributing
- ⚠️ Derivative works must also be GPL-3.0 licensed

## 🙏 Acknowledgments

- **QRious**: Excellent QR code generation library
- **jsQR**: Reliable QR code scanning
- **Dieter Rams**: Design philosophy inspiration
- **3D Printing Community**: Inspiration and feedback

## 📞 Support

### Documentation
- **[README.md](README.md)**: Complete setup and usage guide
- **[API.md](API.md)**: Cloud storage API and technical documentation
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Common issues and solutions
- **[LICENSES.md](LICENSES.md)**: Third-party license information

### Getting Help
- **Issues**: Report bugs or request features via GitHub issues
- **Tests**: Run `tests.html` to diagnose system functionality
- **Validation**: Run `node validate.js` to check code quality
- **Console**: Use browser console (F12) for detailed error messages
- **Community**: Share your FilamentDB setup with the 3D printing community

---

<div align="center">

**Made with ❤️ for the 3D printing community**

*Keep your filament organized, your prints consistent, and your workshop tidy*

</div>
