const fs = require('fs');
const path = require('path');

// Read the catalog
const catalogPath = path.join(__dirname, '../configs/smartlists-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Build groups from SmartLists
const groupsMap = {};

// Process smartLists object
Object.entries(catalog.smartLists || {}).forEach(([key, smartList]) => {
  const groupName = smartList.group;
  if (groupName) {
    if (!groupsMap[groupName]) {
      groupsMap[groupName] = {
        name: groupName,
        description: getGroupDescription(groupName),
        smartLists: []
      };
    }
    groupsMap[groupName].smartLists.push(key); // Use the key, not the identifier
  }
});

// Process top-level SmartLists (psych_ros_*, cocaine_use, etc.)
Object.entries(catalog).forEach(([key, value]) => {
  if (key !== 'smartLists' && key !== 'groups' && typeof value === 'object' && value.group) {
    const groupName = value.group;
    if (groupName) {
      if (!groupsMap[groupName]) {
        groupsMap[groupName] = {
          name: groupName,
          description: getGroupDescription(groupName),
          smartLists: []
        };
      }
      groupsMap[groupName].smartLists.push(key); // Use the key, not the identifier
    }
  }
});

// Helper function to generate descriptions
function getGroupDescription(groupName) {
  const descriptions = {
    'Mental Status Exam': 'Components of the mental status examination including appearance, behavior, speech, thought process, and cognitive functioning.',
    'Psychiatric ROS': 'Psychiatric review of systems covering mood, psychosis, anxiety, trauma, ADHD, and other psychiatric symptom domains.',
    'Substance Use': 'Substance use history including alcohol, cannabis, stimulants, opioids, benzodiazepines, tobacco, and other substances.',
    'Social History': 'Social determinants of health including living situation, employment, education, relationships, and support systems.',
    'Past Psychiatric History': 'Prior psychiatric hospitalizations, suicide attempts, and treatment history.',
    'Medications': 'Medication compliance and adherence patterns.',
    'Assessment': 'Clinical assessment including risk level and prognosis.',
    'Plan': 'Treatment planning including therapy referrals and follow-up timeframes.'
  };
  return descriptions[groupName] || `SmartLists related to ${groupName}`;
}

// Add groups to catalog
catalog.groups = groupsMap;

// Write updated catalog
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

console.log('✅ Successfully added groups structure to smartlists-catalog.json');
console.log(`\nGroups created: ${Object.keys(groupsMap).length}`);
Object.entries(groupsMap).forEach(([groupName, group]) => {
  console.log(`  - ${groupName}: ${group.smartLists.length} SmartLists`);
});
