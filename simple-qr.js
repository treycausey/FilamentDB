// Simple QR Code Generator - Fallback implementation
// Uses multiple reliable services for proper QR generation

class SimpleQR {
    static generateQRCode(text, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const size = options.width || 300;
                const errorCorrection = options.errorCorrectionLevel || 'M';
                
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // Try multiple QR generation services in order
                SimpleQR.tryMultipleServices(text, size, errorCorrection)
                    .then(imgSrc => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        
                        img.onload = function() {
                            // Draw image to canvas with white background
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, size, size);
                            ctx.drawImage(img, 0, 0, size, size);
                            resolve(canvas);
                        };
                        
                        img.onerror = function() {
                            console.log('Image failed to load, generating error message');
                            SimpleQR.createErrorMessage(ctx, size, text);
                            resolve(canvas);
                        };
                        
                        img.src = imgSrc;
                    })
                    .catch(error => {
                        console.log('All QR services failed:', error);
                        SimpleQR.createErrorMessage(ctx, size, text);
                        resolve(canvas);
                    });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    static async tryMultipleServices(text, size, errorCorrection) {
        const encodedText = encodeURIComponent(text);
        
        // List of QR generation services to try
        const services = [
            // QR Server API
            `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&format=PNG&ecc=${errorCorrection}`,
            
            // Google Charts API (deprecated but still works)
            `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodedText}&choe=UTF-8&chld=${errorCorrection}|2`,
            
            // QuickChart API
            `https://quickchart.io/qr?text=${encodedText}&size=${size}&format=png&ecc=${errorCorrection}`
        ];
        
        for (const serviceUrl of services) {
            try {
                console.log('Trying QR service:', serviceUrl.split('?')[0]);
                
                // Test if the service works by creating a test image
                const testImg = new Image();
                const testPromise = new Promise((resolve, reject) => {
                    testImg.onload = () => resolve(serviceUrl);
                    testImg.onerror = () => reject('Service failed');
                    setTimeout(() => reject('Service timeout'), 3000);
                });
                
                testImg.crossOrigin = 'anonymous';
                testImg.src = serviceUrl;
                
                const workingUrl = await testPromise;
                console.log('Found working QR service');
                return workingUrl;
                
            } catch (error) {
                console.log('QR service failed, trying next...');
                continue;
            }
        }
        
        throw new Error('All QR generation services failed');
    }
    
    static createErrorMessage(ctx, size, text) {
        // Create a clear error message instead of fake QR code
        ctx.fillStyle = '#f8d7da';
        ctx.fillRect(0, 0, size, size);
        
        // Border
        ctx.strokeStyle = '#f5c6cb';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size-2, size-2);
        
        // Error text
        ctx.fillStyle = '#721c24';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText('QR Generation Failed', size/2, size/2 - 30);
        ctx.font = '12px Arial';
        ctx.fillText('Cannot create scannable QR code', size/2, size/2);
        ctx.fillText('Please check internet connection', size/2, size/2 + 20);
        ctx.fillText('and try again', size/2, size/2 + 40);
        
        // Show partial data
        ctx.font = '10px monospace';
        const dataPreview = text.length > 30 ? text.substring(0, 30) + '...' : text;
        ctx.fillText(`Data: ${dataPreview}`, size/2, size - 20);
    }
    
    static toDataURL(text, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const canvas = await SimpleQR.generateQRCode(text, options);
                resolve(canvas.toDataURL());
            } catch (error) {
                reject(error);
            }
        });
    }
    
    static toCanvas(canvas, text, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const sourceCanvas = await SimpleQR.generateQRCode(text, options);
                const ctx = canvas.getContext('2d');
                canvas.width = sourceCanvas.width;
                canvas.height = sourceCanvas.height;
                ctx.drawImage(sourceCanvas, 0, 0);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
}


// Export for global use
window.SimpleQR = SimpleQR;