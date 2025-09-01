// DOM Elements
const qrForm = document.getElementById('qrForm');
const qrPreview = document.getElementById('qrPreview');
const qrPlaceholder = document.getElementById('qrPlaceholder');
const qrCodeDisplay = document.getElementById('qrCodeDisplay');
const qrData = document.getElementById('qrData');
const downloadBtn = document.getElementById('downloadBtn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');
const printBtn = document.getElementById('printBtn');
const saveToInventoryBtn = document.getElementById('saveToInventoryBtn');

// Form fields
const manufacturerField = document.getElementById('manufacturer');
const materialField = document.getElementById('material');
const customMaterialField = document.getElementById('customMaterial');
const colorField = document.getElementById('color');
const temp1Field = document.getElementById('temp1');
const temp2Field = document.getElementById('temp2');
const colorDetectorBtn = document.getElementById('colorDetectorBtn');

// State
let currentQRData = null;
let currentQRCode = null;
let colorDetector = null;

// Event Listeners
qrForm.addEventListener('submit', handleFormSubmit);
qrForm.addEventListener('reset', handleFormReset);
materialField.addEventListener('change', handleMaterialChange);
downloadBtn.addEventListener('click', downloadPNG);
downloadSvgBtn.addEventListener('click', downloadSVG);
printBtn.addEventListener('click', printQR);
saveToInventoryBtn.addEventListener('click', saveToInventory);
colorDetectorBtn.addEventListener('click', startColorDetection);

// Populate form from URL parameters (if coming from inventory)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('manufacturer')) {
        manufacturerField.value = urlParams.get('manufacturer') || '';
        materialField.value = urlParams.get('material') || '';
        colorField.value = urlParams.get('color') || '';
        temp1Field.value = urlParams.get('temp1') || '';
        temp2Field.value = urlParams.get('temp2') || '';
        
        // Auto-generate if all required fields are present
        if (manufacturerField.value && materialField.value && colorField.value) {
            setTimeout(() => {
                handleFormSubmit({ preventDefault: () => {} });
            }, 100);
        }
    }
});

function handleMaterialChange() {
    const isOther = materialField.value === 'Other';
    
    if (isOther) {
        customMaterialField.classList.remove('hidden');
        customMaterialField.required = true;
        customMaterialField.focus();
    } else {
        customMaterialField.classList.add('hidden');
        customMaterialField.required = false;
        customMaterialField.value = '';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const manufacturer = manufacturerField.value.trim();
    let material = materialField.value;
    const color = colorField.value.trim();
    const temp1 = temp1Field.value || 'NA';
    const temp2 = temp2Field.value || 'NA';
    
    // Handle custom material
    if (material === 'Other') {
        const customMaterial = customMaterialField.value.trim();
        if (!customMaterial) {
            alert('Please enter the custom material type');
            customMaterialField.focus();
            return;
        }
        material = customMaterial;
    }
    
    // Validate required fields
    if (!manufacturer || !material || !color) {
        alert('Please fill in all required fields (Manufacturer, Material, Color)');
        return;
    }
    
    // Create QR data string (same format as scanner expects)
    const qrDataString = [
        manufacturer,
        material,
        color,
        temp1,
        temp2
    ].join('\n');
    
    // Validate and parse data using shared QR processing functions
    const validation = QRProcessor.validateQRData(qrDataString);
    if (!validation.valid) {
        alert('Error creating QR code: ' + validation.error);
        return;
    }
    
    // Store parsed data (ensures same format as scanned codes)
    currentQRData = validation.data;
    
    // Generate QR code
    generateQRCode(qrDataString);
}

function handleFormReset() {
    // Hide preview and show placeholder
    qrPreview.classList.add('hidden');
    qrPlaceholder.classList.remove('hidden');
    
    // Hide custom material field
    customMaterialField.classList.add('hidden');
    customMaterialField.required = false;
    customMaterialField.value = '';
    
    currentQRData = null;
    currentQRCode = null;
}

async function generateQRCode(dataString) {
    try {
        console.log('Generating QR code with data:', dataString);
        
        // Check if QRCode library is available
        if (typeof QRCode === 'undefined' || !QRCode.toCanvas) {
            throw new Error('QRCode library not available');
        }
        
        // Generate QR code using local QRious library via QRCode interface
        const canvas = document.createElement('canvas');
        const options = {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        };
        
        await QRCode.toCanvas(canvas, dataString, options);
        console.log('✅ QR code generated successfully');
        
        // Add text overlay and display
        const enhancedCanvas = addTextOverlayToQR(canvas, currentQRData);
        displayQRCode(enhancedCanvas);
        
    } catch (error) {
        console.error('QR generation failed:', error);
        
        // Try online fallback as last resort
        try {
            console.log('Trying online fallback service...');
            await generateQRCodeOnlineFallback(dataString);
        } catch (fallbackError) {
            console.error('Online fallback also failed:', fallbackError);
            await createPlaceholderQR(dataString);
        }
    }
}

async function generateQRCodeOnlineFallback(dataString) {
    console.log('Attempting online QR service fallback');
    
    return new Promise((resolve, reject) => {
        // Use QR Server API as fallback
        const encodedData = encodeURIComponent(dataString);
        const size = '300x300';
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodedData}&format=png&margin=10`;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            try {
                // Create canvas and draw the QR code
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 300;
                const ctx = canvas.getContext('2d');
                
                // Fill background with white
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the QR code image
                ctx.drawImage(img, 0, 0, 300, 300);
                
                // Add text overlay and display
                const enhancedCanvas = addTextOverlayToQR(canvas, currentQRData);
                displayQRCode(enhancedCanvas);
                
                console.log('Online fallback QR generation successful');
                resolve();
                
            } catch (error) {
                console.error('Error processing online QR image:', error);
                reject(error);
            }
        };
        
        img.onerror = function() {
            const error = new Error('Failed to load QR code from online service');
            console.error('Online QR service failed');
            reject(error);
        };
        
        // Load the QR code image
        img.src = url;
    });
}

// Helper function to display QR code
function displayQRCode(canvas) {
    // Clear previous QR code and add new one
    qrCodeDisplay.innerHTML = '';
    qrCodeDisplay.appendChild(canvas);
    
    // Store canvas reference for downloads
    currentQRCode = canvas;
    
    // Update data display
    updateQRDataDisplay();
    
    // Show preview, hide placeholder
    qrPlaceholder.classList.add('hidden');
    qrPreview.classList.remove('hidden');
}

// Create a placeholder QR code when all else fails
async function createPlaceholderQR(dataString) {
    console.log('Creating placeholder QR code');
    
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Create a simple visual placeholder
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple pattern
    ctx.fillStyle = '#6c757d';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw placeholder text
    ctx.fillText('QR CODE', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '12px Arial';
    ctx.fillText('Generation Failed', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Data: ' + dataString.substring(0, 30) + '...', canvas.width / 2, canvas.height / 2 + 20);
    
    // Add text overlay and display
    const enhancedCanvas = addTextOverlayToQR(canvas, currentQRData);
    displayQRCode(enhancedCanvas);
    
    console.log('Placeholder QR code created');
}


function updateQRDataDisplay() {
    if (!currentQRData) return;
    
    // Use shared QR display format for consistency
    qrData.innerHTML = QRProcessor.createQRDataDisplay(currentQRData);
}

function downloadPNG() {
    if (!currentQRCode) return;
    
    // Create download link
    const link = document.createElement('a');
    link.download = `${currentQRData.Manufacturer}_${currentQRData.Material}_${currentQRData.Color}_QR.png`;
    link.href = currentQRCode.toDataURL('image/png');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function downloadSVG() {
    if (!currentQRData) return;
    
    try {
        const qrDataString = [
            currentQRData.Manufacturer,
            currentQRData.Material,
            currentQRData.Color,
            currentQRData.Temp1,
            currentQRData.Temp2
        ].join('\n');
        
        let svgString = null;
        
        // Try to generate SVG with QRCode library
        if (typeof QRCode !== 'undefined' && QRCode.toString) {
            try {
                svgString = await QRCode.toString(qrDataString, {
                    type: 'svg',
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    errorCorrectionLevel: 'M'
                });
                console.log('SVG generated with QRCode library');
            } catch (qrError) {
                console.log('QRCode SVG generation failed:', qrError.message);
            }
        }
        
        // Fallback: Convert current canvas to SVG if QRCode library failed
        if (!svgString && currentQRCode) {
            console.log('Converting canvas to SVG as fallback');
            svgString = await convertCanvasToSVG(currentQRCode, currentQRData);
        }
        
        // Final fallback: Create simple SVG
        if (!svgString) {
            console.log('Creating simple SVG fallback');
            svgString = createSimpleSVGFallback(qrDataString, currentQRData);
        }
        
        // Add text overlay to SVG if it's a proper QR SVG
        let enhancedSvgString = svgString;
        if (svgString.includes('<rect') && svgString.includes('fill=\"#000000\"')) {
            enhancedSvgString = addTextOverlayToSVG(svgString, currentQRData);
        }
        
        // Create download link
        const blob = new Blob([enhancedSvgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${currentQRData.Manufacturer}_${currentQRData.Material}_${currentQRData.Color}_QR.svg`;
        link.href = url;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error generating SVG:', error);
        alert('SVG download failed. You can try downloading as PNG instead.');
    }
}

// Convert canvas to SVG (fallback method)
async function convertCanvasToSVG(canvas, qrData) {
    const dataUrl = canvas.toDataURL('image/png');
    const width = canvas.width;
    const height = canvas.height;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <image width="${width}" height="${height}" xlink:href="${dataUrl}"/>
    </svg>`;
}

// Create simple SVG fallback
function createSimpleSVGFallback(dataString, qrData) {
    const size = 300;
    const textHeight = 60;
    const totalHeight = size + textHeight;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalHeight}" viewBox="0 0 ${size} ${totalHeight}">
        <rect width="${size}" height="${totalHeight}" fill="white" stroke="#ddd" stroke-width="2"/>
        <rect x="10" y="10" width="${size-20}" height="${size-20}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
        <text x="${size/2}" y="${size/2}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#6c757d">QR CODE</text>
        <text x="${size/2}" y="${size/2 + 20}" text-anchor="middle" font-family="Arial" font-size="12" fill="#6c757d">Generation Failed</text>
        <text x="${size/2}" y="${size + 20}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#000">${qrData.Manufacturer} ${qrData.Material}</text>
        <text x="${size/2}" y="${size + 38}" text-anchor="middle" font-family="Arial" font-size="12" fill="#000">${qrData.Color}</text>
        <text x="${size/2}" y="${size + 53}" text-anchor="middle" font-family="Arial" font-size="10" fill="#000">T1: ${qrData.Temp1}°C | T2: ${qrData.Temp2}°C</text>
    </svg>`;
}

function printQR() {
    if (!currentQRCode) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const imgSrc = currentQRCode.toDataURL('image/png');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code - ${currentQRData.Manufacturer} ${currentQRData.Material}</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                }
                .qr-print {
                    page-break-inside: avoid;
                }
                .qr-image {
                    max-width: 300px;
                    height: auto;
                }
                .qr-info {
                    margin-top: 20px;
                    font-size: 14px;
                }
                .info-row {
                    margin: 5px 0;
                }
                .label {
                    font-weight: bold;
                }
                @media print {
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="qr-print">
                <img src="${imgSrc}" alt="QR Code" class="qr-image">
                <div class="qr-info">
                    <div class="info-row"><span class="label">Manufacturer:</span> ${currentQRData.Manufacturer}</div>
                    <div class="info-row"><span class="label">Material:</span> ${currentQRData.Material}</div>
                    <div class="info-row"><span class="label">Color:</span> ${currentQRData.Color}</div>
                    <div class="info-row"><span class="label">Temp1:</span> ${currentQRData.Temp1}°C</div>
                    <div class="info-row"><span class="label">Temp2:</span> ${currentQRData.Temp2}°C</div>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Wait for image to load, then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
}

function saveToInventory() {
    if (!currentQRData) return;
    
    // Use shared QR processing logic for consistency with scanner
    const success = QRProcessor.addToInventory(currentQRData, {
        allowDuplicates: false,
        showConfirmation: true,
        onSuccess: (data, entries) => {
            console.log('Added generated QR code to inventory:', data);
            // Show success feedback
            saveToInventoryBtn.textContent = 'Saved!';
            saveToInventoryBtn.disabled = true;
            setTimeout(() => {
                saveToInventoryBtn.textContent = 'Save to Inventory';
                saveToInventoryBtn.disabled = false;
            }, 2000);
        },
        onError: (error) => {
            console.log('Save cancelled or failed:', error);
        }
    });
}

// Add text overlay to QR code
function addTextOverlayToQR(originalCanvas, qrData) {
    if (!qrData) return originalCanvas;
    
    // Create a new canvas with extra space for text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate dimensions (add space at bottom for text)
    const qrSize = originalCanvas.width;
    const textHeight = 60; // Space for text at bottom
    canvas.width = qrSize;
    canvas.height = qrSize + textHeight;
    
    // Fill background with white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the original QR code
    ctx.drawImage(originalCanvas, 0, 0);
    
    // Configure text styling
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text information
    const centerX = canvas.width / 2;
    const textStartY = qrSize + 15;
    
    // Line 1: Manufacturer and Material
    ctx.font = 'bold 14px Arial';
    const line1 = `${qrData.Manufacturer} ${qrData.Material}`;
    ctx.fillText(line1, centerX, textStartY);
    
    // Line 2: Color
    ctx.font = '12px Arial';
    ctx.fillText(qrData.Color, centerX, textStartY + 18);
    
    // Line 3: Temperatures (if available)
    if (qrData.Temp1 !== 'NA' || qrData.Temp2 !== 'NA') {
        ctx.font = '10px Arial';
        const tempText = `T1: ${qrData.Temp1}°C | T2: ${qrData.Temp2}°C`;
        ctx.fillText(tempText, centerX, textStartY + 33);
    }
    
    return canvas;
}

// Add text overlay to SVG QR code
function addTextOverlayToSVG(svgString, qrData) {
    if (!qrData) return svgString;
    
    // Parse SVG to get dimensions
    const svgMatch = svgString.match(/width="(\d+)"\s+height="(\d+)"/);
    if (!svgMatch) return svgString;
    
    const qrWidth = parseInt(svgMatch[1]);
    const qrHeight = parseInt(svgMatch[2]);
    const textHeight = 60;
    const newHeight = qrHeight + textHeight;
    
    // Create text elements
    const centerX = qrWidth / 2;
    const textStartY = qrHeight + 20;
    
    let textElements = `
        <!-- Filament Information Text -->
        <text x="${centerX}" y="${textStartY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">
            ${qrData.Manufacturer} ${qrData.Material}
        </text>
        <text x="${centerX}" y="${textStartY + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#000000">
            ${qrData.Color}
        </text>`;
    
    // Add temperature info if available
    if (qrData.Temp1 !== 'NA' || qrData.Temp2 !== 'NA') {
        textElements += `
        <text x="${centerX}" y="${textStartY + 33}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#000000">
            T1: ${qrData.Temp1}°C | T2: ${qrData.Temp2}°C
        </text>`;
    }
    
    // Update SVG dimensions and add text
    let enhancedSvg = svgString
        .replace(/height="\d+"/, `height="${newHeight}"`)
        .replace(/viewBox="0 0 \d+ \d+"/, `viewBox="0 0 ${qrWidth} ${newHeight}"`)
        .replace('</svg>', textElements + '\n</svg>');
    
    // Add white background for the entire SVG including text area
    enhancedSvg = enhancedSvg.replace(
        '<svg',
        `<svg style="background-color: white;"`
    );
    
    return enhancedSvg;
}

// Color detection functions
function startColorDetection() {
    if (!colorDetector) {
        colorDetector = new ColorDetector();
        
        // Set callback for when color is selected
        colorDetector.onColorSelected((colorName) => {
            colorField.value = colorName;
            colorField.focus();
            
            // Show feedback
            const originalText = colorDetectorBtn.textContent;
            colorDetectorBtn.textContent = '✓';
            colorDetectorBtn.style.background = '#22c55e';
            
            setTimeout(() => {
                colorDetectorBtn.textContent = originalText;
                colorDetectorBtn.style.background = '#6366f1';
            }, 2000);
        });
    }
    
    colorDetector.startDetection();
}

// Initialize color detector when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize color detector class
    if (typeof ColorDetector !== 'undefined') {
        console.log('Color detector ready');
    } else {
        console.warn('Color detector not available');
    }
});

// QR library is loaded directly via local file - no waiting needed