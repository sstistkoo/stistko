const fs = require('fs');

const filePath = 'c:\\Users\\stistko\\CascadeProjects\\test_base\\programovani\\src\\modules\\menu\\services\\MenuModals.js';
let content = fs.readFileSync(filePath, 'utf8');

const fixes = [
  ['â³ NaÄÃ­tÃ¡m...', '⏳ Načítám...'],
  ['â³ Stahuji obsah...', '⏳ Stahuji obsah...'],
  ['PrÃ¡zdnÃ½ obsah', 'Prázdný obsah'],
  ['âœ… NaÄteno', '✅ Načteno'],
  ['znaků¯', 'znaků'],
  ['âœ… Obsah ÃºspÄ›Å¡nÄ› naÄten', '✅ Obsah úspěšně načten'],
  ['âŒ Chyba:', '❌ Chyba:'],
  ['ðŸ"¥ NaÄÃ­st', '📥 Načíst'],
  ['âœ… Loaded via proxy:', '✅ Loaded via proxy:'],
  ['NepodaÅ™ilo se naÄÃ­st obsah (CORS problÃ©m).', 'Nepodařilo se načíst obsah (CORS problém).'],
  ['âœ… Å½Ã¡dnÃ© chyby nezaznamenÃ¡ny!', '✅ Žádné chyby nezaznamenány!'],
  ['âš ï¸ Promise', '⚠️ Promise'],
  ['âŒ Error', '❌ Error'],
  ['ðŸ"„', '📄'],
  ['ðŸ" Stack trace', '🔍 Stack trace'],
  ['ðŸ› Error Log', '🐛 Error Log'],
  ['â„¹ï¸ O Error Logu:', 'ℹ️ O Error Logu:'],
  ['Zobrazuje poslednÃ­ch 50 chyb', 'Zobrazuje posledních 50 chyb'],
  ['DuplicitnÃ­ chyby jsou potlaÄeny (max 1Ã— za 5s)', 'Duplicitní chyby jsou potlačeny (max 1× za 5s)'],
  ['Pro detailnÃ­ debugging pouÅ¾ijte', 'Pro detailní debugging použijte'],
  ['ðŸ"‹ KopÃ­rovat log', '📋 Kopírovat log'],
  ['ðŸ—'ï¸ Vymazat log', '🗑️ Vymazat log'],
  ['âœ" ZkopÃ­rovÃ¡no!', '✔ Zkopírováno!'],
  ['ðŸ—'ï¸ Error log vymazÃ¡n', '🗑️ Error log vymazán']
];

fixes.forEach(([from, to]) => {
  content = content.split(from).join(to);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed MenuModals.js!');

// Also fix MenuActions.js
const actionsPath = 'c:\\Users\\stistko\\CascadeProjects\\test_base\\programovani\\src\\modules\\menu\\services\\MenuActions.js';
let actionsContent = fs.readFileSync(actionsPath, 'utf8');

const actionFixes = [
  ['â˜€ï¸', '☀️'],
  ['ðŸŒ™', '🌙'],
  ['TÃ©ma zmÄ›nÄ›no', 'Téma změněno']
];

actionFixes.forEach(([from, to]) => {
  actionsContent = actionsContent.split(from).join(to);
});

fs.writeFileSync(actionsPath, actionsContent, 'utf8');
console.log('Fixed MenuActions.js!');
