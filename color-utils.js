// Shared Color Utilities
// This module provides color mapping functions for consistent color rendering across the app

class ColorUtils {
    // Get hex color from color name using the expanded color database
    static getColorHex(colorName) {
        // First check if we have the ColorDetector available with the full database
        if (typeof window !== 'undefined' && window.ColorDetector) {
            const detector = new window.ColorDetector();
            const colorData = detector.filamentColors[colorName];
            if (colorData) {
                return `rgb(${colorData.r}, ${colorData.g}, ${colorData.b})`;
            }
        }
        
        // Fallback to basic color mapping for backwards compatibility
        const basicColors = {
            'black': '#000000',
            'white': '#FFFFFF',
            'red': '#FF0000',
            'blue': '#0000FF',
            'green': '#008000',
            'yellow': '#FFFF00',
            'orange': '#FFA500',
            'purple': '#800080',
            'pink': '#FFC0CB',
            'gray': '#808080',
            'grey': '#808080',
            'silver': '#C0C0C0',
            'gold': '#FFD700',
            'brown': '#8B4513',
            'cyan': '#00FFFF',
            'magenta': '#FF00FF',
            'lime': '#00FF00',
            'maroon': '#800000',
            'navy': '#000080',
            'olive': '#808000',
            'teal': '#008080',
            'aqua': '#00FFFF'
        };
        
        // Check basic colors first (case insensitive)
        const lowerColorName = colorName.toLowerCase();
        if (basicColors[lowerColorName]) {
            return basicColors[lowerColorName];
        }
        
        // Try to find partial matches for complex color names
        for (const [basicColor, hex] of Object.entries(basicColors)) {
            if (lowerColorName.includes(basicColor)) {
                return hex;
            }
        }
        
        // If no match found, generate a color based on the string hash
        return ColorUtils.generateColorFromString(colorName);
    }
    
    // Generate a consistent color from a string (for unknown colors)
    static generateColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Convert hash to RGB values
        const r = Math.abs(hash) % 256;
        const g = Math.abs(hash >> 8) % 256;
        const b = Math.abs(hash >> 16) % 256;
        
        // Ensure the color isn't too dark or too light
        const adjustedR = Math.max(50, Math.min(200, r));
        const adjustedG = Math.max(50, Math.min(200, g));
        const adjustedB = Math.max(50, Math.min(200, b));
        
        return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
    }
    
    // Convert RGB object to hex string
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    // Convert hex to RGB object
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    // Get the full color database for advanced operations
    static getFullColorDatabase() {
        if (typeof window !== 'undefined' && window.ColorDetector) {
            const detector = new window.ColorDetector();
            return detector.filamentColors;
        }
        return {};
    }
    
    // Find the closest color name from RGB values
    static findClosestColorName(r, g, b) {
        if (typeof window !== 'undefined' && window.ColorDetector) {
            const detector = new window.ColorDetector();
            const match = detector.findClosestColor({ r, g, b });
            return match.name;
        }
        return 'Unknown';
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.ColorUtils = ColorUtils;
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorUtils;
}