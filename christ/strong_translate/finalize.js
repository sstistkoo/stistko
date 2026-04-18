const fs = require('fs');

const baseDir = 'final';

const czData = JSON.parse(fs.readFileSync(`${baseDir}/strong_translations_full.json`, 'utf8'));
const heData = JSON.parse(fs.readFileSync(`${baseDir}/stronghebrew.json`, 'utf8'));
const grData = JSON.parse(fs.readFileSync(`${baseDir}/strongsgreek.json`, 'utf8'));

const translations = czData.translations;
let output = '';

for (const [key, val] of Object.entries(translations)) {
  const isGreek = key.startsWith('G');
  
  let lookupKey;
  if (isGreek) {
    lookupKey = key.replace('G', '').padStart(5, '0');
  } else {
    lookupKey = key.replace('H', '');
  }

  let en = val.lemma_en || '';
  let allEnMeanings = [];
  
  if (isGreek) {
    const grEntry = grData.entries[lookupKey];
    if (grEntry && grEntry.definition) {
      const def = grEntry.definition.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      allEnMeanings = def.split(/\s*;\s*/).map(s => s.trim()).filter(Boolean);
      if (allEnMeanings.length > 0) {
        en = allEnMeanings[0];
      }
    }
  } else {
    const heEntry = heData[lookupKey];
    if (heEntry && heEntry.definitions) {
      allEnMeanings = heEntry.definitions.map(d => d.replace(/^\d+\)\s*/, '').trim()).filter(Boolean);
      if (allEnMeanings.length > 0) {
        en = allEnMeanings[0];
      }
    }
  }

  let en_meanings_str = '';
  if (allEnMeanings.length > 1) {
    en_meanings_str = ' | ' + allEnMeanings.slice(1).join(' | ');
  }

  output += `${key}: ${en}${en_meanings_str}\n`;

  if (isGreek) {
    output += `${val.gr || ''} ${val.translit_gr || ''}\n`;
  } else {
    output += `${val.he || ''} ${val.translit || ''} ${val.pos || ''}\n`;
  }

  output += `${val.cz || ''}\n\n`;
}

fs.writeFileSync(`${baseDir}/strong_translations_final.txt`, output, 'utf8');

console.log('Hotovo! strong_translations_final.txt vytvořen.');