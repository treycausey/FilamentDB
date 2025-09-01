# Changelog

All notable changes to FilamentDB will be documented in this file.

## [2.0.0] - 2024-12-01

### 🚀 Major New Features

#### ☁️ Cross-Device Cloud Sync
- **NEW**: Complete cloud synchronization system using JSONBin.io
- **Multi-device setup** with secure sharing codes
- **Real-time auto-sync** when adding items via scanner/generator
- **Smart data merging** prevents duplicates across devices
- **Offline-first** design with cloud backup
- **Reset/reconfigure** options for troubleshooting

#### 📷 Enhanced Camera System
- **FIXED**: Camera now opens rear-facing camera by default for QR scanning
- **NEW**: HTTPS development server (`npm run mobile`) for mobile camera access
- **Improved**: Better error messages and troubleshooting guidance
- **Enhanced**: Camera switching between front/rear cameras

### 🧪 Testing & Quality Assurance
- **NEW**: Comprehensive test suite (`tests.html`) with 30+ test cases
- **NEW**: Error handling tests to prevent regressions
- **NEW**: Code validation script (`validate.js`) for quality checks
- **Enhanced**: Better debugging and error reporting

### 📚 Documentation & Support
- **NEW**: Complete API documentation (`API.md`)
- **NEW**: Comprehensive troubleshooting guide (`TROUBLESHOOTING.md`)
- **Updated**: README with current features and cloud sync setup
- **Enhanced**: License documentation (`LICENSES.md`)
- **NEW**: Progressive Web App (PWA) enhancements

### 🔧 Developer Experience
- **NEW**: HTTPS mobile development server with self-signed certificates
- **Enhanced**: Better script organization in `package.json`
- **NEW**: Validation and testing npm scripts
- **Improved**: File structure with better separation of concerns

### 🐛 Bug Fixes
- **FIXED**: Critical auto-sync issue where inventory page used local instead of global cloud storage
- **FIXED**: Try/catch block mismatch in cloud storage upload method
- **FIXED**: Sharing code dialog closing too quickly
- **FIXED**: Inconsistent cloud storage initialization across pages

### 🔄 Breaking Changes
- Bumped version to 2.0.0 due to major cloud sync feature
- Removed unused `bpac-js` dependency
- Updated manifest.json with new PWA configuration

---

## [1.0.0] - 2024-11-01

### Initial Release Features

#### 📷 QR Code Scanner
- Image upload via file picker, drag & drop, or paste
- Live camera scanning with QR code detection
- Recent scans history
- Automatic filament data extraction

#### 🏷️ QR Code Generator  
- Form-based filament data entry
- QR code generation with multiple download formats
- Print functionality
- Color detection via camera
- Direct save to inventory

#### 📦 Inventory Management
- Complete filament database with 285+ supported colors
- Search and filtering capabilities
- Grid and list view modes
- Statistics dashboard
- CSV export/import functionality
- Local storage persistence

#### 🎨 Design System
- Modern Dieter Rams-inspired interface
- Orange (#FF6B35) and yellow (#FFD23F) accent colors
- Mobile-first responsive design
- Clean typography with Inter font family

#### 🏗️ Technical Foundation
- Pure HTML/CSS/JavaScript implementation
- Local QR libraries (jsQR, QRious) 
- Progressive Web App (PWA) support
- Offline-first architecture
- No external dependencies or CDNs

---

## Development Notes

### Version Numbering
- **Major**: Breaking changes or significant new features
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes and small improvements

### Contributing
See [README.md](README.md) for contribution guidelines and development setup instructions.

---

*This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.*