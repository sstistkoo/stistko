# 🔄 Jak vyčistit cache na mobilním prohlížeči

## Problém
Mobilní prohlížeč může cachovat (ukládat) starou verzi stránky. To znamená, že i když upravíte kód na serveru, mobil stále zobrazuje starou verzi.

## Řešení

### Automatické vyčištění (doporučeno)
Aplikace nyní **automaticky detekuje změnu verze** a vymaže cache. Stačí:
1. Obnovit stránku (pull down to refresh nebo F5)
2. V konzoli byste měli vidět: "🔄 Detekována nová verze, mazání cache..."

### Manuální vyčištění

#### Chrome/Edge na Android:
1. Otevřete Chrome
2. Klikněte na tři tečky (⋮) vpravo nahoře
3. **Nastavení** → **Soukromí a zabezpečení** → **Vymazat data prohlížeče**
4. Vyberte časový rozsah (doporučeno "Veškerý čas")
5. Zaškrtněte **"Obrázky a soubory v mezipaměti"**
6. Klikněte na **"Vymazat data"**

#### Safari na iOS:
1. Otevřete **Nastavení** → **Safari**
2. Posuňte dolů a klikněte na **"Vymazat historii a data webů"**
3. Potvrďte

#### Firefox na Android:
1. Otevřete Firefox
2. Klikněte na tři tečky (⋮)
3. **Nastavení** → **Odstranit soukromá data**
4. Zaškrtněte **"Mezipaměť"**
5. Klikněte na **"Odstranit soukromá data"**

### Hard Refresh (rychlé řešení)
1. **Android Chrome**: Dlouze podržte tlačítko obnovit (⟳) a vyberte "Hard Refresh"
2. **iOS Safari**: Zavřete Safari úplně (smáčkněte z dolního okraje nahoru a přejeďte Safari nahoru), pak otevřete znovu

### Developer Tools (pro testování)
1. V Chrome na Androidu: Menu → **Další nástroje** → **Vývojářské nástroje**
2. Otevřete **Network** tab
3. Zaškrtněte **"Disable cache"**
4. Nechte DevTools otevřené při testování

## Kontrola verze
Po obnovení stránky otevřete konzoli (F12 nebo DevTools) a zkontrolujte:
- Měli byste vidět: `📱 Device info:` s aktuální verzí aplikace
- Aktuální verze: **2.0.0-mobile-fix**

## Časté problémy

### Stále vidím starou verzi
1. Zkontrolujte, že používáte správnou URL (ne cached kopii)
2. Zkuste použít **incognito/privátní režim**
3. Restartujte celý prohlížeč (zavřete a otevřete znovu)

### Aplikace se nechová správně
1. Otevřete konzoli (DevTools)
2. Hledejte červené chybové hlášky
3. Pošlete screenshot vývojáři

## Poznámky pro vývojáře
- Aplikace používá meta tagy pro zakázání cache
- Při každé změně verze se automaticky maže cache
- CSS soubory mají version query string (?v=YYYYMMDD)
- Manifest také má version parameter

## Verze změny
- **2.0.0-mobile-fix** (2.1.2026): Opravy mobilního zobrazení, AI agenti layout, search panel
