#!/usr/bin/env node
/**
 * Strong's Czech Translation Extractor & Cleaner
 * Vstup: strong_bible_cz.json (definitions_cz s vícevýznamovými definicemi)
 * Výstup: strong_cz_clean.json (jednoduché lexikální překlady)
 */

const fs = require('fs');
const path = require('path');

// Konfigurace
const INPUT_FILE = path.join(__dirname, '..', 'final', 'strong_bible_cz.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'final', 'strong_cz_clean.json');
const REPORT_FILE = path.join(__dirname, '..', 'final', 'extraction_report.txt');

/**
 * Vyčistí definitions_cz a extrahuje hlavní lexém (překlad)
 */
function extractCzechTranslation(definitions) {
  if (!definitions || typeof definitions !== 'string') return '';

  // Odstranit problematické znaky
  let cleaned = definitions.replace(/[\uFFFD\u0000]/g, '');

  // Rozdělit podle "|"
  const parts = cleaned.split('|');
  let mainPart = '';

  // Procházení částí: hledáme část s číselným významem "1)" nebo '='
  for (const part of parts) {
    let candidate = part.trim();

    // Přeskočit gramatické značky na začátku
    candidate = candidate.replace(/^(n\s+[mf]\s*|adj\s*|adv\s*|subst\s*|prep\s*|conj\s*|art\s*|interj\s*|v\s+)?/i, '');

    // Odstranit poznámkové suffixy
    candidate = candidate.replace(/\s*\+\+\+\s*$/i, '');
    candidate = candidate.replace(/\s*\/.+$/i, '');

    // Odstranit závorky na začátku: "(množné číslo)"
    candidate = candidate.replace(/^\([^)]*\)\s*/, '');

    if (!candidate) continue;

    // Odstranit číselné předpony: "1) ", "2) ", "1a) "
    candidate = candidate.replace(/^\d+[a-z]?\)\s*/, '');

    if (!candidate) continue;

    // Vlastní jména: "Jméno = \"význam\"" → "Jméno"
    if (candidate.includes('=')) {
      candidate = candidate.split('=')[0].trim();
    }

    // Pokud obsahuje čárku, vzít první položinu
    if (candidate.includes(',')) {
      candidate = candidate.split(',')[0].trim();
    }

    // Odstranit závorky a jejich obsah
    candidate = candidate.replace(/\s*\([^)]*\)/g, '');

    // Odstranit otazníky
    candidate = candidate.replace(/\?/g, '').trim();

    if (candidate) {
      mainPart = candidate;
      break;
    }
  }

  // Last resort
  if (!mainPart) {
    let lastResort = cleaned
      .replace(/^\d+[a-z]?\)\s*/g, '')
      .replace(/\|.*$/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[?+]/g, '')
      .trim();
    if (lastResort) mainPart = lastResort;
  }

  return mainPart;
}

/**
 * Normalizuje Strong číslo
 * H1 → "1" (pro vyhledání ve stronghebrew.json)
 * G1 → "00001" (pro vyhledání ve strongsgreek.json - 5 digits)
 * Výstup: H1 → "H00001", G1 → "G00001"
 */
function normalizeForLookup(num) {
  if (num.startsWith('H')) return num.substring(1);
  if (num.startsWith('G')) return parseInt(num.substring(1), 10).toString().padStart(5, '0');
  return num;
}

function normalizeForOutput(num) {
  if (num.startsWith('H') || num.startsWith('G')) {
    const prefix = num.startsWith('H') ? 'H' : 'G';
    const digits = num.substring(1);
    if (/^\d{5}$/.test(digits)) return prefix + digits;
    return prefix + parseInt(digits, 10).toString().padStart(5, '0');
  }
  return 'H' + parseInt(num, 10).toString().padStart(5, '0');
}

/**
 * Hlavní funkce
 */
async function main() {
  console.log('=== Strong Czech Translation Extractor ===\n');

  console.log('1. Načítám strong_bible_cz.json...');
  let rawData;
  try {
    const raw = fs.readFileSync(INPUT_FILE, 'utf8');
    rawData = JSON.parse(raw);
  } catch (err) {
    console.error('Chyba při načítání souboru:', err.message);
    process.exit(1);
  }

  const entries = rawData.entries || {};
  const totalEntries = Object.keys(entries).length;
  console.log(`   Nalezeno ${totalEntries} Strong čísel`);

  console.log('\n2. Extrahuji a čistím české překlady...');
  const translations = {};
  const warnings = [];
  const duplicates = new Set();

  let processed = 0;
  for (const [strongNum, data] of Object.entries(entries)) {
    processed++;
    const outputKey = normalizeForOutput(strongNum);
    const lookupKey = normalizeForLookup(strongNum);

    if (translations[outputKey]) {
      duplicates.add(outputKey);
      continue;
    }

    const definitions = data.definitions_cz || '';
    const extracted = extractCzechTranslation(definitions);

    if (!extracted) {
      warnings.push(`${outputKey}: prázdný překlad (původ: "${definitions.substring(0, 50)}...")`);
    }

    translations[outputKey] = {
      cz: extracted,
      _lookupKey: lookupKey
    };
  }

  console.log(`   Zpracováno: ${processed} → ${Object.keys(translations).length} unikátních`);
  const hCount = Object.keys(translations).filter(k => k.startsWith('H')).length;
  const gCount = Object.keys(translations).filter(k => k.startsWith('G')).length;
  console.log(`   Hebrejština (H): ${hCount}, Řečtina (G): ${gCount}`);

  if (duplicates.size > 0) {
    console.log(`   POZOR: ${duplicates.size} duplicitních čísel!`);
  }

  console.log('\n3. Ukládám clean output...');
  const output = {
    generated: new Date().toISOString(),
    source: 'strong_bible_cz.json',
    total_entries: Object.keys(translations).length,
    translations
  };

  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    console.log(`   Uloženo: ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Chyba při ukládání:', err.message);
    process.exit(1);
  }

  console.log('\n4. Generuji report...');
  const report = [];
  report.push('=== EXTRACTION REPORT ===');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Total input: ${totalEntries}`);
  report.push(`Unique: ${Object.keys(translations).length}`);
  report.push(`Duplicates: ${duplicates.size}`);
  report.push(`H count: ${hCount}, G count: ${gCount}`);
  report.push(`\n--- WARNINGS (${warnings.length}) ---`);
  warnings.forEach(w => report.push(w));
  report.push(`\n--- DUPLICATES (${duplicates.size}) ---`);
  duplicates.forEach(d => report.push(d));
  report.push(`\n--- SAMPLE (first 20) ---`);
  Object.keys(translations).slice(0, 20).forEach(key => {
    report.push(`${key}: "${translations[key].cz}"`);
  });

  fs.writeFileSync(REPORT_FILE, report.join('\n'), 'utf8');
  console.log(`   Uloženo: ${REPORT_FILE}`);

  console.log('\n5. Validuji proti zdrojovým lexikonům...');
  await validateAgainstSources(translations);

  console.log('\n✅ Hotovo!');
  console.log('Kontroluj warnings v reportu a pokračuj přidáním lemmat.');
}

/**
 * Validuje překlady proti stronghebrew.json a strongsgreek.json
 */
async function validateAgainstSources(translations) {
  const hebrewFile = path.join(__dirname, '..', 'final', 'stronghebrew.json');
  const greekFile = path.join(__dirname, '..', 'final', 'strongsgreek.json');

  let hebrewData, greekData;
  try {
    hebrewData = JSON.parse(fs.readFileSync(hebrewFile, 'utf8'));
    greekData = JSON.parse(fs.readFileSync(greekFile, 'utf8'));
  } catch (err) {
    console.error('Chyba při načítání lexikonů:', err.message);
    return;
  }

  const hebrewKeys = Object.keys(hebrewData.entries || {});
  const greekKeys = Object.keys(greekData.entries || {});

  console.log(`   Hebrew keys: ${hebrewKeys.length}, Greek keys: ${greekKeys.length}`);

  const missingInHebrew = [];
  const missingInGreek = [];
  const foundInHebrew = [];
  const foundInGreek = [];

  for (const [outputKey, data] of Object.entries(translations)) {
    const lookupKey = data._lookupKey || normalizeForLookup(outputKey);

    if (outputKey.startsWith('H')) {
      if (hebrewKeys.includes(lookupKey)) foundInHebrew.push(outputKey);
      else missingInHebrew.push(outputKey);
    } else if (outputKey.startsWith('G')) {
      if (greekKeys.includes(lookupKey)) foundInGreek.push(outputKey);
      else missingInGreek.push(outputKey);
    }
  }

  console.log(`   Hebrew: ${foundInHebrew.length} nalezeno, ${missingInHebrew.length} chybí`);
  console.log(`   Greek: ${foundInGreek.length} nalezeno, ${missingInGreek.length} chybí`);

  if (missingInHebrew.length > 0) {
    console.log('   Chybějící H (prvních 10):', missingInHebrew.slice(0, 10).join(', '));
  }
  if (missingInGreek.length > 0) {
    console.log('   Chybějící G (prvních 10):', missingInGreek.slice(0, 10).join(', '));
  }
}

// Spustit
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
