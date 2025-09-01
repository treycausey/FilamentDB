# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This repository contains the Claude QR Code Reader web application.

## Project Context

Originally named "filament_inventory" for tracking 3D printing filament, currently implements a QR code reader webapp.

## Development Setup

### Commands
```bash
# Install dependencies
npm install

# Run development server (auto-opens browser at localhost:3000)
npm start
# or
npm run dev
```

## Architecture

- **index.html** - Main HTML structure with file upload, clipboard paste, and result display areas
- **styles.css** - Responsive styling with gradient background and modern UI
- **app.js** - JavaScript handling file uploads, clipboard paste, QR code scanning using jsQR library
- Uses CDN-hosted jsQR library for QR code decoding