/**
 * BUILD.JS - Build script pro produkční nasazení
 * Spuštění: node scripts/build.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

// Barvy pro konzoli
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Jednoduchá minifikace JS (odstraní komentáře a prázdné řádky)
 */
function minifyJS(code) {
  return code
    // Odstraň multi-line komentáře (ale zachovej JSDoc pro export)
    .replace(/\/\*(?!\*\s*@)[\s\S]*?\*\//g, '')
    // Odstraň single-line komentáře
    .replace(/\/\/(?!.*['"`]).*$/gm, '')
    // Odstraň prázdné řádky
    .replace(/^\s*[\r\n]/gm, '')
    // Odstraň trailing whitespace
    .replace(/[ \t]+$/gm, '')
    // Více prázdných řádků → jeden
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Jednoduchá minifikace CSS
 */
function minifyCSS(code) {
  return code
    // Odstraň komentáře
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Odstraň prázdné řádky
    .replace(/^\s*[\r\n]/gm, '')
    // Komprimuj whitespace
    .replace(/\s+/g, ' ')
    // Odstraň mezery kolem speciálních znaků
    .replace(/\s*([{};:,>+~])\s*/g, '$1')
    // Odstraň trailing semicolon před }
    .replace(/;}/g, '}');
}

/**
 * Zkopíruje adresář rekurzivně
 */
function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Hlavní build funkce
 */
async function build() {
  log('blue', '\n🔨 Spouštím build...\n');

  // 1. Vytvoř dist složku
  if (!existsSync(DIST)) {
    mkdirSync(DIST, { recursive: true });
  }
  mkdirSync(join(DIST, 'src'), { recursive: true });
  mkdirSync(join(DIST, 'src', 'ai'), { recursive: true });
  mkdirSync(join(DIST, 'lib'), { recursive: true });
  mkdirSync(join(DIST, 'AI_modul'), { recursive: true });

  // 2. Kopíruj a minifikuj HTML
  log('yellow', '📄 Kopíruji HTML...');
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  writeFileSync(join(DIST, 'index.html'), html);

  // 3. Minifikuj CSS
  log('yellow', '🎨 Minifikuji CSS...');
  const css = readFileSync(join(ROOT, 'styles.css'), 'utf8');
  const minCss = minifyCSS(css);
  writeFileSync(join(DIST, 'styles.css'), minCss);
  log('green', `   styles.css: ${css.length} → ${minCss.length} bytes (${Math.round((1 - minCss.length/css.length) * 100)}% úspora)`);

  // 4. Minifikuj JS soubory
  log('yellow', '📦 Minifikuji JavaScript...');

  const jsFiles = [
    'src/globals.js',
    'src/keyboard.js',
    'src/utils.js',
    'src/drawing.js',
    'src/canvas.js',
    'src/ui.js',
    'src/polar-line.js',
    'src/controller.js',
    'src/error-handler.js',
    'src/ai/ai-config.js',
    'src/ai/ai-utils.js',
    'src/ai/ai-ui.js',
    'src/ai/ai-providers.js',
    'src/ai/ai-core.js',
    'src/ai/ai-test-suite.js',
    'src/ai/index.js',
    'lib/init.js'
  ];

  let totalOriginal = 0;
  let totalMinified = 0;

  for (const file of jsFiles) {
    try {
      const content = readFileSync(join(ROOT, file), 'utf8');
      const minified = minifyJS(content);
      writeFileSync(join(DIST, file), minified);
      totalOriginal += content.length;
      totalMinified += minified.length;
      log('green', `   ${file}: ${content.length} → ${minified.length} bytes`);
    } catch (e) {
      log('red', `   ❌ ${file}: ${e.message}`);
    }
  }

  // 5. Kopíruj AI_modul
  log('yellow', '📁 Kopíruji AI_modul...');
  try {
    copyFileSync(
      join(ROOT, 'AI_modul', 'ai_module.js'),
      join(DIST, 'AI_modul', 'ai_module.js')
    );
  } catch (e) {
    log('red', `   ❌ AI_modul: ${e.message}`);
  }

  // 6. Souhrn
  log('blue', '\n📊 SOUHRN BUILD:');
  log('green', `   Celkem JS: ${totalOriginal} → ${totalMinified} bytes`);
  log('green', `   Úspora: ${Math.round((1 - totalMinified/totalOriginal) * 100)}%`);
  log('green', `   Výstup: ${DIST}\n`);

  log('green', '✅ Build dokončen!\n');
}

// Spusť build
build().catch(err => {
  log('red', `❌ Build selhal: ${err.message}`);
  process.exit(1);
});
