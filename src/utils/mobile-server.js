#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get local network IP address
function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal/loopback addresses and IPv6
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    
    return 'localhost';
}

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// Generate self-signed certificate for HTTPS (development only)
function generateCertificate() {
    try {
        // Try to use openssl command to generate certificate
        const { execSync } = require('child_process');
        const certPath = path.join(__dirname, '.temp-cert.pem');
        const keyPath = path.join(__dirname, '.temp-key.pem');
        
        // Check if cert already exists and is recent (less than 30 days old)
        try {
            const stats = fs.statSync(certPath);
            const ageMs = Date.now() - stats.mtime.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            if (ageDays < 30) {
                return {
                    cert: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath)
                };
            }
        } catch (e) {
            // Certificate doesn't exist, continue to create it
        }
        
        console.log('📜 Generating self-signed certificate for HTTPS...');
        
        execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 30 -nodes -subj "/C=US/ST=Dev/L=Dev/O=FilamentDB/CN=localhost" 2>/dev/null`, {stdio: 'ignore'});
        
        return {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath)
        };
    } catch (error) {
        console.log('⚠️  Could not generate certificate, falling back to HTTP');
        console.log('   Camera access may be limited on mobile devices');
        return null;
    }
}

// Simple HTTP/HTTPS server
function createServer(port, host, useHttps = false) {
    const requestHandler = (req, res) => {
            let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
            
            // Security: prevent directory traversal
            if (filePath.includes('..')) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        // File not found - try index.html for SPA routing
                        fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
                            if (err2) {
                                res.writeHead(404);
                                res.end('404 Not Found');
                            } else {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(data2);
                            }
                        });
                    } else {
                        res.writeHead(500);
                        res.end('Internal Server Error');
                    }
                    return;
                }
                
                const ext = path.extname(filePath);
                const mimeType = mimeTypes[ext] || 'application/octet-stream';
                
                res.writeHead(200, { 'Content-Type': mimeType });
                res.end(data);
            });
        };

    if (useHttps) {
        const credentials = generateCertificate();
        if (credentials) {
            return https.createServer(credentials, requestHandler);
        } else {
            // Fall back to HTTP if certificate generation fails
            return http.createServer(requestHandler);
        }
    } else {
        return http.createServer(requestHandler);
    }
}

// Main CLI function
function startMobileServer() {
    const port = process.env.PORT || 3000;
    const httpsPort = parseInt(port) + 1; // HTTPS on port + 1
    const networkIP = getNetworkIP();
    const useHttps = process.env.HTTPS !== 'false'; // Default to HTTPS
    
    // Try HTTPS first, fallback to HTTP
    const server = createServer(httpsPort, networkIP, useHttps);
    const isHttpsServer = server instanceof https.Server;
    const actualPort = isHttpsServer ? httpsPort : port;
    const protocol = isHttpsServer ? 'https' : 'http';
    
    server.listen(actualPort, '0.0.0.0', () => {
        console.log('\n🚀 FilamentDB Mobile Server Started!\n');
        
        if (isHttpsServer) {
            console.log('🔒 HTTPS enabled for camera access on mobile devices');
            console.log('📱 Access from your phone (CAMERA ENABLED):');
            console.log(`   ${protocol}://${networkIP}:${actualPort}`);
            console.log('\n💻 Local access:');
            console.log(`   ${protocol}://localhost:${actualPort}`);
            console.log('\n⚠️  Certificate Warning:');
            console.log('   Your browser will show a security warning for self-signed certificate');
            console.log('   Click "Advanced" → "Continue to site" to proceed');
            console.log('   This is safe for local development');
        } else {
            console.log('⚠️  HTTP fallback - camera access may be limited on mobile');
            console.log('📱 Access from your phone (LIMITED CAMERA):');
            console.log(`   ${protocol}://${networkIP}:${actualPort}`);
            console.log('\n💻 Local access:');
            console.log(`   ${protocol}://localhost:${actualPort}`);
        }
        
        console.log('\n📋 Mobile Setup Instructions:');
        console.log('   1. Connect your phone to the same Wi-Fi network');
        console.log('   2. Open the mobile URL above in your phone browser');
        if (isHttpsServer) {
            console.log('   3. Accept the certificate warning (tap "Advanced" → "Continue")');
            console.log('   4. Add to Home Screen for app-like experience');
        } else {
            console.log('   3. Add to Home Screen for app-like experience');
            console.log('   Note: Camera may not work due to HTTPS requirement');
        }
        
        console.log('\n📱 Add to Home Screen:');
        console.log('   • iPhone: Share button → "Add to Home Screen"');
        console.log('   • Android: Menu (⋯) → "Add to Home Screen"');
        console.log('\n🛑 Press Ctrl+C to stop the server');
        console.log('');
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down mobile server...');
        server.close(() => {
            console.log('✅ Server stopped successfully');
            process.exit(0);
        });
    });
    
    // Error handling
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${port} is already in use.`);
            console.error('   Try a different port: PORT=3001 npm run mobile');
        } else {
            console.error('❌ Server error:', err.message);
        }
        process.exit(1);
    });
}

// Run if called directly
if (require.main === module) {
    startMobileServer();
}

module.exports = { startMobileServer, getNetworkIP };