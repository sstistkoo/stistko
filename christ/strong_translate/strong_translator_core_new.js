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
    else if (fieldName === 'Cz') current.cz = fieldValue;
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
    return { ...base, orig: tvaroslovi, en: e.en || '', enDef: e.enDef || '', kjv: e.cz || e.kjv || '', beta: e.beta || '', prepis: e.prepis || '', tvaroslovi: tvaroslovi, vyskyt: vyskyt };
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
  
  for (const block of blocks) {
    const km = block.match(/###([GH]\d+)###/);
    if (!km || !keys.includes(km[1])) continue;
    
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
    
    const key = km[1];
    translated[key] = {
      vyznam: fields['VYZNAM'] || '',
      definice: fields['DEFINICE'] || '',
      pouziti: fields['POUZITI'] || '',  // Czech biblical references
      puvod: fields['PUVOD'] || ''
    };
  }
  
  return keys.filter(k => !translated[k]?.vyznam);
}

export const SYSTEM_MESSAGE = 'Prekladac Strong slovniku. EN = originalni anglicka definice. Preloz ji do cestiny. VYZNAM = cesky ekvivalent. DEFINICE = CESKY PREKLAD EN definice. POUZITI = biblicka posta. PUVOD = etymologie. Format: ###G123###\nVYZNAM: [cesky ekvivalent]\nDEFINICE: [cesky preklad EN definice]\nPOUZITI: [posta]\nPUVOD: [puvod]. Pouzij presne tyto nazvy poli.';

export const DEFAULT_PROMPT = 'Preloz hesla. Ulohy:\n1. VYZNAM = cesky ekvivalent\n2. DEFINICE = PRELOZ anglickou definici (EN) do cestiny\n3. POUZITI = biblicka posta\n4. PUVOD = etymologie\nFormat:\n###G123###\nVYZNAM: [preklad]\nDEFINICE: [cesky preklad en definice]\nPOUZITI: [posta]\nPUVOD: [puvod]\n{HESLA}';

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