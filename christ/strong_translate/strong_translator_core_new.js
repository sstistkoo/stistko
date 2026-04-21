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
  
  // Sestavíme mapu: číslo → správný klíč (pro případ že AI použije špatný prefix)
  const numToKey = {};
  for (const k of keys) {
    const num = k.slice(1); // '123' z 'G123' nebo 'H123'
    numToKey[num] = k;
  }
  
  for (const block of blocks) {
    const km = block.match(/###([GH]\d+)###/);
    if (!km) continue;
    
    const foundKey = km[1];
    const num = foundKey.slice(1);
    
    // Exact match nebo fallback přes číslo (AI použila špatný prefix)
    let targetKey = null;
    if (keys.includes(foundKey)) {
      targetKey = foundKey;
    } else if (numToKey[num]) {
      targetKey = numToKey[num]; // fallback: stejné číslo, správný prefix
    } else {
      continue;
    }
    
    const content = block.slice(km[0].length).trim();
    const fields = {};
    content.split('\n').forEach(line => {
      const ci = line.indexOf(':');
      if (ci > 0) {
        let label = line.slice(0, ci).trim().toUpperCase();
        if (label === 'DEF') label = 'DEFINICE';
        if (label === 'CZ') label = 'VYZNAM';
        fields[label] = line.slice(ci + 1).trim();
      }
    });
    
    translated[targetKey] = {
      vyznam: fields['VYZNAM'] || '',
      definice: fields['DEFINICE'] || '',
      pouziti: fields['POUZITI'] || '',
      puvod: fields['PUVOD'] || ''
    };
  }
  
  return keys.filter(k => !translated[k]?.vyznam);
}

export const SYSTEM_MESSAGE = 'Prekladac Strong slovniku. VYZNAM = cesky ekvivalent. DEFINICE = CESKY PREKLAD CELÉ anglicke definice z DEF: - PRELOZ vse do cestiny! Vsechna anglicka slova preloz do cestiny. NE kopiruj, ale PRELOZ! POUZITI = biblicka posta. PUVOD = etymologie. Format: ###G123### nebo ###H456###\nVYZNAM: [cesky ekvivalent]\nDEFINICE: [prelozena definice v cestine - cely preklad!]\nPOUZITI: [posta]\nPUVOD: [puvod].';

export const DEFAULT_PROMPT = 'Preloz hesla. ULOHY:\n1. VYZNAM = cesky ekvivalent (kratce)\n2. DEFINICE = CESKY PREKLAD VSEHO z DEF: - vsechna anglicka slova PRELOZ, NIC NENECHAVEJ v anglictine!\n3. POUZITI = biblicka posta\n4. PUVOD = etymologie\nDULEZITE: V DEFINICI preloz ABSOLUTNE VSE do cestiny!\nFormat:\n###KLIC###\nVYZNAM: [cesky ekvivalent]\nDEFINICE: [cely cesky preklad - zadna anglicka slova nezustavaj!]\nPOUZITI: [posta]\nPUVOD: [puvod]\n{HESLA}';

export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function validateAPIResponse(d, p) {
  if (!d) throw new Error('Empty');
  if (p === 'groq' && !d.choices?.[0]?.message?.content) throw new Error('Invalid Groq');
  if (p === 'gemini' && !d.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Invalid Gemini');
  if (p === 'openrouter' && !d.choices?.[0]?.message?.content) throw new Error('Invalid OpenRouter');
  return true;
}

export default { parseTXT, parseTranslations, SYSTEM_MESSAGE, DEFAULT_PROMPT, escHtml, validateAPIResponse };