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
const remainingField = document.getElementById('remaining');
const colorDetectorBtn = document.getElementById('colorDetectorBtn');
const colorSuggestBtn = document.getElementById('colorSuggestBtn');

// State
let currentQRData = null;
let currentQRCode = null;
let colorDetector = null;
let suggestedColorHex = null; // holds HEX chosen from suggestions
let hasPrinted = false;
let hasSavedToInventory = false;

// Event Listeners
qrForm.addEventListener('submit', handleFormSubmit);
qrForm.addEventListener('reset', handleFormReset);
materialField.addEventListener('change', handleMaterialChange);
downloadBtn.addEventListener('click', downloadPNG);
downloadSvgBtn.addEventListener('click', downloadSVG);
printBtn.addEventListener('click', printQR);
saveToInventoryBtn.addEventListener('click', saveToInventory);
colorDetectorBtn.addEventListener('click', startColorDetection);
if (colorSuggestBtn) colorSuggestBtn.addEventListener('click', suggestColorFromInput);

// Populate form from URL parameters (if coming from inventory)
document.addEventListener('DOMContentLoaded', () => {
    // Initialize cloud storage if available
    if (typeof CloudStorage !== 'undefined') {
        window.cloudStorage = new CloudStorage();
    }
    // Ensure Suggest button is wired even if script loaded early
    const btn = document.getElementById('colorSuggestBtn');
    if (btn && !btn.dataset.boundSuggest) {
        btn.addEventListener('click', suggestColorFromInput);
        btn.dataset.boundSuggest = '1';
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('manufacturer')) {
        manufacturerField.value = urlParams.get('manufacturer') || '';
        materialField.value = urlParams.get('material') || '';
        colorField.value = urlParams.get('color') || '';
        temp1Field.value = urlParams.get('temp1') || '';
        temp2Field.value = urlParams.get('temp2') || '';
        remainingField.value = urlParams.get('remaining') || '100';
        
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

// Suggest color name via filamentcolors.xyz
async function suggestColorFromInput() {
    try {
        if (!window.FCX) {
            alert('Color suggestions are unavailable. Open Settings → Color Suggestions to build local snapshots.');
            return;
        }
        const hex = normalizeToHex(ColorUtils.getColorHex(colorField.value || ''));
        const material = materialField.value || undefined;
        const choice = await showManufacturerSuggestionsDialogForGen(hex, material, '');
        if (choice) { colorField.value = choice.label; suggestedColorHex = choice.hex || null; }
    } catch (e) {
        console.error('Suggest color failed:', e);
        alert('Could not fetch suggestions. Try again after opening Settings → Color Suggestions.');
    }
}

// Use normalizeToHex from SharedUtils
const normalizeToHex = SharedUtils.normalizeToHex;

// Use showColorSuggestionsDialog from SharedUtils  
const showColorSuggestionsDialog = (suggestions, hex) => 
    SharedUtils.showColorSuggestionsDialog(suggestions, hex, { cancelText: 'Cancel', titleText: 'Current' });

async function showManufacturerSuggestionsDialogForGen(hex, material, defaultMfr) {
    if (!window.FCX) return null;
    const mfrs = await FCX.getManufacturers();
    return new Promise(async (resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='10000';
        const panel = document.createElement('div');
        panel.style.position='absolute'; panel.style.top='50%'; panel.style.left='50%'; panel.style.transform='translate(-50%, -50%)';
        panel.style.background='#fff'; panel.style.borderRadius='12px'; panel.style.padding='16px'; panel.style.width='min(520px, 95vw)'; panel.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)';
        const title = document.createElement('div'); title.style.fontWeight='700'; title.style.marginBottom='8px'; title.textContent='Color suggestions (filamentcolors.xyz)';
        const sub = document.createElement('div'); sub.style.fontSize='12px'; sub.style.color='#666'; sub.style.marginBottom='8px'; sub.textContent=`Current ${hex.toUpperCase()} · Material ${material||'any'}`;
        const select = document.createElement('select'); select.style.width='100%'; select.style.marginBottom='8px'; select.style.padding='8px'; select.style.border='1px solid #eee'; select.style.borderRadius='8px';
        const optAll = document.createElement('option'); optAll.value=''; optAll.textContent='All manufacturers'; select.appendChild(optAll);
        mfrs.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; select.appendChild(o); });
        if (defaultMfr) select.value = defaultMfr;
        const list = document.createElement('div'); list.style.display='flex'; list.style.flexDirection='column'; list.style.gap='8px'; list.style.maxHeight='50vh'; list.style.overflow='auto';
        const cancel = document.createElement('button'); cancel.textContent='Cancel'; cancel.style.marginTop='12px'; cancel.style.padding='8px 10px'; cancel.style.border='1px solid #ddd'; cancel.style.borderRadius='8px'; cancel.style.cursor='pointer';
        cancel.addEventListener('click', ()=>{ cleanup(); resolve(null); });
        panel.appendChild(title); panel.appendChild(sub); panel.appendChild(select); panel.appendChild(list); panel.appendChild(cancel); overlay.appendChild(panel); document.body.appendChild(overlay);

        async function reload() {
            list.innerHTML='Loading…';
            if (window.FCX && typeof FCX.getSnapshotStatus === 'function') {
                await FCX.getSnapshotStatus();
                await new Promise(r=>setTimeout(r,100));
            }
            let sugg = await FCX.listSuggestions(hex, material, select.value || null, 5);
            list.innerHTML='';
            if (!sugg || !sugg.length) {
                if ((select.value||'')) {
                    const all = await FCX.listSuggestions(hex, material, null, 5);
                    if (all && all.length) {
                        const hint=document.createElement('div'); hint.style.color='#666'; hint.style.marginBottom='6px'; hint.textContent='No matches for this manufacturer. Show results from all manufacturers?';
                        const btn=document.createElement('button'); btn.textContent='Show All'; btn.style.marginLeft='8px'; btn.style.padding='4px 8px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer';
                        btn.addEventListener('click', ()=>{ select.value=''; reload(); });
                        const wrap=document.createElement('div'); wrap.appendChild(hint); wrap.appendChild(btn); list.appendChild(wrap); return;
                    }
                }
                try { const st = await FCX.getSnapshotStatus(); if (!st.loaded || st.loaded.length===0) { const msg=document.createElement('div'); msg.style.color='#666'; msg.innerHTML='No local color snapshots found. Build them in Settings → Color Suggestions.'; const a=document.createElement('a'); a.textContent='Open Settings'; a.href='settings.html'; a.className='refine-color'; const wrap=document.createElement('div'); wrap.appendChild(msg); wrap.appendChild(a); list.appendChild(wrap); return; } } catch {}
                const none=document.createElement('div'); none.textContent='No suggestions.'; none.style.color='#666'; list.appendChild(none); return;
            }
            sugg.forEach(s => {
                const btn = document.createElement('button');
                btn.textContent = `${s.color_name}${s.manufacturer ? ' ('+s.manufacturer+')' : ''} · ΔE ${s.distance ?? ''}`;
                btn.style.padding='8px 10px'; btn.style.border='1px solid #eee'; btn.style.borderRadius='8px'; btn.style.cursor='pointer'; btn.style.textAlign='left';
                btn.addEventListener('click', ()=>{ cleanup(); resolve({ label: btn.textContent.split(' · ')[0], hex: s.hex_color || '' }); });
                list.appendChild(btn);
            });
        }
        select.addEventListener('change', reload);
        reload();
        function cleanup(){ try{ document.body.removeChild(overlay); } catch{} }
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const manufacturer = manufacturerField.value.trim();
    let material = materialField.value;
    const color = colorField.value.trim();
    const temp1 = temp1Field.value || 'NA';
    const temp2 = temp2Field.value || 'NA';
    const remaining = remainingField.value || '100';
    
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
    if (suggestedColorHex) currentQRData.ColorHex = suggestedColorHex.toUpperCase();
    // Add remaining percentage to the parsed data
    currentQRData.remainingPercentage = parseInt(remaining) || 100;
    
    // Reset tracking flags for new QR code
    hasPrinted = false;
    hasSavedToInventory = false;
    
    // Generate QR code
    generateQRCode(qrDataString);
}

function handleFormReset() {
    // Hide preview and show placeholder
    qrPreview.classList.add('hidden');
    qrPlaceholder.classList.remove('hidden');
    
    // Hide custom material field and reset remaining percentage
    customMaterialField.classList.add('hidden');
    customMaterialField.required = false;
    customMaterialField.value = '';
    remainingField.value = '100';
    
    currentQRData = null;
    currentQRCode = null;
    hasPrinted = false;
    hasSavedToInventory = false;
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
    const hexPart = currentQRData.ColorHex ? `_HEX-${currentQRData.ColorHex.replace('#','')}` : '';
    link.download = `${currentQRData.Manufacturer}_${currentQRData.Material}_${currentQRData.Color}${hexPart}_QR.png`;
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
        const hexPart = currentQRData.ColorHex ? `_HEX-${currentQRData.ColorHex.replace('#','')}` : '';
        link.download = `${currentQRData.Manufacturer}_${currentQRData.Material}_${currentQRData.Color}${hexPart}_QR.svg`;
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
    
    // Generate a high-resolution QR code for printing
    const canvas = document.createElement('canvas');
    const qrSize = 400; // Higher resolution for crisp printing
    canvas.width = qrSize;
    canvas.height = qrSize;
    
    // Get the QR data string
    const qrDataString = [
        currentQRData.Manufacturer,
        currentQRData.Material,
        currentQRData.Color,
        currentQRData.Temp1,
        currentQRData.Temp2
    ].join('\n');
    
    // Generate high-res QR code
    if (typeof QRious !== 'undefined') {
        new QRious({
            element: canvas,
            value: qrDataString,
            size: qrSize,
            foreground: '#000000',
            background: '#FFFFFF'
        });
    }
    
    const imgSrc = canvas.toDataURL('image/png');
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code - ${currentQRData.Manufacturer} ${currentQRData.Material}</title>
            <style>
                @media print {
                    @page { margin: 0.5in; size: auto; }
                    body { margin: 0; padding: 0; }
                }
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    background: white;
                }
                .qr-print {
                    page-break-inside: avoid;
                }
                .qr-image {
                    width: 300px;
                    height: 300px;
                    margin-bottom: 20px;
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                }
            </style>
        </head>
        <body>
            <div class="qr-print">
                <img src="${imgSrc}" alt="QR Code" class="qr-image">
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
            hasPrinted = true; // Mark as printed
        }, 500);
    };
}

function saveToInventory() {
    if (!currentQRData) return;
    
    // Use shared QR processing logic for consistency with scanner
    const success = QRProcessor.addToInventory(currentQRData, {
        allowDuplicates: false,
        showConfirmation: true,
        onSuccess: (data, entries, actionType) => {
            console.log('Added generated QR code to inventory:', data);
            hasSavedToInventory = true; // Mark as saved
            // Show success feedback based on action type
            if (actionType === 'spool_incremented') {
                saveToInventoryBtn.textContent = `Spool Count: ${data.spoolCount}`;
            } else {
                saveToInventoryBtn.textContent = 'Saved!';
            }
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

    // Optional HEX line
    let nextY = textStartY + 33;
    if (qrData.ColorHex) {
        ctx.font = '10px Arial';
        ctx.fillText(`HEX: ${qrData.ColorHex.toUpperCase()}`, centerX, nextY);
        nextY += 15;
    }

    // Temperatures (if available)
    if (qrData.Temp1 !== 'NA' || qrData.Temp2 !== 'NA') {
        ctx.font = '10px Arial';
        const tempText = `T1: ${qrData.Temp1}°C | T2: ${qrData.Temp2}°C`;
        ctx.fillText(tempText, centerX, nextY);
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
    
    // Add HEX if present
    let nextY = textStartY + 33;
    if (qrData.ColorHex) {
        textElements += `
        <text x="${centerX}" y="${textStartY + 33}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#000000">
            HEX: ${qrData.ColorHex}
        </text>`;
        nextY = textStartY + 48;
    }

    // Add temperature info if available
    if (qrData.Temp1 !== 'NA' || qrData.Temp2 !== 'NA') {
        textElements += `
        <text x="${centerX}" y="${nextY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#000000">
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

// Warning dialog for unsaved printed QR codes
window.addEventListener('beforeunload', function(e) {
    // Show warning if user has printed but not saved to inventory
    if (hasPrinted && !hasSavedToInventory && currentQRData) {
        const message = 'You have printed a QR code but haven\'t saved it to inventory. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
    }
});
