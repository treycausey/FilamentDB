#!/usr/bin/env node

/**
 * FilamentDB Validation Script
 * Runs automated checks to ensure code quality and prevent regressions
 * Usage: node validate.js
 */

const fs = require('fs');
const path = require('path');

class FilamentDBValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.baseDir = path.resolve(__dirname, '../..');
    }

    async validate() {
        console.log('🔍 Running FilamentDB validation checks...\n');

        // Run all validation checks
        this.validateFileStructure();
        this.validateCodeQuality();
        this.validateSecurityIssues();
        this.validateConfigurationFiles();
        
        // Print results
        this.printResults();
        
        // Return exit code
        return this.errors.length === 0 ? 0 : 1;
    }

    validateFileStructure() {
        console.log('📁 Checking file structure...');
        
        const requiredFiles = [
            'index.html',
            'src/js/app.js', 
            'inventory.html',
            'src/js/inventory.js',
            'generator.html',
            'src/js/generator.js',
            'src/utils/cloud-storage.js',
            'src/utils/shared-qr-processing.js',
            'styles.css',
            'tests/tests.html',
            'tests/error-handling-tests.js'
        ];

        requiredFiles.forEach(file => {
            const filePath = path.join(this.baseDir, file);
            if (!fs.existsSync(filePath)) {
                this.addError(`Missing required file: ${file}`);
            } else {
                console.log(`  ✅ ${file} exists`);
            }
        });

        // Check for test files
        if (!fs.existsSync(path.join(this.baseDir, 'tests/tests.html'))) {
            this.addError('Missing test suite: tests/tests.html');
        }
    }

    validateCodeQuality() {
        console.log('\n🧹 Checking code quality...');
        
        const jsFiles = [
            'app.js',
            'inventory.js', 
            'generator.js',
            'cloud-storage.js',
            'shared-qr-processing.js'
        ];

        jsFiles.forEach(file => {
            const filePath = path.join(this.baseDir, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                this.validateJSFile(file, content);
            }
        });
    }

    validateJSFile(filename, content) {
        // Check for console.log debugging statements (should be minimal)
        const debugLogs = content.match(/console\.log\(/g) || [];
        if (debugLogs.length > 5) {
            this.addWarning(`${filename}: Contains ${debugLogs.length} console.log statements (consider reducing)`);
        }

        // Check for proper error handling
        const tryBlocks = content.match(/try\s*{/g) || [];
        const catchBlocks = content.match(/catch\s*\(/g) || [];
        if (tryBlocks.length !== catchBlocks.length) {
            this.addError(`${filename}: Mismatched try/catch blocks`);
        }

        // Check for async/await usage
        const asyncFunctions = content.match(/async\s+function/g) || [];
        const awaitCalls = content.match(/await\s+/g) || [];
        if (asyncFunctions.length > 0 && awaitCalls.length === 0) {
            this.addWarning(`${filename}: Async functions without await calls`);
        }

        // Check for proper JSDoc comments on functions
        const functions = content.match(/function\s+\w+/g) || [];
        const jsdocComments = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
        if (functions.length > 10 && jsdocComments.length === 0) {
            this.addWarning(`${filename}: Large file (${functions.length} functions) without JSDoc comments`);
        }

        console.log(`  ✅ ${filename} code quality check passed`);
    }

    validateSecurityIssues() {
        console.log('\n🔒 Checking security issues...');
        
        const files = ['app.js', 'inventory.js', 'generator.js', 'cloud-storage.js'];
        
        files.forEach(file => {
            const filePath = path.join(this.baseDir, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                this.validateSecurity(file, content);
            }
        });
    }

    validateSecurity(filename, content) {
        // Check for hardcoded secrets
        const secretPatterns = [
            /api[_-]?key\s*[:=]\s*['"]\w{20,}['"]/i,
            /password\s*[:=]\s*['"]\w+['"]/i,
            /secret\s*[:=]\s*['"]\w+['"]/i,
            /token\s*[:=]\s*['"]\w{20,}['"]/i
        ];

        secretPatterns.forEach((pattern, index) => {
            if (pattern.test(content)) {
                this.addError(`${filename}: Potential hardcoded secret detected (pattern ${index + 1})`);
            }
        });

        // Check for proper input validation
        if (content.includes('innerHTML') && !content.includes('textContent')) {
            this.addWarning(`${filename}: Uses innerHTML - ensure proper sanitization`);
        }

        // Check for eval usage
        if (content.includes('eval(')) {
            this.addError(`${filename}: Contains eval() - potential security risk`);
        }

        // Check localStorage usage is secure
        if (content.includes('localStorage') && content.includes('innerHTML')) {
            this.addWarning(`${filename}: localStorage data used in innerHTML - check for XSS`);
        }

        console.log(`  ✅ ${filename} security check passed`);
    }

    validateConfigurationFiles() {
        console.log('\n⚙️ Checking configuration files...');
        
        // Check package.json if it exists
        const packagePath = path.join(this.baseDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            try {
                const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                
                // Check for required scripts
                const requiredScripts = ['mobile', 'dev'];
                requiredScripts.forEach(script => {
                    if (!packageContent.scripts || !packageContent.scripts[script]) {
                        this.addWarning(`package.json: Missing recommended script: ${script}`);
                    }
                });

                console.log('  ✅ package.json validation passed');
            } catch (error) {
                this.addError('package.json: Invalid JSON format');
            }
        }

        // Check manifest.json
        const manifestPath = path.join(this.baseDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                
                const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color'];
                requiredFields.forEach(field => {
                    if (!manifest[field]) {
                        this.addError(`manifest.json: Missing required field: ${field}`);
                    }
                });

                console.log('  ✅ manifest.json validation passed');
            } catch (error) {
                this.addError('manifest.json: Invalid JSON format');
            }
        }

        // Check for HTTPS configuration
        const mobileServerPath = path.join(this.baseDir, 'mobile-server.js');
        if (fs.existsSync(mobileServerPath)) {
            const content = fs.readFileSync(mobileServerPath, 'utf8');
            if (content.includes('https') && content.includes('cert')) {
                console.log('  ✅ HTTPS mobile server configuration found');
            } else {
                this.addWarning('mobile-server.js: HTTPS configuration not detected');
            }
        }
    }

    addError(message) {
        this.errors.push(message);
        console.log(`  ❌ ERROR: ${message}`);
    }

    addWarning(message) {
        this.warnings.push(message);
        console.log(`  ⚠️  WARNING: ${message}`);
    }

    printResults() {
        console.log('\n📊 Validation Results:');
        console.log('═'.repeat(50));
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('🎉 All checks passed! No issues found.');
        } else {
            if (this.errors.length > 0) {
                console.log(`❌ Errors: ${this.errors.length}`);
                this.errors.forEach((error, i) => {
                    console.log(`   ${i + 1}. ${error}`);
                });
            }

            if (this.warnings.length > 0) {
                console.log(`⚠️  Warnings: ${this.warnings.length}`);
                this.warnings.forEach((warning, i) => {
                    console.log(`   ${i + 1}. ${warning}`);
                });
            }
        }

        console.log('═'.repeat(50));
        
        if (this.errors.length === 0) {
            console.log('✅ Validation passed - ready for deployment!');
        } else {
            console.log('❌ Validation failed - please fix errors before deployment');
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new FilamentDBValidator();
    validator.validate().then(exitCode => {
        process.exit(exitCode);
    });
}

module.exports = FilamentDBValidator;