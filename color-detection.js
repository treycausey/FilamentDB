// Color Detection and Matching Utility
class ColorDetector {
    constructor() {
        this.isActive = false;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.modal = null;
        this.crosshair = null;
        
        // Comprehensive 256+ color database for 3D printing filaments
        this.filamentColors = {
            // Basic Colors (RGB primaries and combinations)
            'Black': { r: 0, g: 0, b: 0 },
            'White': { r: 255, g: 255, b: 255 },
            'Red': { r: 255, g: 0, b: 0 },
            'Green': { r: 0, g: 255, b: 0 },
            'Blue': { r: 0, g: 0, b: 255 },
            'Yellow': { r: 255, g: 255, b: 0 },
            'Cyan': { r: 0, g: 255, b: 255 },
            'Magenta': { r: 255, g: 0, b: 255 },
            
            // Gray Scale
            'Dark Gray': { r: 64, g: 64, b: 64 },
            'Dim Gray': { r: 105, g: 105, b: 105 },
            'Gray': { r: 128, g: 128, b: 128 },
            'Light Gray': { r: 192, g: 192, b: 192 },
            'Silver': { r: 220, g: 220, b: 220 },
            'Gainsboro': { r: 240, g: 240, b: 240 },
            
            // Red Variations
            'Dark Red': { r: 139, g: 0, b: 0 },
            'Crimson': { r: 220, g: 20, b: 60 },
            'Fire Red': { r: 255, g: 69, b: 0 },
            'Scarlet': { r: 255, g: 36, b: 0 },
            'Brick Red': { r: 178, g: 34, b: 34 },
            'Maroon': { r: 128, g: 0, b: 0 },
            'Indian Red': { r: 205, g: 92, b: 92 },
            'Light Coral': { r: 240, g: 128, b: 128 },
            'Salmon': { r: 250, g: 128, b: 114 },
            'Pink': { r: 255, g: 192, b: 203 },
            'Hot Pink': { r: 255, g: 105, b: 180 },
            'Deep Pink': { r: 255, g: 20, b: 147 },
            'Rose': { r: 255, g: 228, b: 225 },
            'Coral': { r: 255, g: 127, b: 80 },
            
            // Orange Variations
            'Orange': { r: 255, g: 165, b: 0 },
            'Dark Orange': { r: 255, g: 140, b: 0 },
            'Orange Red': { r: 255, g: 69, b: 0 },
            'Tangerine': { r: 255, g: 160, b: 122 },
            'Peach': { r: 255, g: 218, b: 185 },
            'Papaya': { r: 255, g: 239, b: 213 },
            'Apricot': { r: 251, g: 206, b: 177 },
            
            // Yellow Variations
            'Gold': { r: 255, g: 215, b: 0 },
            'Dark Golden': { r: 184, g: 134, b: 11 },
            'Light Yellow': { r: 255, g: 255, b: 224 },
            'Lemon': { r: 255, g: 250, b: 205 },
            'Khaki': { r: 240, g: 230, b: 140 },
            'Beige': { r: 245, g: 245, b: 220 },
            'Cream': { r: 255, g: 253, b: 208 },
            'Ivory': { r: 255, g: 255, b: 240 },
            
            // Green Variations
            'Dark Green': { r: 0, g: 100, b: 0 },
            'Forest Green': { r: 34, g: 139, b: 34 },
            'Lime Green': { r: 50, g: 205, b: 50 },
            'Spring Green': { r: 0, g: 255, b: 127 },
            'Sea Green': { r: 46, g: 139, b: 87 },
            'Medium Sea Green': { r: 60, g: 179, b: 113 },
            'Light Sea Green': { r: 32, g: 178, b: 170 },
            'Olive': { r: 128, g: 128, b: 0 },
            'Dark Olive': { r: 85, g: 107, b: 47 },
            'Yellow Green': { r: 154, g: 205, b: 50 },
            'Lawn Green': { r: 124, g: 252, b: 0 },
            'Chartreuse': { r: 127, g: 255, b: 0 },
            'Green Yellow': { r: 173, g: 255, b: 47 },
            'Mint': { r: 189, g: 252, b: 201 },
            'Honeydew': { r: 240, g: 255, b: 240 },
            
            // Blue Variations
            'Dark Blue': { r: 0, g: 0, b: 139 },
            'Navy Blue': { r: 0, g: 0, b: 128 },
            'Medium Blue': { r: 0, g: 0, b: 205 },
            'Royal Blue': { r: 65, g: 105, b: 225 },
            'Dodger Blue': { r: 30, g: 144, b: 255 },
            'Deep Sky Blue': { r: 0, g: 191, b: 255 },
            'Sky Blue': { r: 135, g: 206, b: 235 },
            'Light Blue': { r: 173, g: 216, b: 230 },
            'Powder Blue': { r: 176, g: 224, b: 230 },
            'Steel Blue': { r: 70, g: 130, b: 180 },
            'Cornflower': { r: 100, g: 149, b: 237 },
            'Midnight Blue': { r: 25, g: 25, b: 112 },
            'Slate Blue': { r: 106, g: 90, b: 205 },
            'Cadet Blue': { r: 95, g: 158, b: 160 },
            'Teal': { r: 0, g: 128, b: 128 },
            'Dark Turquoise': { r: 0, g: 206, b: 209 },
            'Turquoise': { r: 64, g: 224, b: 208 },
            'Aqua': { r: 0, g: 255, b: 255 },
            'Alice Blue': { r: 240, g: 248, b: 255 },
            
            // Purple Variations
            'Purple': { r: 128, g: 0, b: 128 },
            'Dark Purple': { r: 72, g: 61, b: 139 },
            'Indigo': { r: 75, g: 0, b: 130 },
            'Dark Violet': { r: 148, g: 0, b: 211 },
            'Blue Violet': { r: 138, g: 43, b: 226 },
            'Medium Violet': { r: 147, g: 112, b: 219 },
            'Plum': { r: 221, g: 160, b: 221 },
            'Orchid': { r: 218, g: 112, b: 214 },
            'Lavender': { r: 230, g: 230, b: 250 },
            'Thistle': { r: 216, g: 191, b: 216 },
            
            // Brown Variations
            'Brown': { r: 139, g: 69, b: 19 },
            'Dark Brown': { r: 101, g: 67, b: 33 },
            'Saddle Brown': { r: 139, g: 69, b: 19 },
            'Sienna': { r: 160, g: 82, b: 45 },
            'Chocolate': { r: 210, g: 105, b: 30 },
            'Peru': { r: 205, g: 133, b: 63 },
            'Sandy Brown': { r: 244, g: 164, b: 96 },
            'Tan': { r: 210, g: 180, b: 140 },
            'Wheat': { r: 245, g: 222, b: 179 },
            'Burlywood': { r: 222, g: 184, b: 135 },
            'Rosy Brown': { r: 188, g: 143, b: 143 },
            
            // Metallic Colors
            'Copper': { r: 184, g: 115, b: 51 },
            'Bronze': { r: 205, g: 127, b: 50 },
            'Brass': { r: 181, g: 166, b: 66 },
            'Steel': { r: 169, g: 169, b: 169 },
            'Iron': { r: 110, g: 123, b: 139 },
            'Titanium': { r: 135, g: 134, b: 129 },
            'Platinum': { r: 229, g: 228, b: 226 },
            'Chrome': { r: 150, g: 150, b: 150 },
            
            // Neon/Bright Colors
            'Neon Green': { r: 57, g: 255, b: 20 },
            'Neon Pink': { r: 255, g: 16, b: 240 },
            'Neon Blue': { r: 4, g: 217, b: 255 },
            'Neon Yellow': { r: 255, g: 255, b: 51 },
            'Neon Orange': { r: 255, g: 95, b: 31 },
            'Neon Purple': { r: 177, g: 3, b: 252 },
            'Electric Blue': { r: 125, g: 249, b: 255 },
            'Electric Green': { r: 0, g: 255, b: 0 },
            'Hot Magenta': { r: 255, g: 29, b: 206 },
            
            // Pastel Colors
            'Pastel Pink': { r: 255, g: 209, b: 220 },
            'Pastel Blue': { r: 174, g: 198, b: 207 },
            'Pastel Green': { r: 119, g: 221, b: 119 },
            'Pastel Yellow': { r: 253, g: 253, b: 150 },
            'Pastel Purple': { r: 179, g: 158, b: 181 },
            'Pastel Orange': { r: 255, g: 179, b: 71 },
            'Baby Blue': { r: 137, g: 207, b: 240 },
            'Baby Pink': { r: 244, g: 194, b: 194 },
            'Mint Cream': { r: 245, g: 255, b: 250 },
            'Linen': { r: 250, g: 240, b: 230 },
            
            // Wood Fill Colors
            'Natural Wood': { r: 139, g: 90, b: 43 },
            'Oak': { r: 160, g: 120, b: 60 },
            'Mahogany': { r: 192, g: 64, b: 0 },
            'Pine': { r: 201, g: 176, b: 73 },
            'Walnut': { r: 101, g: 67, b: 33 },
            'Cherry': { r: 138, g: 43, b: 226 },
            'Maple': { r: 222, g: 184, b: 135 },
            'Bamboo': { r: 154, g: 205, b: 50 },
            'Cedar': { r: 160, g: 82, b: 45 },
            'Ebony': { r: 85, g: 93, b: 80 },
            
            // Marble Colors
            'White Marble': { r: 240, g: 240, b: 235 },
            'Black Marble': { r: 40, g: 40, b: 40 },
            'Gray Marble': { r: 150, g: 150, b: 145 },
            'Green Marble': { r: 34, g: 139, b: 34 },
            'Red Marble': { r: 139, g: 0, b: 0 },
            
            // Carbon Fiber
            'Carbon Black': { r: 20, g: 20, b: 20 },
            'Carbon Gray': { r: 60, g: 60, b: 60 },
            'Carbon Blue': { r: 30, g: 30, b: 70 },
            'Carbon Red': { r: 70, g: 30, b: 30 },
            
            // Glow in the Dark
            'Glow Green': { r: 173, g: 255, b: 47 },
            'Glow Blue': { r: 135, g: 206, b: 235 },
            'Glow Yellow': { r: 255, g: 255, b: 224 },
            'Glow Pink': { r: 255, g: 182, b: 193 },
            
            // Transparent Colors
            'Natural': { r: 248, g: 248, b: 240 },
            'Clear': { r: 245, g: 245, b: 245 },
            'Transparent Red': { r: 255, g: 100, b: 100 },
            'Transparent Blue': { r: 100, g: 150, b: 255 },
            'Transparent Green': { r: 100, g: 255, b: 100 },
            'Transparent Yellow': { r: 255, g: 255, b: 100 },
            'Transparent Purple': { r: 150, g: 100, b: 255 },
            'Transparent Orange': { r: 255, g: 150, b: 100 },
            
            // Specialty Filaments
            'Metal Silver': { r: 192, g: 192, b: 192 },
            'Metal Gold': { r: 255, g: 215, b: 0 },
            'Metal Copper': { r: 184, g: 115, b: 51 },
            'Metal Bronze': { r: 205, g: 127, b: 50 },
            'Metal Aluminum': { r: 169, g: 169, b: 169 },
            'Silk Gold': { r: 255, g: 223, b: 0 },
            'Silk Silver': { r: 220, g: 220, b: 220 },
            'Silk Copper': { r: 196, g: 136, b: 124 },
            'Pearl White': { r: 240, g: 234, b: 214 },
            'Pearl Black': { r: 60, g: 60, b: 60 },
            
            // Rainbow Colors
            'Rainbow Red': { r: 255, g: 0, b: 0 },
            'Rainbow Orange': { r: 255, g: 127, b: 0 },
            'Rainbow Yellow': { r: 255, g: 255, b: 0 },
            'Rainbow Green': { r: 0, g: 255, b: 0 },
            'Rainbow Blue': { r: 0, g: 0, b: 255 },
            'Rainbow Indigo': { r: 75, g: 0, b: 130 },
            'Rainbow Violet': { r: 148, g: 0, b: 211 },
            
            // Matte Finish Colors
            'Matte Black': { r: 40, g: 40, b: 40 },
            'Matte White': { r: 230, g: 230, b: 230 },
            'Matte Red': { r: 200, g: 40, b: 40 },
            'Matte Blue': { r: 40, g: 80, b: 200 },
            'Matte Green': { r: 40, g: 140, b: 40 },
            'Matte Gray': { r: 120, g: 120, b: 120 },
            
            // Satin Finish Colors
            'Satin Black': { r: 50, g: 50, b: 50 },
            'Satin White': { r: 250, g: 250, b: 250 },
            'Satin Silver': { r: 200, g: 200, b: 200 },
            'Satin Gold': { r: 255, g: 215, b: 0 },
            
            // Additional Popular Colors
            'Seafoam': { r: 159, g: 226, b: 191 },
            'Periwinkle': { r: 196, g: 222, b: 255 },
            'Mauve': { r: 224, g: 176, b: 255 },
            'Sage': { r: 158, g: 184, b: 156 },
            'Burgundy': { r: 128, g: 0, b: 32 },
            'Mustard': { r: 255, g: 219, b: 88 },
            'Rust': { r: 183, g: 65, b: 14 },
            'Emerald': { r: 80, g: 200, b: 120 },
            'Cobalt': { r: 0, g: 71, b: 171 },
            
            // Extended Color Variations (to reach 256+)
            'Light Pink': { r: 255, g: 182, b: 193 },
            'Medium Pink': { r: 255, g: 20, b: 147 },
            'Dark Pink': { r: 231, g: 84, b: 128 },
            'Light Red': { r: 255, g: 99, b: 71 },
            'Medium Red': { r: 220, g: 20, b: 60 },
            'Light Orange': { r: 255, g: 218, b: 185 },
            'Medium Orange': { r: 255, g: 140, b: 0 },
            'Light Green': { r: 144, g: 238, b: 144 },
            'Medium Green': { r: 0, g: 128, b: 0 },
            'Light Blue': { r: 173, g: 216, b: 230 },
            'Medium Blue': { r: 0, g: 0, b: 205 },
            'Light Purple': { r: 221, g: 160, b: 221 },
            'Medium Purple': { r: 147, g: 112, b: 219 },
            'Light Brown': { r: 205, g: 133, b: 63 },
            'Medium Brown': { r: 160, g: 82, b: 45 },
            
            // Jewel Tones
            'Ruby': { r: 224, g: 17, b: 95 },
            'Sapphire': { r: 15, g: 82, b: 186 },
            'Emerald Green': { r: 80, g: 200, b: 120 },
            'Topaz': { r: 255, g: 200, b: 124 },
            'Amethyst': { r: 153, g: 102, b: 204 },
            'Garnet': { r: 115, g: 54, b: 53 },
            'Opal': { r: 168, g: 195, b: 188 },
            'Pearl': { r: 240, g: 234, b: 214 },
            'Diamond': { r: 185, g: 242, b: 255 },
            'Jade': { r: 0, g: 168, b: 107 },
            'Onyx': { r: 53, g: 56, b: 57 },
            'Quartz': { r: 81, g: 72, b: 79 },
            
            // Vintage Colors
            'Vintage Pink': { r: 217, g: 175, b: 217 },
            'Vintage Blue': { r: 173, g: 216, b: 230 },
            'Vintage Green': { r: 143, g: 188, b: 143 },
            'Vintage Yellow': { r: 255, g: 228, b: 181 },
            'Vintage Orange': { r: 255, g: 228, b: 196 },
            'Vintage Purple': { r: 199, g: 21, b: 133 },
            'Vintage Brown': { r: 150, g: 113, b: 23 },
            'Vintage Gray': { r: 128, g: 128, b: 105 },
            
            // Fluorescent Colors
            'Fluorescent Pink': { r: 255, g: 20, b: 147 },
            'Fluorescent Green': { r: 57, g: 255, b: 20 },
            'Fluorescent Yellow': { r: 255, g: 255, b: 0 },
            'Fluorescent Orange': { r: 255, g: 95, b: 31 },
            'Fluorescent Blue': { r: 21, g: 244, b: 238 },
            'Fluorescent Purple': { r: 177, g: 3, b: 252 },
            'Fluorescent Red': { r: 255, g: 0, b: 63 },
            
            // Earth Tones
            'Clay': { r: 168, g: 103, b: 85 },
            'Sand': { r: 194, g: 178, b: 128 },
            'Stone': { r: 145, g: 134, b: 118 },
            'Moss': { r: 138, g: 154, b: 91 },
            'Bark': { r: 101, g: 67, b: 33 },
            'Mud': { r: 70, g: 45, b: 29 },
            'Dust': { r: 131, g: 105, b: 83 },
            'Granite': { r: 96, g: 96, b: 96 },
            'Slate': { r: 112, g: 128, b: 144 },
            'Sandstone': { r: 222, g: 184, b: 135 },
            
            // Fabric Colors
            'Denim': { r: 21, g: 96, b: 189 },
            'Linen White': { r: 250, g: 240, b: 230 },
            'Canvas': { r: 196, g: 188, b: 151 },
            'Cotton': { r: 255, g: 253, b: 240 },
            'Wool': { r: 250, g: 240, b: 230 },
            'Silk White': { r: 255, g: 245, b: 238 },
            'Velvet Red': { r: 144, g: 12, b: 63 },
            'Satin Pink': { r: 255, g: 143, b: 175 },
            'Tweed': { r: 173, g: 154, b: 108 },
            
            // Automotive Colors
            'Racing Red': { r: 255, g: 0, b: 0 },
            'Midnight Black': { r: 25, g: 25, b: 112 },
            'Arctic White': { r: 248, g: 248, b: 255 },
            'Electric Blue': { r: 125, g: 249, b: 255 },
            'Racing Green': { r: 0, g: 66, b: 37 },
            'Flame Orange': { r: 255, g: 95, b: 31 },
            'Chrome Silver': { r: 192, g: 192, b: 192 },
            'Gunmetal': { r: 42, g: 52, b: 57 },
            'Lime': { r: 191, g: 255, b: 0 },
            'Magenta': { r: 255, g: 0, b: 255 },
            
            // Food Colors
            'Cherry Red': { r: 222, g: 49, b: 99 },
            'Apple Green': { r: 141, g: 182, b: 0 },
            'Banana Yellow': { r: 255, g: 225, b: 53 },
            'Orange Peel': { r: 255, g: 159, b: 0 },
            'Grape Purple': { r: 111, g: 45, b: 168 },
            'Berry Blue': { r: 55, g: 81, b: 115 },
            'Mint Green': { r: 152, g: 251, b: 152 },
            'Chocolate Brown': { r: 123, g: 63, b: 0 },
            'Vanilla': { r: 243, g: 229, b: 171 },
            'Strawberry': { r: 252, g: 90, b: 141 },
            'Lemon': { r: 255, g: 247, b: 0 },
            'Lime': { r: 50, g: 205, b: 50 },
            
            // Tech Colors
            'Cyber Blue': { r: 0, g: 255, b: 255 },
            'Matrix Green': { r: 0, g: 255, b: 65 },
            'Laser Red': { r: 255, g: 0, b: 102 },
            'Digital Purple': { r: 138, g: 43, b: 226 },
            'Neon Cyan': { r: 77, g: 255, b: 255 },
            'Circuit Green': { r: 57, g: 255, b: 20 },
            'Binary Black': { r: 8, g: 8, b: 8 },
            'Code White': { r: 248, g: 248, b: 240 },
            'Terminal Green': { r: 0, g: 255, b: 0 },
            'Screen Blue': { r: 0, g: 123, b: 255 }
        };
    }
    
    // Calculate color distance using Delta E (simplified)
    calculateColorDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        
        // Weighted Euclidean distance (accounts for human eye sensitivity)
        return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
    }
    
    // Find the closest matching filament color
    findClosestColor(rgb) {
        let minDistance = Infinity;
        let closestColor = 'Unknown';
        let closestRgb = { r: 128, g: 128, b: 128 };
        
        for (const [colorName, colorRgb] of Object.entries(this.filamentColors)) {
            const distance = this.calculateColorDistance(rgb, colorRgb);
            if (distance < minDistance) {
                minDistance = distance;
                closestColor = colorName;
                closestRgb = colorRgb;
            }
        }
        
        return {
            name: closestColor,
            rgb: closestRgb,
            confidence: Math.max(0, 100 - (minDistance / 5)), // Convert distance to confidence %
            detectedRgb: rgb
        };
    }
    
    // Sample color from video at crosshair position
    sampleColorAtCenter() {
        if (!this.video || !this.canvas || !this.context) return null;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const sampleSize = 20; // Sample 20x20 pixel area
        
        // Draw current video frame to canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.context.drawImage(this.video, 0, 0);
        
        // Get image data from center area
        const imageData = this.context.getImageData(
            Math.max(0, centerX - sampleSize / 2),
            Math.max(0, centerY - sampleSize / 2),
            Math.min(sampleSize, this.canvas.width),
            Math.min(sampleSize, this.canvas.height)
        );
        
        // Calculate average color
        let totalR = 0, totalG = 0, totalB = 0, totalPixels = 0;
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            totalR += imageData.data[i];
            totalG += imageData.data[i + 1];
            totalB += imageData.data[i + 2];
            totalPixels++;
        }
        
        if (totalPixels === 0) return null;
        
        return {
            r: Math.round(totalR / totalPixels),
            g: Math.round(totalG / totalPixels),
            b: Math.round(totalB / totalPixels)
        };
    }
    
    // Create color detection modal
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'color-detector-modal';
        this.modal.innerHTML = `
            <div class="color-detector-content">
                <div class="color-detector-header">
                    <h3>Color Detection</h3>
                    <button class="close-color-detector" id="closeColorDetector">×</button>
                </div>
                <div class="color-detector-body">
                    <div class="video-container">
                        <video id="colorVideo" autoplay muted playsinline></video>
                        <div class="crosshair">
                            <div class="crosshair-h"></div>
                            <div class="crosshair-v"></div>
                        </div>
                        <canvas id="colorCanvas" style="display: none;"></canvas>
                    </div>
                    <div class="color-info">
                        <div class="detected-color">
                            <div class="color-preview" id="colorPreview"></div>
                            <div class="color-details">
                                <div class="color-name" id="colorName">Point camera at filament</div>
                                <div class="color-values">
                                    <span class="rgb-values" id="rgbValues"></span>
                                    <span class="confidence" id="confidence"></span>
                                </div>
                            </div>
                        </div>
                        <div class="color-actions">
                            <button class="sample-color-btn" id="sampleColor">Sample Color</button>
                            <button class="use-color-btn" id="useColor" disabled>Use This Color</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Get references
        this.video = document.getElementById('colorVideo');
        this.canvas = document.getElementById('colorCanvas');
        this.context = this.canvas.getContext('2d');
        this.crosshair = this.modal.querySelector('.crosshair');
        
        // Add event listeners
        document.getElementById('closeColorDetector').addEventListener('click', () => this.closeModal());
        document.getElementById('sampleColor').addEventListener('click', () => this.sampleColor());
        document.getElementById('useColor').addEventListener('click', () => this.useDetectedColor());
        
        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }
    
    // Start color detection
    async startDetection() {
        try {
            if (!this.modal) {
                this.createModal();
            }
            
            this.modal.style.display = 'flex';
            this.isActive = true;
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',  // Use back camera if available
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            this.video.srcObject = stream;
            await new Promise(resolve => {
                this.video.onloadedmetadata = resolve;
            });
            
            // Start continuous sampling
            this.startContinuousSampling();
            
        } catch (error) {
            console.error('Error starting color detection:', error);
            
            let errorMessage = 'Could not access camera. ';
            let suggestions = [];
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied. ';
                suggestions = [
                    'Allow camera permissions in your browser',
                    'Try refreshing and allowing camera access'
                ];
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found. ';
                suggestions = ['Make sure your device has a camera'];
            } else if (error.name === 'SecurityError' || error.name === 'NotSupportedError') {
                errorMessage = 'Camera blocked by security policy. ';
                suggestions = [
                    'HTTPS is required for camera on mobile',
                    'Use: npm run mobile (enables HTTPS)',
                    'Accept certificate warning when prompted'
                ];
            } else {
                suggestions = [
                    'Try using HTTPS: npm run mobile',
                    'Check camera permissions',
                    'Manually enter color name instead'
                ];
            }
            
            const detailedMessage = errorMessage + '\n\n' + suggestions.join('\n');
            alert(detailedMessage);
            this.closeModal();
        }
    }
    
    // Start continuous color sampling for real-time feedback
    startContinuousSampling() {
        if (!this.isActive) return;
        
        const rgb = this.sampleColorAtCenter();
        if (rgb) {
            this.updateColorPreview(rgb);
        }
        
        // Continue sampling
        setTimeout(() => this.startContinuousSampling(), 100);
    }
    
    // Update color preview in real-time
    updateColorPreview(rgb) {
        const match = this.findClosestColor(rgb);
        
        const colorPreview = document.getElementById('colorPreview');
        const colorName = document.getElementById('colorName');
        const rgbValues = document.getElementById('rgbValues');
        const confidence = document.getElementById('confidence');
        
        if (colorPreview) {
            colorPreview.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
        
        if (colorName) {
            colorName.textContent = match.name;
        }
        
        if (rgbValues) {
            rgbValues.textContent = `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
        
        if (confidence) {
            confidence.textContent = `${Math.round(match.confidence)}% confidence`;
            confidence.className = `confidence ${match.confidence > 70 ? 'high' : match.confidence > 40 ? 'medium' : 'low'}`;
        }
        
        // Store current match
        this.currentMatch = match;
    }
    
    // Sample color manually
    sampleColor() {
        const rgb = this.sampleColorAtCenter();
        if (rgb) {
            this.updateColorPreview(rgb);
            document.getElementById('useColor').disabled = false;
        }
    }
    
    // Use the detected color
    useDetectedColor() {
        if (this.currentMatch && this.onColorDetected) {
            this.onColorDetected(this.currentMatch.name);
        }
        this.closeModal();
    }
    
    // Close the modal and stop camera
    closeModal() {
        this.isActive = false;
        
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
    
    // Set callback for when color is detected and selected
    onColorSelected(callback) {
        this.onColorDetected = callback;
    }
}

// CSS styles for the color detector
const colorDetectorStyles = `
<style>
.color-detector-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.color-detector-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 90%;
    overflow: hidden;
}

.color-detector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #eee;
}

.color-detector-header h3 {
    margin: 0;
    color: #333;
}

.close-color-detector {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-color-detector:hover {
    color: #333;
}

.video-container {
    position: relative;
    width: 100%;
    height: 250px;
    background: #000;
}

#colorVideo {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.crosshair-h, .crosshair-v {
    position: absolute;
    background: #fff;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.crosshair-h {
    width: 40px;
    height: 2px;
    top: -1px;
    left: -20px;
}

.crosshair-v {
    width: 2px;
    height: 40px;
    left: -1px;
    top: -20px;
}

.color-info {
    padding: 1rem 1.5rem;
}

.detected-color {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.color-preview {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    border: 2px solid #ddd;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-details {
    flex: 1;
}

.color-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
}

.color-values {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: #666;
}

.confidence.high { color: #22c55e; }
.confidence.medium { color: #f59e0b; }
.confidence.low { color: #ef4444; }

.color-actions {
    display: flex;
    gap: 0.75rem;
}

.sample-color-btn, .use-color-btn {
    flex: 1;
    padding: 0.75rem;
    border-radius: 8px;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.sample-color-btn {
    background: #6366f1;
    color: white;
}

.sample-color-btn:hover {
    background: #5855eb;
}

.use-color-btn {
    background: #22c55e;
    color: white;
}

.use-color-btn:hover:not(:disabled) {
    background: #16a34a;
}

.use-color-btn:disabled {
    background: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
}

@media (max-width: 600px) {
    .color-detector-content {
        width: 95%;
        max-height: 95%;
    }
    
    .detected-color {
        flex-direction: column;
        text-align: center;
    }
    
    .color-values {
        justify-content: center;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', colorDetectorStyles);

// Export for global use
window.ColorDetector = ColorDetector;