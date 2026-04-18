const fs = require('fs');

const xmlData = fs.readFileSync('strongsgreek.xml', 'utf8');

// Match entry elements with their strongs number
const entryRegex = /<entry strongs="(\d+)">([\s\S]*?)<\/entry>/g;

let match;
let output = '';

while ((match = entryRegex.exec(xmlData)) !== null) {
  const strongsNum = match[1];
  const num = parseInt(strongsNum, 10);
  const content = match[2];
  
  // Extract greek unicode word
  const greekMatch = content.match(/<greek[^>]*unicode="([^"]+)"/);
  const greekWord = greekMatch ? greekMatch[1] : '';
  
  // Extract strongs_def
  const defMatch = content.match(/<strongs_def>([\s\S]*?)<\/strongs_def>/);
  let cleanDef = '';
  if (defMatch) {
    cleanDef = defMatch[1].replace(/\s+/g, ' ').trim();
  }
  
  // Split by semicolons for multiple meanings
  let meanings = cleanDef.split(/\s*;\s*/).map(s => s.trim()).filter(Boolean);
  
  let mainWord = meanings.length > 0 ? meanings[0] : '';
  let otherMeanings = meanings.slice(1);
  
  // Format: num | (main) | others
  let line1 = `${num}`;
  if (mainWord) {
    line1 += ` | (${mainWord})`;
    if (otherMeanings.length > 0) {
      line1 += ` | ${otherMeanings.join(' | ')}`;
    }
  }
  
  output += line1 + '\n';
  output += greekWord + '\n\n';
}

fs.writeFileSync('strong_greek_for_translate.txt', output, 'utf8');

// Count entries
const count = (output.match(/\n\n/g) || []).length;
console.log(`Hotovo! strong_greek_for_translate.txt vytvořen (${count} záznamů)`);