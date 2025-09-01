# FilamentDB Troubleshooting Guide

This guide helps resolve common issues with FilamentDB. If you encounter problems not covered here, please check the [GitHub Issues](https://github.com/your-username/filamentdb/issues) or create a new issue.

## 📱 Camera Issues

### Camera Opens Front Camera Instead of Rear Camera

**Problem**: Camera opens in selfie mode instead of rear-facing camera for QR scanning.

**Solutions**:
1. **Check Browser Support**: Ensure you're using a modern browser (Chrome/Firefox 90+)
2. **Refresh and Retry**: Close camera modal and try again
3. **Use Switch Camera**: Click the "Switch Camera" button in the camera interface
4. **Clear Browser Cache**: Clear browser cache and reload the page

**Technical Details**: FilamentDB is configured to prefer `facingMode: 'environment'` (rear camera) by default.

### Camera Access Denied / Permission Error

**Problem**: Browser blocks camera access with permission denied error.

**Solutions**:
1. **Grant Permissions**:
   - Click the camera icon in address bar
   - Select "Allow" for camera access
   - Refresh the page

2. **Check Browser Settings**:
   - Go to browser settings → Privacy → Camera
   - Ensure FilamentDB site is allowed
   - Remove any blocked entries

3. **HTTPS Requirement**:
   ```bash
   # Use HTTPS development server
   npm run mobile
   ```
   Accept the security warning for localhost

### Camera Not Found / No Camera Available

**Problem**: "No camera found" error on devices with cameras.

**Solutions**:
1. **Check Device**: Ensure your device has a camera
2. **Close Other Apps**: Close other apps using the camera
3. **Restart Browser**: Close and reopen your browser
4. **Try Different Browser**: Test with Chrome, Firefox, or Safari

### Camera Works on Desktop but Not Mobile

**Problem**: Camera functions on desktop but fails on mobile devices.

**Solutions**:
1. **Use HTTPS**: Mobile browsers require HTTPS for camera access
   ```bash
   npm run mobile
   ```
2. **Accept Certificate Warning**: Accept the self-signed certificate warning
3. **Mobile Browser**: Use Chrome or Safari on mobile
4. **Alternative**: Use file upload instead of live camera

## ☁️ Cloud Sync Issues

### "Setup failed: Cloud storage not configured"

**Problem**: Cloud sync setup fails during configuration.

**Solutions**:
1. **Check API Key**: Ensure you copied the complete API key from JSONBin.io
2. **Verify Account**: Confirm your JSONBin.io account is active
3. **Network Connection**: Check internet connectivity
4. **Try Again**: Wait a moment and retry setup

**Debug Steps**:
1. Open browser console (F12)
2. Look for detailed error messages
3. Check network tab for failed requests

### Cloud Sync Shows Different Item Counts on Devices

**Problem**: Mobile shows X items, desktop shows Y items after sync.

**Solutions**:
1. **Manual Sync**: Click "Cloud Sync" → Option 1 (Sync now) on both devices
2. **Reset if Needed**: If issue persists:
   - Go to "Cloud Sync" → Option 3 (Reset)
   - Set up cloud sync again with same sharing code
3. **Check Network**: Ensure both devices have internet access

### "Invalid bin ID provided" Error

**Problem**: Error when connecting additional device with sharing code.

**Solutions**:
1. **Check Sharing Code Format**: Should be `API_KEY|BIN_ID`
2. **Copy Exactly**: Don't add extra characters or spaces
3. **Generate New Code**: From first device:
   - Cloud Sync → Option 2 (Show sharing info)
   - Copy the exact code shown
4. **Fresh Setup**: Reset cloud storage on first device if needed

### Sharing Code Text Box Closes Too Quickly

**Problem**: Can't copy sharing code before it disappears.

**Solutions**:
- **Manual Close**: The sharing code now stays open until you click "✕ Close"
- **Multiple Copies**: You can generate sharing codes multiple times
- **Save Safely**: Write down or email yourself the sharing code

### Auto-Sync Not Working

**Problem**: Items added via scanner don't automatically sync to cloud.

**Solutions**:
1. **Check Cloud Status**: Ensure cloud sync is configured and enabled
2. **Network Access**: Verify internet connectivity when adding items
3. **Manual Sync**: Use manual sync if auto-sync fails
4. **Console Check**: Open browser console for sync error messages

## 📷 QR Code Scanning Issues

### QR Code Not Detected in Images

**Problem**: Valid QR codes in images not being recognized.

**Solutions**:
1. **Image Quality**: Use high-resolution, clear images
2. **Lighting**: Ensure good contrast between QR code and background
3. **File Format**: Use common formats (JPG, PNG, WebP)
4. **Multiple Attempts**: Try scanning the same QR code multiple times
5. **Different Source**: Try generating the QR code again with higher resolution

### Invalid QR Code Format Error

**Problem**: QR code scans but shows "Invalid QR code format" error.

**Expected Format**:
```
Manufacturer
Material  
Color
Temperature1
Temperature2
```

**Solutions**:
1. **Check Format**: Ensure QR code follows the 5-line format above
2. **Required Fields**: Manufacturer, Material, and Color are required
3. **Generate Correctly**: Use FilamentDB's generator to create proper QR codes
4. **Line Breaks**: Each field should be on a separate line

### "No QR code found in the image"

**Problem**: Scanner can't detect any QR code in the image.

**Solutions**:
1. **Image Clarity**: Use sharp, well-lit images
2. **QR Code Size**: Ensure QR code takes up significant portion of image
3. **No Obstructions**: Remove any covers or reflections from QR code
4. **Different Angles**: Try images from different angles
5. **Regenerate**: Create a new QR code if original is damaged

## 💾 Data Storage Issues

### Inventory Items Disappearing

**Problem**: Saved inventory items are missing after reopening FilamentDB.

**Causes & Solutions**:
1. **Private Browsing**: Items aren't saved in private/incognito mode
   - Use regular browsing mode for persistent storage

2. **Browser Cache Cleared**: Browser data was cleared
   - Enable cloud sync to prevent data loss
   - Export inventory regularly as backup

3. **Different Domain/Port**: Accessing FilamentDB from different URL
   - Use consistent URL (same domain and port)
   - Each origin has separate localStorage

### Export/Import Not Working

**Problem**: CSV export or import functionality fails.

**Solutions**:
1. **File Format**: Ensure CSV follows proper format:
   ```csv
   Manufacturer,Material,Color,Temp1,Temp2,Date
   "Hatchbox","PLA","Black","210","60","2024-12-01T00:00:00.000Z"
   ```

2. **File Encoding**: Save CSV files as UTF-8
3. **Quote Fields**: Fields with commas must be quoted
4. **Browser Downloads**: Check browser download folder for exported files

### LocalStorage Quota Exceeded

**Problem**: Error saving large amounts of inventory data.

**Solutions**:
1. **Enable Cloud Sync**: Move data to cloud storage
2. **Export Old Data**: Export and remove old inventory entries
3. **Clear Other Data**: Remove unnecessary browser data from other sites

## 🌐 Network and Connectivity

### "Failed to fetch" Errors

**Problem**: Network requests failing during cloud sync.

**Solutions**:
1. **Check Internet**: Verify internet connectivity
2. **Firewall/Antivirus**: Ensure FilamentDB isn't blocked
3. **JSONBin.io Status**: Check if JSONBin.io service is operational
4. **Retry Later**: Temporary network issues may resolve automatically

### CORS or Security Errors

**Problem**: Browser blocks requests due to security policies.

**Solutions**:
1. **Use HTTPS**: Run `npm run mobile` for HTTPS development server
2. **Disable Extensions**: Try disabling browser extensions
3. **Different Browser**: Test with different browser

## 🖥️ Development and Setup Issues

### "npm start" Command Not Found

**Problem**: npm commands fail or aren't recognized.

**Solutions**:
1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org)
2. **Verify Installation**:
   ```bash
   node --version
   npm --version
   ```
3. **Run in Project Directory**: Ensure you're in the filamentdb folder
4. **Install Dependencies**:
   ```bash
   npm install
   ```

### Port Already in Use Error

**Problem**: Development server can't start due to port conflict.

**Solutions**:
1. **Use Different Port**:
   ```bash
   npx live-server . --port=3001
   ```
2. **Kill Existing Process**: Stop other servers using port 3000
3. **Alternative Server**:
   ```bash
   npm run serve
   ```

### HTTPS Certificate Warnings

**Problem**: Browser shows security warnings for mobile server.

**Solutions**:
1. **Accept Warning**: Click "Advanced" → "Proceed to localhost"
2. **Add Exception**: Add security exception for localhost
3. **This is Normal**: Self-signed certificates always show warnings
4. **Required for Camera**: HTTPS needed for camera access on mobile

### Files Not Loading / 404 Errors

**Problem**: CSS, JS, or other files fail to load.

**Solutions**:
1. **Check File Paths**: Ensure all files are in correct locations
2. **Verify Server**: Confirm development server is running
3. **Clear Cache**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. **Check Console**: Look for specific file loading errors

## 🧪 Testing and Validation

### Tests Failing in Test Suite

**Problem**: Running `tests.html` shows failing tests.

**Solutions**:
1. **Check Browser Console**: Look for detailed error messages
2. **Network Issues**: Ensure stable internet for cloud storage tests
3. **Fresh Start**: Close and reopen browser before testing
4. **Run Validation**:
   ```bash
   node validate.js
   ```

## 📱 Mobile-Specific Issues

### PWA Not Installing

**Problem**: "Add to Home Screen" option not available.

**Solutions**:
1. **Use HTTPS**: PWA requires secure context
   ```bash
   npm run mobile
   ```
2. **Chrome/Safari**: PWA works best in Chrome (Android) or Safari (iOS)
3. **Visit Multiple Times**: Some browsers require multiple visits
4. **Check Manifest**: Ensure manifest.json is loading correctly

### Touch Interactions Not Working

**Problem**: Buttons or interactions don't respond on mobile.

**Solutions**:
1. **Touch vs Click**: Ensure touch events are properly handled
2. **Viewport**: Check if viewport meta tag is present
3. **CSS Touch**: Verify touch-friendly button sizes (44px minimum)

## 🔧 General Debugging

### Enable Debug Mode

1. **Open Browser Console**: Press F12
2. **Check Network Tab**: View API requests and responses
3. **Console Messages**: Look for error messages or warnings
4. **Local Storage**: Application tab → Local Storage → view data

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "API key is required" | Empty/missing API key | Provide valid JSONBin.io API key |
| "Cloud storage not configured" | Sync not set up | Complete cloud sync setup process |
| "Storage bin not found" | Invalid bin ID | Check sharing code format |
| "Camera access denied" | No camera permission | Grant camera permissions |
| "No QR code found" | QR not detected | Improve image quality/lighting |

### Getting Help

1. **Check Console**: Browser console (F12) shows detailed errors
2. **Run Tests**: Open `tests.html` to check system functionality  
3. **Validate Code**: Run `node validate.js` for code quality checks
4. **GitHub Issues**: Search existing issues or create new one
5. **Include Details**: When reporting issues, include:
   - Browser version
   - Operating system
   - Console error messages
   - Steps to reproduce

### Reset Everything

If all else fails, you can reset FilamentDB:

1. **Clear Browser Data**: 
   - Settings → Privacy → Clear browsing data
   - Select "All time" and check all boxes
2. **Fresh Install**:
   ```bash
   git pull origin main  # Get latest updates
   npm install           # Reinstall dependencies
   npm start            # Start fresh
   ```

---

**Still need help?** 

- 📧 Create an issue on GitHub with detailed information
- 🔍 Search existing issues for similar problems
- 📱 Test with different browsers/devices to isolate the issue

*Last updated: December 2024*