#!/usr/bin/env node

/**
 * Script to merge psychiatric SmartLists into the main catalog
 */

const fs = require('fs');
const path = require('path');

// Read existing catalog
const catalogPath = path.join(__dirname, '..', 'configs', 'smartlists-catalog.json');
const psychiatricPath = path.join(__dirname, '..', 'configs', 'psychiatric-smartlists.json');

const existingCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const psychiatricLists = JSON.parse(fs.readFileSync(psychiatricPath, 'utf-8'));

// Merge the SmartLists
const mergedCatalog = {
  smartLists: {
    ...existingCatalog.smartLists,
    ...psychiatricLists.psychiatricSmartLists
  }
};

// Write back the merged catalog
fs.writeFileSync(
  catalogPath,
  JSON.stringify(mergedCatalog, null, 2),
  'utf-8'
);

// Also copy to the web app's config directory
const webCatalogPath = path.join(__dirname, '..', 'apps', 'web', 'configs', 'smartlists-catalog.json');
if (fs.existsSync(path.dirname(webCatalogPath))) {
  fs.writeFileSync(
    webCatalogPath,
    JSON.stringify(mergedCatalog, null, 2),
    'utf-8'
  );
}

console.log(`✅ Merged ${Object.keys(psychiatricLists.psychiatricSmartLists).length} psychiatric SmartLists into catalog`);
console.log(`📝 Total SmartLists in catalog: ${Object.keys(mergedCatalog.smartLists).length}`);

// Group count
const groups = {};
Object.values(mergedCatalog.smartLists).forEach(list => {
  const group = list.group || 'Other';
  groups[group] = (groups[group] || 0) + 1;
});

console.log('\n📊 SmartLists by group:');
Object.entries(groups).sort().forEach(([group, count]) => {
  console.log(`  ${group}: ${count}`);
});