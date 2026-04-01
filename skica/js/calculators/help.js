import { makeOverlay } from '../dialogFactory.js';

// ── Sekce nápovědy ─────────────────────────────────────────────
const sections = [
  {
    title: '✏️ Editor',
    items: [
      {
        name: 'Zvýrazňování syntaxe',
        desc: `Editor automaticky barevně zvýrazňuje CNC kód v reálném čase:
• <b class="hl-g">G kódy</b> (G0, G1, G2, G3…) — modře, tučně
• <b class="hl-m">M kódy</b> (M3, M4, M30…) — růžově, tučně
• <b class="hl-coord">Souřadnice</b> (X, Z, I, K, C, R) — zeleně
• <b class="hl-val">Hodnoty</b> (F, S, T, D + číslo) — žlutě
• <b class="hl-feed">Posuvy</b> — tyrkysově, tučně
• <b class="hl-param">R-parametry</b> (R0, R1…) — fialově
• <b class="hl-comment">Komentáře</b> (za středníkem ;) — šedě, kurzívou
• <b class="hl-msg">MSG("…")</b> — oranžově
• <b class="hl-logic">Logika</b> (GOTOF, GOTOB, IF, ELSE, ENDIF, STOPRE) — červeně
• <b class="hl-sub">Podprogramy</b> (L1, L2…) — levandulově
• <b class="hl-block">N-bloky</b> (N10, N20…) — šedě, menší písmo
• <span style="text-decoration:underline wavy var(--ctp-red)">Chyby</span> — červené vlnkové podtržení`
      },
      {
        name: 'Správa souborů',
        desc: `<b>☰ Postranní panel</b> — otevře/zavře seznam souborů a R-parametrů.
• <b>＋ Nový program</b> — vytvoří nový soubor PROG_x.MPF s výchozí šablonou (G54, G90, G95, G97, STOPRE, M30).
• <b>Přejmenování</b> — klikněte na název souboru v toolbaru. Pokud nezadáte příponu, automaticky se doplní .MPF nebo .SPF.
• <b>Smazání</b> — ikona ✕ u souboru v postranním panelu (potvrzení před smazáním).
• Soubory se automaticky ukládají do prohlížeče (localStorage) každé 2 sekundy po úpravě.`
      },
      {
        name: 'Import a export balíčku',
        desc: `<b>📂 Import</b> — načte textový soubor s jedním nebo více programy. Rozpoznává formát s oddělovači (===) a hlavičkami HLAVNÍ PROGRAM / PODPROGRAM.
<b>📦 Export</b> — exportuje všechny otevřené soubory do jednoho .txt balíčku s oddělovači.
<b>⬇ Stáhnout</b> — stáhne aktuální soubor jednotlivě pod jeho názvem.`
      },
      {
        name: 'Kopírování do schránky',
        desc: `<b>📋 Kopírovat</b> (toolbar i quickbar) — zkopíruje celý obsah aktuálního editoru do schránky. Na mobilu dostupné přes menu ⋮ nebo tlačítko 📋 na spodní klávesnici.`
      },
      {
        name: 'Přečíslování N-bloků',
        desc: `<b>🔢 Přečíslovat</b> — otevře dialog s nastavením:
• <b>Start</b> — počáteční číslo bloku (výchozí 10)
• <b>Krok</b> — přírůstek mezi bloky (výchozí 10)
Výsledek: N10, N20, N30… Prázdné řádky a komentáře se přeskakují.
Řádky bez N-bloku dostanou nový, existující bloky se přečíslují.
<b>↩ Vrátit přečíslování</b> — okamžitý návrat k původnímu kódu (jedno undo).`
      },
      {
        name: 'Tlačítko N+ (quickbar)',
        desc: `Přidá číslo bloku na začátek aktuálního řádku (kde je kurzor).
Automaticky najde nejvyšší existující N-číslo v programu a přidá krok (dle nastavení v přečíslování).
Příklad: pokud program obsahuje N10, N20, N30 a krok je 10, vloží N40.
Pokud řádek už N-blok má, nic se nestane.`
      },
      {
        name: 'Převod G90 ↔ G91',
        desc: `<b>ABS</b> — převede celý program na absolutní souřadnice (G90). Všechny přírůstkové hodnoty X, Z se přepočítají na absolutní.
<b>INC</b> — převede na přírůstkové souřadnice (G91). První pohyb zůstane absolutní (referenční bod), další se přepočtou na přírůstky.
Oba převody podporují R-parametry (R0=…) — hodnoty se expandují při výpočtu.
Opětovné kliknutí na aktivní tlačítko vrátí původní kód.`
      },
      {
        name: 'Generátor hlavičky programu',
        desc: `<b>📝 Generovat hlavičku</b> — otevře dialog s nastavením hlavičky:
• <b>Převod (M4x)</b> — číslo převodu vřetena (M41–M45)
• <b>Odjezd do výměny (M80)</b> — M-kód pro pozici výměny
• <b>Nástroj (T/D)</b> — číslo nástroje a korekce
• <b>Souřadný systém</b> — G54, G55, G56, G57, G505, G53
• <b>Posuv</b> — G95 (mm/ot) nebo G94 (mm/min)
• <b>Vřeteno</b> — G97/G96, otáčky S, směr M3/M4, LIMS
Každou položku lze zapnout/vypnout zaškrtávacím polem.
Nastavení se ukládá do prohlížeče. Vloží se na začátek programu (za MSG, pokud existuje).`
      },
      {
        name: 'Validace programu',
        desc: `<b>● Status indikátor</b> (zelené ✓ / červené číslo) — průběžná kontrola v reálném čase (800ms po úpravě).
Kliknutím otevřete detail — seznam všech nalezených problémů s číslem řádku. Kliknutím na řádek v seznamu skočíte na dané místo v kódu.
<b>Kontrolovaná pravidla:</b>
• Chybějící G90/G91 před prvním pohybem
• Chybějící G94/G95 před pracovním posuvem
• G96 bez LIMS/G50 (nebezpečné otáčky)
• Chybějící G96/G97 před M3/M4
• Pracovní posuv bez aktivního vřetene při G95
• Neexistující cíle skoků (GOTOF/GOTOB)
• Nenalezené podprogramy (L1, CALL…)
• Program nekončí M30/M17`
      },
      {
        name: 'Nastavení validace',
        desc: `<b>⚙ Nastavení</b> — zapíná/vypíná jednotlivá pravidla validace:
• Pohyb (G0–G3), Souřadnice (G90/G91), Posuv (G94/G95)
• Otáčky (G96/G97), Vřeteno při G95, Konec programu
• Podprogramy, Parametry (R), Syntaxe
Nastavení se ukládá do prohlížeče.`
      },
      {
        name: 'R-Parametry',
        desc: `Postranní panel zobrazuje všechny R-parametry nalezené v kódu (R0, R1…) s jejich hodnotami a zdrojovým řádkem.
Parser vyhodnocuje i složené výrazy: <code>R1=R0+5</code>, <code>R2=R1*2</code> — výsledky se počítají kaskádově.`
      },
      {
        name: 'Rychlá klávesnice (quickbar)',
        desc: `Čtyři řady CNC tlačítek na spodku obrazovky:
<b>Řada 1:</b> G, M, X, Z, ␣ (mezera), ⌫ (smazat znak)
<b>Řada 2:</b> F, S, T, D, R, 123 (numpad)
<b>Řada 3:</b> ; = G0 G1 M30 M17
<b>Řada 4:</b> ↵ (nový řádek), LIMS, STOP(RE), 📋 (kopie), N+ (blok), ⌨ (klávesnice)

Tlačítka G, M, X, Z, F, S, T, D, R a LIMS otevřou numpad s nápovědou — zobrazí se seznam souvisejících kódů (např. G0=Rychloposuv, M30=Konec programu).
Tlačítko 123 otevře numpad pro zadání libovolného čísla.`
      },
      {
        name: 'Klávesnice na mobilu',
        desc: `Na mobilním zařízení se systémová klávesnice <b>nezobrazí automaticky</b> při klepnutí do editoru — CNC kód se zadává přes quickbar tlačítka.
Pokud potřebujete plnou klávesnici, stiskněte tlačítko <b>⌨</b> v pravém dolním rohu quickbaru.`
      },
      {
        name: 'Menu na mobilu (⋮)',
        desc: `Na mobilních zařízeních jsou tlačítka toolbaru skryta. Všechny funkce jsou dostupné přes tlačítko <b>⋮</b> (tři tečky) v pravém horním rohu, které otevře menu s plnými popisy akcí.
Menu se zavře kliknutím na „Zavřít" nebo klepnutím mimo okno.`
      }
    ]
  }
];

// ── HTML generátor ─────────────────────────────────────────────
function buildHelpHTML() {
  return sections.map(sec => `
    <div class="sn-help-section">
      <div class="sn-help-sec-title">${sec.title}</div>
      ${sec.items.map((it, i) => `
        <details class="sn-help-details">
          <summary class="sn-help-summary">${it.name}</summary>
          <div class="sn-help-body">${it.desc}</div>
        </details>
      `).join('')}
    </div>
  `).join('');
}

// ── Hlavní export ──────────────────────────────────────────────
export function openHelp() {
  const bodyHTML = `
    <div class="sn-help-wrap">
      <div class="sn-help-intro">Rozklikněte položku pro zobrazení detailního popisu funkce.</div>
      ${buildHelpHTML()}
    </div>
  `;
  makeOverlay('sn-help', '❓ Nápověda – Sinumerik 840D', bodyHTML, 'sn-help-window');
}
