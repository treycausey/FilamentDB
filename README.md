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
- Scan QR codes from images, camera, or files
- Drag & drop image upload
- Paste from clipboard (Ctrl+V / Cmd+V)  
- Automatic filament data extraction
- Recent scans history

### 🏷️ QR Code Generator
- Create QR codes for your filament spools
- Professional format with embedded text overlay
- Download as PNG or SVG
- Print-ready output with filament details
- Color detection via camera

### 📦 Inventory Management  
- Complete filament database with 285+ supported colors
- Smart search and filtering
- Sort by manufacturer, material, color, or date
- Statistics dashboard (total entries, unique colors, materials)
- Bulk operations (export, import, clear all)
- Tag-based organization

### 🎨 Supported Materials
- PLA, PLA+, ABS, PETG, TPU
- Wood-filled, Metal-filled, Carbon Fiber
- Custom material types
- Temperature settings (extruder + bed)

## Quick Start

### Prerequisites
- Node.js (for development server) 
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

3. **Start the development server**
   ```bash
   npm start
   ```
   
   The app will open at `http://localhost:3000`

### Alternative: Direct Usage
You can also open `index.html` directly in a web browser without a server for basic functionality.

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
- Grid and list view modes
- Advanced search and filtering
- Sort by any field
- Statistics dashboard
- Export/import functionality
- Tag management

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

### Test Pages
FilamentDB includes comprehensive test suites:

- **`test-e2e.html`**: End-to-end testing of the complete workflow
- **`test-generator-flow.html`**: Generator-specific testing with isolated storage

### Running Tests
1. Start the development server: `npm start`
2. Navigate to test pages:
   - http://localhost:3000/test-e2e.html
   - http://localhost:3000/test-generator-flow.html

## 🏗️ Architecture

### File Structure
```
filamentdb/
├── index.html              # Scanner page (main entry)
├── generator.html           # QR code generator
├── inventory.html           # Inventory management
├── app.js                   # Scanner functionality
├── generator.js             # Generator functionality  
├── inventory.js             # Inventory functionality
├── shared-qr-processing.js  # Shared QR utilities
├── color-detection.js       # Camera color detection
├── color-utils.js           # Color name/hex utilities
├── styles.css               # Complete design system
├── jsqr-local.js            # QR scanning library
├── qrious-local.js          # QR generation library
└── manifest.json            # PWA configuration
```

### Key Technologies
- **HTML5**: Semantic markup, modern APIs
- **CSS3**: Custom properties, Grid, Flexbox
- **JavaScript**: ES6+, Local Storage, Canvas API
- **QR Libraries**: jsQR (scanning), QRious (generation)
- **PWA**: Offline functionality, mobile experience

### Data Storage
- **Local Storage**: All data stored in browser
- **No Database**: Self-contained, no external dependencies
- **Privacy-First**: All data stays on your device

## 🔧 Development

### Available Scripts
- `npm start` / `npm run dev`: Start development server
- `npm run serve`: Alternative HTTP server

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

- **Issues**: Report bugs or request features via GitHub issues
- **Documentation**: Check this README and inline code comments
- **Community**: Share your FilamentDB setup with the 3D printing community

---

<div align="center">

**Made with ❤️ for the 3D printing community**

*Keep your filament organized, your prints consistent, and your workshop tidy*

</div>