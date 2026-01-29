// Test semi-strict search functionality - V2 (Regex approach)

// Simulate the semiStrictSearch method
function semiStrictSearch(code, search) {
  try {
    const searchLines = search.split('\n');

    // Build a regex pattern that matches the search content but allows any leading whitespace
    const patternLines = searchLines.map(line => {
      const trimmed = line.trimStart();
      if (trimmed.length === 0) {
        return '\\s*';
      }
      // Match any amount of leading whitespace, then the exact content
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return '\\s*' + escaped;
    });

    // Join with actual newline (not escaped)
    const pattern = patternLines.join('\n');
    const regex = new RegExp(pattern, 's'); // 's' flag for dotAll mode
<html>
<body>
    <div class="calculator-container">
        <h1>Kalkulačka</h1>
        <div class="display">0</div>
    </div>
</body>
</html>`;

const testSearch = `<div class="calculator-container">
  <h1>Kalkulačka</h1>
  <div class="display">0</div>
</div>`;

const result1 = semiStrictSearch(testCode, testSearch);
console.log('Result:', result1);

if (result1.found) {
  const foundText = testCode.substring(result1.index, result1.index + 100);
  console.log('✅ FOUND at index', result1.index);
  console.log('Found text:', foundText.substring(0, 50) + '...');
} else {
  console.log('❌ NOT FOUND');
}

// Test case 2: Different indentation levels
console.log('\n=== TEST 2: Different indentation (8 spaces vs 2 spaces) ===');

const testCode2 = `function test() {
        const x = 10;
        const y = 20;
        return x + y;
}`;

const testSearch2 = `const x = 10;
  const y = 20;
  return x + y;`;

const result2 = semiStrictSearch(testCode2, testSearch2);
console.log('Result:', result2);

if (result2.found) {
  const foundText = testCode2.substring(result2.index, result2.index + 50);
  console.log('✅ FOUND at index', result2.index);
  console.log('Found text:', foundText);
} else {
  console.log('❌ NOT FOUND');
}

// Test case 3: Should NOT match if content differs
console.log('\n=== TEST 3: Should NOT match if content differs ===');

const testCode3 = `<div class="calculator">
    <h1>Calculator</h1>
</div>`;

const testSearch3 = `<div class="calculator">
  <h1>Kalkulačka</h1>
</div>`;

const result3 = semiStrictSearch(testCode3, testSearch3);
console.log('Result:', result3);

if (result3.found) {
  console.log('❌ INCORRECTLY FOUND (should not match - different content)');
} else {
  console.log('✅ CORRECTLY NOT FOUND (content differs)');
}

console.log('\n=== TEST SUMMARY ===');
console.log('Test 1 (different indent):', result1.found ? '✅ PASS' : '❌ FAIL');
console.log('Test 2 (8 vs 2 spaces):', result2.found ? '✅ PASS' : '❌ FAIL');
console.log('Test 3 (different content):', !result3.found ? '✅ PASS' : '❌ FAIL');
