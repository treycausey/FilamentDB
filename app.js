const fileInput = document.getElementById('fileInput');
const pasteButton = document.getElementById('pasteButton');
const pasteArea = document.getElementById('pasteArea');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const errorMessage = document.getElementById('errorMessage');
const clearButton = document.getElementById('clearButton');
const saveButton = document.getElementById('saveButton');
const recentList = document.getElementById('recentList');
const cameraButton = document.getElementById('cameraButton');
const cameraModal = document.getElementById('cameraModal');
const closeCameraButton = document.getElementById('closeCameraButton');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const switchCameraButton = document.getElementById('switchCameraButton');
const scanStatus = document.getElementById('scanStatus');

let currentParsedData = null;
let currentStream = null;
let isScanning = false;
let cameras = [];
let currentCameraIndex = 0;
let currentFacingMode = 'environment'; // Start with rear camera
const STORAGE_KEY = 'qrCodeEntries';

fileInput.addEventListener('change', handleFileSelect);
pasteButton.addEventListener('click', handlePasteClick);
clearButton.addEventListener('click', clearAll);
saveButton.addEventListener('click', saveCurrentEntry);
cameraButton.addEventListener('click', startCamera);
closeCameraButton.addEventListener('click', stopCamera);
closeCameraBtn.addEventListener('click', stopCamera);
switchCameraButton.addEventListener('click', switchCamera);

document.addEventListener('paste', handlePaste);
document.addEventListener('DOMContentLoaded', () => {
    loadRecentScans();
    
    // Initialize cloud storage if available
    if (typeof CloudStorage !== 'undefined') {
        window.cloudStorage = new CloudStorage();
    }
});

pasteArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    pasteArea.classList.add('active');
});

pasteArea.addEventListener('dragleave', () => {
    pasteArea.classList.remove('active');
});

pasteArea.addEventListener('drop', (e) => {
    e.preventDefault();
    pasteArea.classList.remove('active');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processImageFile(files[0]);
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    } else {
        showError('Please select a valid image file.');
    }
}

async function handlePasteClick() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
                if (type.startsWith('image/')) {
                    const blob = await clipboardItem.getType(type);
                    processImageFile(blob);
                    return;
                }
            }
        }
        showError('No image found in clipboard. Copy an image and try again.');
    } catch (err) {
        showError('Unable to access clipboard. Please use Ctrl+V/Cmd+V instead.');
    }
}

function handlePaste(e) {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            processImageFile(blob);
            e.preventDefault();
            return;
        }
    }
}

function processImageFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageSrc = e.target.result;
        previewImage.src = imageSrc;
        imagePreview.classList.remove('hidden');
        
        const img = new Image();
        img.onload = function() {
            scanQRCode(img);
        };
        img.src = imageSrc;
    };
    
    reader.onerror = function() {
        showError('Failed to read the image file.');
    };
    
    reader.readAsDataURL(file);
}

function scanQRCode(img) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
    });
    
    if (code) {
        displayResult(code.data);
        hideError();
    } else {
        const invertedCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "onlyInvert",
        });
        
        if (invertedCode) {
            displayResult(invertedCode.data);
            hideError();
        } else {
            const attemptBoth = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
            });
            
            if (attemptBoth) {
                displayResult(attemptBoth.data);
                hideError();
            } else {
                showError('No QR code found in the image. Please ensure the image contains a valid QR code.');
                resultSection.classList.add('hidden');
            }
        }
    }
}

function displayResult(data) {
    // Parse the QR code data
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
        showError(`Invalid QR code format. Missing required fields: ${missingFields.join(', ')}`);
        resultSection.classList.add('hidden');
        currentParsedData = null;
        return;
    }
    
    // Set NA for missing temperature fields
    if (!parsedData.Temp1) parsedData.Temp1 = 'NA';
    if (!parsedData.Temp2) parsedData.Temp2 = 'NA';
    
    // Store current parsed data with timestamp
    currentParsedData = {
        ...parsedData,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
    };
    
    // Display the parsed data in a formatted way
    const formattedHTML = `
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
        </div>
        <div class="raw-data">
            <details>
                <summary>Raw QR Code Data</summary>
                <pre>${data}</pre>
            </details>
        </div>
    `;
    
    resultContent.innerHTML = formattedHTML;
    resultSection.classList.remove('hidden');
    saveButton.disabled = false;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function clearAll() {
    fileInput.value = '';
    previewImage.src = '';
    imagePreview.classList.add('hidden');
    resultSection.classList.add('hidden');
    hideError();
    currentParsedData = null;
    saveButton.disabled = false;
}

// Storage functions
function getStoredEntries() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveToStorage(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function saveCurrentEntry() {
    if (!currentParsedData) return;
    
    const entries = getStoredEntries();
    entries.unshift(currentParsedData); // Add to beginning
    saveToStorage(entries);
    
    // Show success feedback
    saveButton.textContent = 'Saved!';
    saveButton.disabled = true;
    setTimeout(() => {
        saveButton.textContent = 'Save Entry';
    }, 2000);
    
    loadRecentScans();
}

function loadRecentScans() {
    const entries = getStoredEntries();
    const recent = entries.slice(0, 5); // Show last 5 scans
    
    if (recent.length === 0) {
        recentList.innerHTML = '<p class="no-recent">No recent scans</p>';
        return;
    }
    
    recentList.innerHTML = recent.map(entry => `
        <div class="recent-item">
            <div class="recent-info">
                <strong>${entry.Manufacturer}</strong> - ${entry.Material} (${entry.Color})
                <div class="recent-meta">
                    T1: ${entry.Temp1}° | T2: ${entry.Temp2}° | ${new Date(entry.timestamp).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

// Camera Functions
async function startCamera() {
    try {
        // Get available cameras
        await getCameras();
        
        // Request camera access - always prefer rear camera for QR scanning
        const constraints = {
            video: {
                facingMode: currentFacingMode, // Use current facing mode
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = currentStream;
        
        // Show modal and start scanning
        cameraModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Wait for video to load
        cameraVideo.addEventListener('loadedmetadata', () => {
            isScanning = true;
            scanQRFromCamera();
            updateScanStatus('Scanning for QR codes...');
        });
        
        // Update UI
        switchCameraButton.style.display = cameras.length > 1 ? 'block' : 'none';
        
    } catch (error) {
        console.error('Error starting camera:', error);
        
        let errorMessage = 'Unable to access camera. ';
        let suggestions = [];
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. ';
            suggestions = [
                'Allow camera permissions in your browser',
                'Check device settings for camera permissions',
                'Try refreshing the page and allowing camera access'
            ];
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. ';
            suggestions = [
                'Make sure your device has a camera',
                'Check if camera is being used by another app',
                'Try restarting your browser'
            ];
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Camera not supported. ';
            suggestions = [
                'This might be due to HTTP instead of HTTPS',
                'Try using: npm run mobile (with HTTPS)',
                'Use file upload instead of camera scanning'
            ];
        } else if (error.name === 'SecurityError') {
            errorMessage = 'Camera access blocked by security policy. ';
            suggestions = [
                'HTTPS is required for camera access on mobile',
                'Use: npm run mobile (enables HTTPS)',
                'Accept the certificate warning when prompted'
            ];
        } else {
            suggestions = [
                'Try using HTTPS: npm run mobile',
                'Check camera permissions in browser settings',
                'Use file upload as alternative'
            ];
        }
        
        // Create detailed error message
        const detailedError = errorMessage + '\n\nTroubleshooting:\n• ' + suggestions.join('\n• ');
        showError(detailedError);
    }
}

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras = devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('Error getting cameras:', error);
        cameras = [];
    }
}

async function switchCamera() {
    // Toggle between front and rear camera
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Stop current stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    
    // Start with new camera
    try {
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = currentStream;
        
        const cameraType = currentFacingMode === 'environment' ? 'Rear' : 'Front';
        updateScanStatus(`Switched to ${cameraType} camera - Scanning...`);
        
    } catch (error) {
        console.error('Error switching camera:', error);
        showError('Unable to switch camera.');
        // Revert on failure
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    }
}

function stopCamera() {
    isScanning = false;
    
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    cameraModal.classList.add('hidden');
    document.body.style.overflow = '';
    cameraVideo.srcObject = null;
    
    updateScanStatus('Point camera at QR code');
}

function scanQRFromCamera() {
    if (!isScanning || cameraVideo.readyState !== cameraVideo.HAVE_ENOUGH_DATA) {
        if (isScanning) {
            requestAnimationFrame(scanQRFromCamera);
        }
        return;
    }
    
    const canvas = cameraCanvas;
    const context = canvas.getContext('2d');
    
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    
    context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
    });
    
    if (code) {
        // QR code found!
        isScanning = false;
        updateScanStatus('QR Code detected! Processing...');
        
        // Process the QR code data
        displayResult(code.data);
        hideError();
        
        // Stop camera after a short delay
        setTimeout(() => {
            stopCamera();
        }, 1000);
        
        return;
    }
    
    // Continue scanning
    if (isScanning) {
        requestAnimationFrame(scanQRFromCamera);
    }
}

function updateScanStatus(message) {
    scanStatus.textContent = message;
}