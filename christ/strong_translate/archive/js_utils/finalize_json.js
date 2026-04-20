const fs = require('fs');

const baseDir = 'final';

const czData = JSON.parse(fs.readFileSync(`${baseDir}/strong_translations_full.json`, 'utf8'));
const heData = JSON.parse(fs.readFileSync(`${baseDir}/stronghebrew.json`, 'utf8'));
const heEntries = heData.entries;
const grData = JSON.parse(fs.readFileSync(`${baseDir}/strongsgreek.json`, 'utf8'));

const translations = czData.translations;
const result = {};

for (const [key, val] of Object.entries(translations)) {
  const isGreek = key.startsWith('G');
  
  let lookupKey;
  if (isGreek) {
    lookupKey = key.replace('G', '').padStart(5, '0');
  } else {
    lookupKey = key.replace('H', '');
  }

  let en = val.lemma_en || '';
  let en_meanings = [];
  
  if (isGreek) {
    const grEntry = grData.entries[lookupKey];
    if (grEntry && grEntry.definition) {
      const def = grEntry.definition.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      en_meanings = def.split(/\s*;\s*/).map(s => s.trim()).filter(Boolean);
      if (en_meanings.length > 0) {
        en = en_meanings[0];
      }
    }
    result[key] = {
      en: en,
      en_meanings: en_meanings,
      gr: val.gr || '',
      translit_gr: val.translit_gr || '',
      cz: val.cz || ''
    };
  } else {
    // Hebrew keys are like "1", "2" (no leading zeros)
    const lookupKey = String(parseInt(key.replace('H', ''), 10));
    const heEntry = heEntries[lookupKey];
    if (heEntry && heEntry.definitions) {
      en_meanings = heEntry.definitions.map(d => d.replace(/^\d+\)\s*/, '').trim()).filter(Boolean);
      if (en_meanings.length > 0) {
        en = en_meanings[0];
      }
    }
    result[key] = {
      en: en,
      en_meanings: en_meanings,
      he: val.he || '',
      translit: val.translit || '',
      pos: val.pos || '',
      cz: val.cz || ''
    };
  }
}

const output = {
  generated: new Date().toISOString(),
  total_entries: Object.keys(result).length,
  entries: result
};

fs.writeFileSync(`${baseDir}/strong_translations_final.json`, JSON.stringify(output, null, 2), 'utf8');

console.log(`Hotovo! strong_translations_final.json vytvořen (${Object.keys(result).length} záznamů).`);