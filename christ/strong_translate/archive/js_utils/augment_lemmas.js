#!/usr/bin/env node
/**
 * Step 2: Augment Czech translations with Hebrew/Greek lemmas
 * Vstup: strong_cz_clean.json (cz translations)
 *        stronghebrew.json (Hebrew lexical data)
 *        strongsgreek.json (Greek lexical data)
 * Výstup: strong_translations_full.json (multi-language with source lemmas)
 */

const fs = require('fs');
const path = require('path');

const INPUT_CZ = path.join(__dirname, '..', 'final', 'strong_cz_clean.json');
const INPUT_HE = path.join(__dirname, '..', 'final', 'stronghebrew.json');
const INPUT_GR = path.join(__dirname, '..', 'final', 'strongsgreek.json');
const OUTPUT = path.join(__dirname, '..', 'final', 'strong_translations_final.json');
const REPORT = path.join(__dirname, '..', 'final', 'finalization_report.txt');

async function main() {
  console.log('=== Augment with Hebrew/Greek Lemmas ===\n');

  // 1. NačístCzech clean translations
  console.log('1. Načítám strong_cz_clean.json...');
  const czData = JSON.parse(fs.readFileSync(INPUT_CZ, 'utf8'));
  const czTranslations = czData.translations || {};
  console.log(`   Čeština: ${Object.keys(czTranslations).length} záznamů`);

  // 2. Načíst Hebrew lexicon
  console.log('\n2. Načítám stronghebrew.json...');
  const heData = JSON.parse(fs.readFileSync(INPUT_HE, 'utf8'));
  const heEntries = heData.entries || {};
  console.log(`   Hebrew entries: ${Object.keys(heEntries).length}`);

  // 3. Načíst Greek lexicon
  console.log('\n3. Načítám strongsgreek.json...');
  const grData = JSON.parse(fs.readFileSync(INPUT_GR, 'utf8'));
  const grEntries = grData.entries || {};
  console.log(`   Greek entries: ${Object.keys(grEntries).length}`);

  // 4. Augment each entry
  console.log('\n4. Augmentuji slova s lemmas...');
  const augmented = {};
  const missingHebrew = [];
  const missingGreek = [];
  const added = { he: 0, gr: 0 };

   for (const [key, czEntry] of Object.entries(czTranslations)) {
     const isHebrew = key.startsWith('H');
     const isGreek = key.startsWith('G');

     let newEntry = { ...czEntry };

     if (isHebrew) {
       const lookupKey = czEntry._lookupKey || key.substring(1); // H00001 -> 1
       const heEntry = heEntries[lookupKey];
       if (heEntry) {
         newEntry.he = heEntry.hebrew || '';
         newEntry.translit = heEntry.xlit || '';
         newEntry.pos = heEntry.POS || heEntry.morph || '';
         // Hlavní anglický překlad (první význam)
         newEntry.en = (heEntry.definitions && heEntry.definitions[0]) || '';
         // VŠECHNY VÝZNAMY - pole
         if (heEntry.definitions && Array.isArray(heEntry.definitions)) {
           newEntry.en_meanings = heEntry.definitions;
         }
         added.he++;
       } else {
         missingHebrew.push(key);
       }
     } else if (isGreek) {
       const lookupKey = czEntry._lookupKey || key.substring(1).padStart(5, '0'); // G00001 -> 00001
       const grEntry = grEntries[lookupKey];
       if (grEntry) {
         newEntry.gr = grEntry.greek?.unicode || '';
         newEntry.translit_gr = grEntry.pronunciation || '';
         // Hlavní anglický překlad
         newEntry.en = grEntry.definition || '';
         // VŠECHNY VÝZNAMY - pole s jedním prvkem
         if (grEntry.definition) {
           newEntry.en_meanings = [grEntry.definition];
         }
         added.gr++;
       } else {
         missingGreek.push(key);
       }
     }

     // Remove temporary _lookupKey
     delete newEntry._lookupKey;

     augmented[key] = newEntry;
   }

   console.log(`   Hebrew lemmas: ${added.he}, Greek lemmas: ${added.gr}`);
   if (missingHebrew.length) console.log(`   Chybí Hebrew: ${missingHebrew.length}`);
   if (missingGreek.length) console.log(`   Chybí Greek: ${missingGreek.length}`);

   // 5. Save output
   console.log('\n5. Ukládám strong_translations_final.json...');
   const output = {
     generated: new Date().toISOString(),
     version: '1.0',
     description: "Strong's lexicon with multi-language translations (cz, en, he, gr)",
     total_entries: Object.keys(augmented).length,
     translations: augmented
   };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');
  console.log(`   Uloženo: ${OUTPUT}`);

  // 6. Report
  console.log('\n6. Generuji augmentation_report.txt...');
  const report = [];
  report.push('=== AUGMENTATION REPORT ===');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Total entries: ${Object.keys(augmented).length}`);
  report.push(`Hebrew lemmas added: ${added.he}`);
  report.push(`Greek lemmas added: ${added.gr}`);
  report.push(`Missing Hebrew: ${missingHebrew.length}`);
  report.push(`Missing Greek: ${missingGreek.length}`);
  if (missingHebrew.length) {
    report.push('\n--- Missing Hebrew (first 20) ---');
    missingHebrew.slice(0, 20).forEach(k => report.push(k));
  }
  if (missingGreek.length) {
    report.push('\n--- Missing Greek (first 20) ---');
    missingGreek.slice(0, 20).forEach(k => report.push(k));
  }
  report.push('\n--- SAMPLE (first 30) ---');
  Object.keys(augmented).slice(0, 30).forEach(key => {
    const e = augmented[key];
    const had = e.he || e.gr || '';
    report.push(`${key}: cz="${e.cz}" | src="${had}" [${e.pos || 'no-pos'}]`);
  });

  fs.writeFileSync(REPORT, report.join('\n'), 'utf8');
  console.log(`   Uloženo: ${REPORT}`);

  console.log('\n✅ Hotovo!');
  console.log('Soubor obsahuje: cz překlad + he/gr lemma + transliterace + POS.');
  console.log('Příště: přidat en, bg, zh, es, pl, sk překlady.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
