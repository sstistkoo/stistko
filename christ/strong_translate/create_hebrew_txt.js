const fs = require('fs');

const xmlData = fs.readFileSync('StrongHebrewG.xml', 'utf8');

// Match entry divs with their number
const entryRegex = /<div type="entry" n="(\d+)">([\s\S]*?)<\/div>/g;

let match;
let output = '';
let count = 0;

while ((match = entryRegex.exec(xmlData)) !== null) {
  const num = parseInt(match[1], 10);
  const content = match[2];
  
  // Extract Hebrew word (from <w> element inside div)
  const wMatch = content.match(/<w[^>]*>([^<]+)<\/w>/);
  const hebrewWord = wMatch ? wMatch[1] : '';
  
  // Extract definitions from <item> elements
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  const meanings = [];
  
  while ((itemMatch = itemRegex.exec(content)) !== null) {
    let def = itemMatch[1].replace(/\s+/g, ' ').trim();
    meanings.push(def);
  }
  
  // Split main meaning from others
  let mainWord = meanings.length > 0 ? meanings[0].replace(/^\d+\)\s*/, '') : '';
  let otherMeanings = meanings.slice(1).map(m => m.replace(/^\d+\)\s*/, ''));
  
  // Format: num | (main) | others
  let line1 = `${num}`;
  if (mainWord) {
    line1 += ` | (${mainWord})`;
    if (otherMeanings.length > 0) {
      line1 += ` | ${otherMeanings.join(' | ')}`;
    }
  }
  
  output += line1 + '\n';
  output += hebrewWord + '\n\n';
  count++;
}

fs.writeFileSync('strong_hebrew_for_translate.txt', output, 'utf8');
console.log(`Hotovo! strong_hebrew_for_translate.txt vytvořen (${count} záznamů)`);