/**
 * Strong Greek to Czech Translator - Core Module
 */

export function parseTXT(text) {
  const lines = text.split('\n');
  const entries = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const lineTrim = lines[i].trim();
    
    if (!lineTrim) {
      if (current && current.key) {
        entries.push(finishEntry(current));
        current = null;
      }
      continue;
    }
    
    const newMatch = lineTrim.match(/^([GH]\d+)\s*\|\s*(.+)$/);
    if (newMatch) {
      if (current && current.key) {
        entries.push(finishEntry(current));
      }
      const type = newMatch[1].startsWith('H') && parseInt(newMatch[1].slice(1)) >= 9000 ? 'grammar' 
                 : newMatch[1].startsWith('H') ? 'hebrew' : 'greek';
      current = { key: newMatch[1], greek: newMatch[2].trim(), type };
      continue;
    }
    
    if (!current) continue;
    
    const colonIdx = lineTrim.indexOf(':');
    if (colonIdx === -1) continue;
    
    const fieldName = lineTrim.slice(0, colonIdx).trim();
    const fieldValue = lineTrim.slice(colonIdx + 1).trim();
    
    // Greek fields
    if (fieldName === 'BETA') current.beta = fieldValue;
    else if (fieldName === 'Prepis') current.prepis = fieldValue;
    else if (fieldName === 'Tvaroslovi') current.tvaroslovi = fieldValue;
    else if (fieldName === 'Definice') current.definice = fieldValue;
    else if (fieldName === 'En') current.en = fieldValue;
    else if (fieldName === 'En Definition') current.enDef = fieldValue;
    else if (fieldName === 'KJV Významy') current.kjv = fieldValue;
    else if (fieldName === 'Cz') { current.cz = fieldValue; current.czDef = fieldValue; }
    // Hebrew fields
    else if (fieldName === 'Vokalizace') current.vokalizace = fieldValue;
    else if (fieldName === 'Vyslovnost') current.vyslovnost = fieldValue;
    else if (fieldName === 'Etymol') current.etymol = fieldValue;
    else if (fieldName === 'TWOT') current.twot = fieldValue;
    else if (fieldName === 'Poznamky') current.poznamky = fieldValue;
    else if (fieldName === 'Překlad') current.preklad = fieldValue;
    else if (fieldName === 'Vysvětlení') current.vysvetleni = fieldValue;
    else if (fieldName === 'Řecké refs') current.greekRefs = fieldValue;
    // Grammar fields
    else if (fieldName === 'Kategorie') current.kategorie = fieldValue;
    else if (fieldName === 'Vyznam_Cz') current.vyznamCz = fieldValue;
  }
  
  if (current && current.key) {
    entries.push(finishEntry(current));
  }
  
  console.log('PARSE: ' + entries.length + ' entries');
  return entries;
}

function extractVyskyt(defText) {
  if (!defText) return '';
  const matches = defText.match(/\[[\w]+\.?\d*:\d+\]/g);
  if (!matches) return '';
  return matches.map(m => m.replace(/[\[\]]/g, '')).join(', ');
}

export function buildPromptMessages(batch) {
  const items = batch.map(e => {
    const def = e.definice || e.def || '';
    return `${e.key} | ${e.greek}\nDEF: ${def}`;
  }).join('\n\n');

  return [
    { role: 'system', content: SYSTEM_MESSAGE },
    { role: 'user', content: 'Preloz hesla:\n' + items }
  ];
}

export function buildRetryMessages(userContent) {
  return [
    { role: 'system', content: SYSTEM_MESSAGE },
    { role: 'user', content: userContent }
  ];
}

function finishEntry(e) {
  const base = { key: e.key, greek: e.greek, definice: e.definice || '' };
  const vyskyt = extractVyskyt(e.definice);
  const tvaroslovi = e.tvaroslovi || '';
  
  if (e.type === 'greek') {
    return { ...base, orig: tvaroslovi, en: e.en || '', enDef: e.enDef || '', kjv: e.cz || e.kjv || '', czDef: e.czDef || '', beta: e.beta || '', prepis: e.prepis || '', tvaroslovi: tvaroslovi, vyskyt: vyskyt };
  } else if (e.type === 'hebrew') {
    return { ...base, orig: tvaroslovi, en: e.en || '', enDef: e.enDef || '', kjv: e.cz || e.kjv || '', beta: '', prepis: e.prepis || '', tvaroslovi: tvaroslovi, vokalizace: e.vokalizace || '', vyslovnost: e.vyslovnost || '', etymol: e.etymol || '', twot: e.twot || '', poznamky: e.poznamky || '', preklad: e.preklad || '', vysvetleni: e.vysvetleni || '', greekRefs: e.greekRefs || '', vyskyt: vyskyt };
  } else {
    // Grammar
    return { ...base, orig: tvaroslovi, en: e.en || '', enDef: e.enDef || '', kjv: e.vyznamCz || e.cz || '', beta: '', prepis: e.prepis || '', tvaroslovi: tvaroslovi, vokalizace: e.vokalizace || '', kategorie: e.kategorie || '', vyznamCz: e.vyznamCz || '' };
  }
}

export function parseTranslations(raw, keys, translated = {}) {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/(?=###[GH]\d+###)/);
  
  const numToKey = {};
  for (const k of keys) {
    const num = k.slice(1);
    numToKey[num] = k;
  }
  
  for (const block of blocks) {
    const km = block.match(/###([GH]\d+)###/);
    if (!km) continue;
    
    const foundKey = km[1];
    const num = foundKey.slice(1);
    
    let targetKey = null;
    if (keys.includes(foundKey)) {
      targetKey = foundKey;
    } else if (numToKey[num]) {
      targetKey = numToKey[num];
    } else {
      continue;
    }
    
    const content = block.slice(km[0].length).trim();
    
    const normalizedLabels = {
      'DEF': 'DEFINICE',
      'CZ': 'VYZNAM',
      'VÝZNAM': 'VYZNAM',
      'DEFINITION': 'DEFINICE',
      'MEANING': 'VYZNAM',
      'USAGE': 'POUZITI',
      'ORIGIN': 'PUVOD',
      'COMMENTARY': 'SPECIALISTA',
      'EXEGESIS': 'SPECIALISTA',
      'KJV': 'KJV'
    };
    
    const fieldPositions = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const labelMatch = line.match(/^(VYZNAM|DEFINICE|POUZITI|PUVOD|KJV|SPECIALISTA|VYKLAD|KOMENTAR|EXEGEZE|DEF|DEFINITION|MEANING|USAGE|ORIGIN|COMMENTARY|EXEGESIS)\s*[-:–—=.]?\s*/i);
      if (labelMatch) {
        let label = labelMatch[1].toUpperCase();
        if (label === 'VYKLAD' || label === 'KOMENTAR' || label === 'EXEGEZE') label = 'SPECIALISTA';
        if (normalizedLabels[label]) {
          label = normalizedLabels[label];
        }
        if (['VYZNAM', 'DEFINICE', 'POUZITI', 'PUVOD', 'KJV', 'SPECIALISTA'].includes(label)) {
          fieldPositions.push({ label, startLine: i, labelLen: labelMatch[0].length });
        }
      }
    }
    
    const fields = {};
    for (let i = 0; i < fieldPositions.length; i++) {
      const current = fieldPositions[i];
      const label = current.label;
      const startLine = current.startLine;
      const labelLen = current.labelLen;
      
      let endLine = lines.length;
      if (i < fieldPositions.length - 1) {
        endLine = fieldPositions[i + 1].startLine;
      }
      
      let value = '';
      for (let j = startLine; j < endLine; j++) {
        let lineContent = lines[j];
        if (j === startLine) {
          lineContent = lineContent.slice(labelLen).trim();
        }
        lineContent = lineContent.trim();
        if (lineContent) {
          value += (value ? ' ' : '') + lineContent;
        }
      }
      fields[label] = value.trim();
    }
    
    translated[targetKey] = {
      vyznam: fields['VYZNAM'] || '',
      definice: fields['DEFINICE'] || '',
      pouziti: fields['POUZITI'] || '',
      puvod: fields['PUVOD'] || '',
      specialista: fields['SPECIALISTA'] || '',
      kjv: fields['KJV'] || '',
      _rawDefinition: content  // Store full raw content
    };
  }
  
  return keys.filter(k => !translated[k]?.vyznam || !translated[k]?.specialista);
}

export const SYSTEM_MESSAGE = `Jsi specialista na biblistiku, koine rectinu/hebrejstinu a Strongova cisla.
Prekladac Strongova slovniku do cestiny.

Odpovez JEN v tomto formatu - NIC JINEHO:
###G123###
VYZNAM: [cesky]
DEFINICE: [co nejvernejsi cesky preklad cele EN definice]
POUZITI: [refs v hranatych zavorkach]
PUVOD: [etymologie]
KJV: [preklad]
SPECIALISTA: [biblicky odborny vyklad vlastnimi slovy]

PRAVIDLA PRO DEFINICE:
- Preloz EN definici co nejpresneji, zachovej strukturu vyctu (1., 2., a), b)).
- Zachovej zavorky, stredniky, zkratky a poznamky typu "cf.", "SYN.", "opp.", pokud jsou v predloze.
- Nic nevynechavej ani nezjednodusuj do jedne kratke parafraze.
- Pokud je v EN definici vice casti, preved vsechny casti do CZ ve stejnem poradi.
- Pokud EN definice obsahuje biblicke reference v hranatych zavorkach, zachovej je i v poli DEFINICE.

PRAVIDLA PRO OSTATNI POLE:
- POUZITI: uved odkazy z EN definice jako samostatny souhrn v hranatych zavorkach.
- PUVOD: uved konkretni puvod (jazyk + koren/slovo v puvodnim pismu, je-li dostupne), ne jen obecne "z hebrejskeho" nebo "z reckeho".
- KJV: uved KJV ekvivalent, necopyruj zbytecne obsah z DEFINICE.
- SPECIALISTA: 3-5 vet, pridat kontext vyznamu v biblickem uziti; nesmi to byt jen parafraze jedne kratke vety.

ZAKAZY:
- Nepiste "ZVLASTNI:" ani jine pokyny
- "__1." nahradte cislem 1.
- "__2." nahradte cislem 2.
- "al." = "v dalsich mistech"
- HODNOTY V DEFINICI: 1., 2., 3. (CISLA, ne __1.)`;

export const DEFAULT_PROMPT = `Jsi specialista na biblistiku, koine rectinu/hebrejstinu a Strongova cisla.
Preloz hesla do {TARGET_LANG} ze {SOURCE_LANG}.

Vrat JEN data, bez komentaru navic. Zachovej poradi hesel.
Pouzij pro kazde heslo presne tento format:
###G[cislo]###
VYZNAM: [kratky presny preklad]
DEFINICE: [co nejvernejsi preklad cele EN definice, vcetne zavorek a cislovani]
POUZITI: [biblicke reference v hranatych zavorkach]
PUVOD: [etymologie: z reckeho / z hebrejskeho korene]
KJV: [hlavni KJV preklad]
SPECIALISTA: [souvisly odstavec 3-5 vet, bez odrazek]

Pravidla normalizace a kvality:
- "__1." a "__2." prepis na "1." a "2."
- "al." prepis na "v dalsich mistech"
- "indecl." preloz jako "nezmenitelny"
- Nepis "ZVLASTNI:" ani jine instrukce
- V DEFINICI neparafrazuj: zachovej poradi bodu, podbodu i zavorkove vlozky.
- Nezkracuj odborny obsah: zachovej vyznam vsech casti puvodni definice (vcetne gramatickych a lexikalnich poznamek).
- Zakaz EN zbytku v DEFINICI: preloz i kratke segmenty typu "figuratively", "metaphorically", "properly", "esp.", "lit.".
- Pokud jsou reference [Mat./Mrk./...], zachovej je i v DEFINICI a soucasne je dej do POUZITI.
- V PUVOD uvadej konkretni etymologii (napr. "z heb. אֲבִיָּהוּד"), ne obecne formulace.
- SPECIALISTA nesmi byt 1 veta ani opis KJV/DEFINICE; musi pridat vecny biblicky kontext.
- Interni QA pred odevzdanim: zkontroluj, ze zadny blok neni useknuty a posledni heslo davky je kompletni.

HESLA:
{HESLA}`;

export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function validateAPIResponse(d, p) {
  if (!d) throw new Error('Empty');
  if (p === 'groq' && !d.choices?.[0]?.message?.content) throw new Error('Invalid Groq');
  if (p === 'gemini' && !d.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Invalid Gemini');
  if (p === 'openrouter') {
    const content = d.choices?.[0]?.message?.content;
    const hasString = typeof content === 'string' && content.trim().length > 0;
    const hasArrayText = Array.isArray(content) && content.some(part =>
      typeof part === 'string' ||
      (part && typeof part.text === 'string' && part.text.trim().length > 0)
    );
    if (!hasString && !hasArrayText) throw new Error('Invalid OpenRouter');
  }
  return true;
}

export default { parseTXT, parseTranslations, buildPromptMessages, buildRetryMessages, SYSTEM_MESSAGE, DEFAULT_PROMPT, escHtml, validateAPIResponse };