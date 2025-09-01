# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This repository contains **FilamentDB**, a comprehensive 3D printing filament inventory management system.

## Project Context

A complete web application for managing 3D printing filament inventory using QR codes. Features scanning, generation, inventory management, and universal printing capabilities.

## Development Setup

### Commands
```bash
# Install dependencies (minimal - mostly for dev server)
npm install

# Run development server (auto-opens browser at localhost:3000)
npm start
# or
npm run dev
```

## Architecture

### Core Pages
- **index.html** - QR code scanner with camera integration, file upload, clipboard paste
- **generator.html** - QR code generator with filament data entry and printing
- **inventory.html** - Complete inventory management with filtering, sorting, statistics

### JavaScript Modules
- **app.js** - Scanner functionality with image processing and recent scans
- **generator.js** - QR generation, printing, and filament data entry
- **inventory.js** - Inventory management, import/export, statistics
- **shared-qr-processing.js** - Common QR data parsing and validation
- **color-detection.js** - Camera-based color detection
- **color-utils.js** - Color name/hex conversion utilities

### Libraries (Local)
- **jsqr-local.js** - QR code scanning (Apache-2.0)
- **qrious-local.js** - QR code generation (GPL-3.0)

### Styling
- **styles.css** - Complete design system with Dieter Rams-inspired aesthetic
- Mobile-first responsive design
- Orange/yellow accent colors
- Clean typography using Inter font

## Key Features
- **Offline-first**: All functionality works without internet
- **Local storage**: All data stays on device
- **Universal printing**: Works with any printer via system dialog
- **PWA ready**: Installable web app
- **Comprehensive testing**: E2E and isolated test suites

## Print Warning System
The app includes navigation warnings to prevent data loss when users print QR codes but don't save them to inventory.