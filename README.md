# Claude QR Code Reader

A simple web application for reading QR codes from images.

## Setup

### Install dependencies (optional, for dev server)
```bash
npm install
```

### Run the development server
```bash
npm start
# or
npm run dev
```

The app will open automatically at http://localhost:3000

### Alternative: Open directly
You can also open `index.html` directly in a web browser without a server.

## Features

- Upload QR code images from your computer
- Paste QR code images from clipboard (Ctrl+V / Cmd+V)
- Click "Paste from Clipboard" button to paste
- Drag and drop image files
- Display decoded QR code content
- Clean, responsive interface

## Usage

1. Open `index.html` in a web browser
2. Upload an image containing a QR code using one of these methods:
   - Click "Choose File" to select an image from your computer
   - Click "Paste from Clipboard" after copying an image
   - Press Ctrl+V (Windows/Linux) or Cmd+V (Mac) to paste
   - Drag and drop an image file onto the paste area
3. The QR code content will be displayed automatically
4. Click "Clear" to reset and scan another QR code

## Technologies Used

- HTML5
- CSS3
- JavaScript
- jsQR library for QR code scanning

## Browser Compatibility

Works best in modern browsers that support:
- File API
- Clipboard API
- Canvas API