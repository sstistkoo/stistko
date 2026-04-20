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
  
  // Extract translation from <note type="translation">
  const transMatch = content.match(/<note type="translation">([\s\S]*?)<\/note>/);
  const translation = transMatch ? transMatch[1].replace(/\s+/g, ' ').trim() : '';
  
  // Extract definitions from <item> elements
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  let definitions = '';
  
  while ((itemMatch = itemRegex.exec(content)) !== null) {
    let def = itemMatch[1].replace(/\s+/g, ' ').trim();
    if (definitions) definitions += '; ';
    definitions += def;
  }
  
  // Output format with H prefix
  output += `H${num} | ${hebrewWord}\n`;
  if (translation) {
    output += `Definice: ${translation}\n`;
  }
  if (definitions) {
    output += `Významy: ${definitions}\n`;
  }
  output += '\n';
  count++;
}

fs.writeFileSync('strong_hebrew_detailed.txt', output, 'utf8');
console.log(`Hotovo! strong_hebrew_detailed.txt vytvořen (${count} záznamů)`);