const fs = require('fs');

const xmlData = fs.readFileSync('strongsgreek.xml', 'utf8');

// Match entry elements with their strongs number
const entryRegex = /<entry strongs="(\d+)">([\s\S]*?)<\/entry>/g;

let match;
let output = '';

function cleanContent(str) {
  // Handle self-closing tags like <strongsref .../>
  let result = str.replace(/<strongsref language="(\w+)" strongs="(\d+)"\s*\/>/g, 'H$2');
  // Handle opening-only tags like <greek ...>word</greek>
  result = result.replace(/<greek[^>]*unicode="([^"]+)"[^>]* translit="[^"]*"[^>]*>([^<]*)<\/greek>/g, '$2');
  result = result.replace(/<greek[^>]*unicode="([^"]+)"[^>]*><\/greek>/g, '');
  // Remove any remaining tags
  result = result.replace(/<[^>]+>/g, '');
  result = result.replace(/\s+/g, ' ').trim();
  // Clean up empty parentheses
  result = result.replace(/\(\s*\)/g, '');
  return result;
}

while ((match = entryRegex.exec(xmlData)) !== null) {
  const strongsNum = match[1];
  const num = parseInt(strongsNum, 10);
  const content = match[2];
  
  // Extract greek unicode word
  const greekMatch = content.match(/<greek[^>]*unicode="([^"]+)"/);
  const greekWord = greekMatch ? greekMatch[1] : '';
  
  // Extract strongs_def
  const defMatch = content.match(/<strongs_def>([\s\S]*?)<\/strongs_def>/);
  const strongsDef = defMatch ? cleanContent(defMatch[1]) : '';
  
  // Extract kjv_def
  const kjvMatch = content.match(/<kjv_def>([\s\S]*?)<\/kjv_def>/);
  let kjvDef = kjvMatch ? cleanContent(kjvMatch[1]) : '';
  kjvDef = kjvDef.replace(/^:?\s*--/, '').trim();
  
  // Extract strongs_derivation
  const derMatch = content.match(/<strongs_derivation>([\s\S]*?)<\/strongs_derivation>/);
  const derivation = derMatch ? cleanContent(derMatch[1]) : '';
  
  // Output format
  output += `G${num} | ${greekWord}\n`;
  if (strongsDef) {
    output += `Definice: ${strongsDef}\n`;
  }
  if (kjvDef) {
    output += `KJV Významy: ${kjvDef}\n`;
  }
  if (derivation) {
    output += `Původ: ${derivation}\n`;
  }
  output += '\n';
}

fs.writeFileSync('strong_greek_detailed.txt', output, 'utf8');

const count = (output.match(/\n\n/g) || []).length;
console.log(`Hotovo! strong_greek_detailed.txt vytvořen (${count} záznamů)`);