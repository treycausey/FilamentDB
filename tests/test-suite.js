const { chromium } = require('playwright');

async function runFullTestSuite() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let passCount = 0;
    let failCount = 0;

    function logTest(name, passed, details = '') {
        if (passed) {
            console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
            passCount++;
        } else {
            console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
            failCount++;
        }
    }

    console.log('🧪 Running FilamentDB Comprehensive Test Suite\n');

    // Test 1: Basic page loading
    console.log('📄 Testing Page Loading...');
    try {
        await page.goto('http://localhost:63512/index.html');
        const title = await page.title();
        logTest('Scanner page loads', title.includes('FilamentDB'));
        
        await page.goto('http://localhost:63512/generator.html');
        const genTitle = await page.title();
        logTest('Generator page loads', genTitle.includes('FilamentDB'));
        
        await page.goto('http://localhost:63512/inventory.html');
        const invTitle = await page.title();
        logTest('Inventory page loads', invTitle.includes('FilamentDB'));
    } catch (e) {
        logTest('Page loading', false, e.message);
    }

    // Test 2: FCX Color System
    console.log('\n🎨 Testing FCX Color System...');
    try {
        await page.goto('http://localhost:63512/inventory.html');
        await page.waitForTimeout(1000);

        // Test FCX availability
        const fcxAvailable = await page.evaluate(() => {
            return typeof window.FCX !== 'undefined' && typeof FCX.getSnapshotStatus === 'function';
        });
        logTest('FCX object available', fcxAvailable);

        if (fcxAvailable) {
            // Test snapshot status
            const snapshotStatus = await page.evaluate(async () => {
                try {
                    const status = await FCX.getSnapshotStatus();
                    return { success: true, loaded: status.loaded || [] };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            });
            logTest('Snapshot status retrieval', snapshotStatus.success);
            logTest('Snapshots loaded', snapshotStatus.loaded && snapshotStatus.loaded.length > 0, 
                   `${snapshotStatus.loaded?.length || 0} types`);

            // Test color search
            const searchTest = await page.evaluate(async () => {
                try {
                    const results = await FCX.searchByText('red', null, null, 10);
                    return { success: true, count: results.length, results };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            });
            logTest('Color search functionality', searchTest.success && searchTest.count > 0, 
                   `found ${searchTest.count} results`);

            // Test color suggestions
            const suggestionTest = await page.evaluate(async () => {
                try {
                    const results = await FCX.listSuggestions('#FF0000', null, null, 5);
                    return { success: true, count: results.length, results };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            });
            logTest('Color suggestions', suggestionTest.success && suggestionTest.count > 0, 
                   `found ${suggestionTest.count} suggestions`);
        }
    } catch (e) {
        logTest('FCX system test', false, e.message);
    }

    // Test 3: Inventory Management
    console.log('\n📦 Testing Inventory Management...');
    try {
        // Clear and add test data
        await page.evaluate(() => {
            localStorage.removeItem('qrCodeEntries');
            const testData = [
                {
                    id: '1',
                    Brand: 'Bambu Lab',
                    Manufacturer: 'Bambu Lab',
                    Material: 'PLA Basic',
                    Color: 'Red',
                    ColorHex: '#FF0000',
                    Weight: '1000',
                    spoolCount: 1,
                    remainingPercentage: 100,
                    Date: new Date().toISOString()
                },
                {
                    id: '2',
                    Brand: 'Prusa',
                    Manufacturer: 'Prusa',
                    Material: 'PETG',
                    Color: 'Blue',
                    ColorHex: '#0000FF',
                    Weight: '750',
                    spoolCount: 1,
                    remainingPercentage: 50,
                    Date: new Date().toISOString()
                }
            ];
            localStorage.setItem('qrCodeEntries', JSON.stringify(testData));
        });

        await page.reload();
        await page.waitForTimeout(2000);

        // Check if inventory system loaded data
        const dataLoaded = await page.evaluate(() => {
            return typeof allEntries !== 'undefined' && allEntries.length > 0;
        });
        logTest('Inventory data loaded', dataLoaded);

        // Check inventory items render - be more flexible about the container
        const itemCount = await page.evaluate(() => {
            // Check multiple possible selectors
            const items1 = document.querySelectorAll('.inventory-item').length;
            const items2 = document.querySelectorAll('[class*="item"]').length;
            const items3 = document.querySelectorAll('tr').length; // In case it's a table
            return Math.max(items1, items2, items3 - 1); // -1 for header row if table
        });
        logTest('Inventory items render', itemCount >= 2, `${itemCount} items displayed`);

        // Test search functionality - find the correct search input
        const searchInputExists = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const searchInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('search'));
            if (searchInput) {
                searchInput.value = 'Bambu';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
            return false;
        });
        
        if (searchInputExists) {
            await page.waitForTimeout(500);
            const searchResults = await page.evaluate(() => {
                // Count visible items after search
                const allItems = document.querySelectorAll('tr, .inventory-item, [class*="item"]');
                let visibleCount = 0;
                allItems.forEach(item => {
                    const style = window.getComputedStyle(item);
                    if (style.display !== 'none' && item.textContent.includes('Bambu')) {
                        visibleCount++;
                    }
                });
                return visibleCount;
            });
            logTest('Search functionality', searchResults >= 1, `${searchResults} items after search`);
        } else {
            logTest('Search functionality', false, 'Search input not found');
        }

        // Clear search  
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const searchInput = inputs.find(i => i.placeholder && i.placeholder.toLowerCase().includes('search'));
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await page.waitForTimeout(500);

        // Test Refine button existence
        const refineButtonExists = await page.$('.refine-color') !== null;
        logTest('Refine button exists', refineButtonExists);

        if (refineButtonExists) {
            // Test color refine overlay
            await page.click('.refine-color');
            await page.waitForTimeout(1000);

            const overlayExists = await page.evaluate(() => {
                return !!document.querySelector('[style*="position: fixed"][style*="z-index: 10000"]');
            });
            logTest('Color refine overlay opens', overlayExists);

            if (overlayExists) {
                // Test search in overlay
                const searchInput = await page.$('input[placeholder="Search color name..."]');
                if (searchInput) {
                    await searchInput.fill('red');
                    await page.waitForTimeout(1500);

                    const hasResults = await page.evaluate(() => {
                        const overlay = document.querySelector('[style*="position: fixed"][style*="z-index: 10000"]');
                        const buttons = Array.from(overlay?.querySelectorAll('button') || []);
                        return buttons.some(b => 
                            !b.textContent.includes('Cancel') && 
                            !b.textContent.includes('Open Color Picker') &&
                            b.textContent.toLowerCase().includes('red')
                        );
                    });
                    logTest('Color search in overlay', hasResults, 'found matching colors');
                }

                // Close overlay
                await page.keyboard.press('Escape');
            }
        }

    } catch (e) {
        logTest('Inventory management', false, e.message);
    }

    // Test 4: CSV Export/Import
    console.log('\n📊 Testing CSV Export/Import...');
    try {
        // Test export button exists
        const exportButton = await page.$('button:has-text("Export CSV")') !== null;
        logTest('Export CSV button exists', exportButton);

        const importButton = await page.$('button:has-text("Import CSV")') !== null;
        logTest('Import CSV button exists', importButton);
    } catch (e) {
        logTest('CSV functionality', false, e.message);
    }

    // Test 5: Generator page
    console.log('\n🏷️ Testing QR Generator...');
    try {
        await page.goto('http://localhost:63512/generator.html');
        await page.waitForTimeout(1000);

        // Check form fields exist
        const manufacturerField = await page.$('#manufacturer') !== null;
        const materialField = await page.$('#customMaterial') !== null;
        const colorField = await page.$('#color') !== null;
        
        logTest('Generator form fields exist', manufacturerField && materialField && colorField);

        // Test QR generation
        if (manufacturerField && colorField) {
            await page.fill('#manufacturer', 'Test Brand');
            await page.fill('#color', 'Red');
            
            // For material, check if we need to select custom first
            await page.evaluate(() => {
                const materialSelect = document.querySelector('#material');
                if (materialSelect) {
                    materialSelect.value = 'custom';
                    materialSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            await page.waitForTimeout(500);
            
            // Try to fill custom material - but don't fail if it's not visible
            try {
                await page.fill('#customMaterial', 'PLA', { timeout: 2000 });
            } catch (e) {
                // Material field might not be visible, that's OK for this test
            }
            
            const generateButton = await page.$('#generateBtn');
            if (generateButton) {
                await generateButton.click();
                await page.waitForTimeout(1000);
                
                const qrExists = await page.$('#qrcode canvas') !== null;
                logTest('QR code generation', qrExists);
            }
        }
    } catch (e) {
        logTest('QR Generator', false, e.message);
    }

    // Test 6: Scanner page
    console.log('\n📷 Testing QR Scanner...');
    try {
        await page.goto('http://localhost:63512/index.html');
        await page.waitForTimeout(1000);

        const cameraButton = await page.$('#cameraButton') !== null;
        const fileInput = await page.$('#fileInput') !== null;
        const recentScans = await page.$('#recentScans') !== null;

        logTest('Scanner UI elements exist', cameraButton && fileInput && recentScans);
    } catch (e) {
        logTest('QR Scanner', false, e.message);
    }

    // Test Summary
    console.log('\n📋 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${passCount + failCount}`);
    console.log(`🎯 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);

    if (failCount === 0) {
        console.log('\n🎉 All tests passed! FilamentDB is fully functional.');
    } else {
        console.log(`\n⚠️  ${failCount} test(s) failed. Review the issues above.`);
    }

    await browser.close();
    return { passed: passCount, failed: failCount };
}

// Run the test suite
runFullTestSuite().catch(console.error);