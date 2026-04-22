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

export const SYSTEM_MESSAGE = `Prekladac Strongova slovniku do cestiny.

Odpovez JEN v tomto formatu - NIC JINEHO:
###G123###
VYZNAM: [cesky]
DEFINICE: [cesky preklad]
POUZITI: [refs v hranatych zavorkach]
PUVOD: [etymologie]
KJV: [preklad]
SPECIALISTA: [biblicky odborny vyklad vlastnimi slovy]

ZAKAZY:
- Nepiste "ZVLASTNI:" ani jine pokyny
- "__1." nahradte cislem 1.
- "__2." nahradte cislem 2.
- "al." = "v dalsich mistech"
- HODNOTY V DEFINICI: 1., 2., 3. (CISLA, ne __1.)`;

export const DEFAULT_PROMPT = `Preloz hesla do CESTINY.

ZVLASTNI - POVINNE:
- "__1." -> "1.", "__2." -> "2." (CISLA, ne podtrzitka!)
- "al." = "v dalsich mistech"
- indecl. = nezmenitelny
- POUZITI: [Luk.1:5], [Mk 14:36]
- PUVOD: z řeckého X / z hebrejskeho Y
- ZAKAZ: Nepiste "ZVLASTNI:"!

Priklad:
VSTUP: G2 | Ἀαρών
DEF: Ἀαρών (Heb. אַהֲרוֹן), indecl. (in FlJ, -ῶνος), Aaron ([Exo.4:14], al.): [Luk.1:5], [Act.7:40].

SPRAVNE:
###G2###
VYZNAM: Árón
DEFINICE: Árón (hebrejsky אַהֲרוֹן), nesklonnitelný: [Exo 4:14], v dalsich mistech, [Luk.1:5], [Sk 7:40].
POUZITI: [Luk.1:5], [Skutky 7:40]
PUVOD: z hebrejskeho אַהֲרוֹן
KJV: Árón
SPECIALISTA: Jmeno Aaron v biblickem kontextu casto nese rodovou a knezskou autoritu; v NZ je spojeno s chrámovou sluzbou a starozakonnim odkazem.

VSTUP: G24 | ἀγανάκτησις
DEF: ἀγανάκτησις, -εως, ἡ (ἀγανακτέω), [in LXX:] indignation: [2Co.7:11].

SPRAVNE:
###G24###
VYZNAM: rozhořčení
DEFINICE: rozhořčení (ἀγανάκτησις, -εως, ἡ [v LXX:] indignation: [2Ko.7:11]).
POUZITI: [Lukas 1:5], [2Kor 7:11]
PUVOD: z řeckého ἀγανακτέω
KJV: rozhořčení
SPECIALISTA: Vyraz popisuje morální poboureni nad zlem; v biblickem diskurzu nejde jen o emoci, ale i o eticky postoj vedouci k naprave.

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