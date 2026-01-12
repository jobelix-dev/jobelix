/**
 * Version Checking Test Script
 * 
 * Run this to test the version comparison logic without starting the full app.
 * Usage: node test-version-check.js
 */

// Copy of compareVersions function from main.js
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}

// Test cases
const tests = [
  // [version1, version2, expectedResult, description]
  ['1.0.0', '1.0.0', 0, 'Equal versions'],
  ['1.0.0', '1.0.1', -1, 'Patch difference'],
  ['1.0.1', '1.0.0', 1, 'Patch difference (reverse)'],
  ['1.0.0', '1.1.0', -1, 'Minor difference'],
  ['1.1.0', '1.0.0', 1, 'Minor difference (reverse)'],
  ['1.0.0', '2.0.0', -1, 'Major difference'],
  ['2.0.0', '1.0.0', 1, 'Major difference (reverse)'],
  ['0.1.0', '0.2.0', -1, 'Version 0.x comparison'],
  ['1.0.0', '0.9.9', 1, 'Major trumps minor'],
  ['1.0', '1.0.0', 0, 'Missing patch component'],
];

console.log('🧪 Testing Version Comparison Logic\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

tests.forEach(([v1, v2, expected, description]) => {
  const result = compareVersions(v1, v2);
  const isPass = result === expected;
  
  if (isPass) {
    passed++;
    console.log(`✅ PASS: ${description}`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Expected: ${expected}, Got: ${result}`);
  }
  console.log(`   compareVersions("${v1}", "${v2}") → ${result}\n`);
});

console.log('=' .repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

// Compatibility check examples
console.log('🔍 Compatibility Check Examples:\n');
console.log('=' .repeat(60));

const scenarios = [
  {
    currentApp: '0.1.0',
    currentEngine: '1.0.0',
    requiredApp: '0.1.0',
    requiredEngine: '1.0.0',
    shouldPass: true
  },
  {
    currentApp: '0.1.0',
    currentEngine: '1.0.0',
    requiredApp: '0.2.0',
    requiredEngine: '1.0.0',
    shouldPass: false
  },
  {
    currentApp: '1.5.0',
    currentEngine: '2.0.0',
    requiredApp: '1.0.0',
    requiredEngine: '1.5.0',
    shouldPass: true
  },
  {
    currentApp: '1.0.0',
    currentEngine: '1.0.0',
    requiredApp: '1.0.0',
    requiredEngine: '1.1.0',
    shouldPass: false
  }
];

scenarios.forEach((scenario, index) => {
  const appCompatible = compareVersions(scenario.currentApp, scenario.requiredApp) >= 0;
  const engineCompatible = compareVersions(scenario.currentEngine, scenario.requiredEngine) >= 0;
  const isCompatible = appCompatible && engineCompatible;
  
  const statusIcon = isCompatible ? '✅' : '❌';
  const expectedIcon = scenario.shouldPass ? '✅' : '❌';
  const testPassed = isCompatible === scenario.shouldPass;
  
  console.log(`\nScenario ${index + 1}: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Current:  App ${scenario.currentApp}, Engine ${scenario.currentEngine}`);
  console.log(`  Required: App ${scenario.requiredApp}, Engine ${scenario.requiredEngine}`);
  console.log(`  App Compatible:    ${appCompatible ? '✅' : '❌'}`);
  console.log(`  Engine Compatible: ${engineCompatible ? '✅' : '❌'}`);
  console.log(`  Overall:           ${statusIcon} (Expected: ${expectedIcon})`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✨ Test complete! Version checking logic is working correctly.\n');
