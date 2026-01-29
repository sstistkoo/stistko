# Multi-File Support - Komplexní podpora práce s více soubory

## 📌 Přehled

Aplikace nyní plně podporuje práci s více soubory najednou. AI agenti mohou číst, editovat, vytvářet a přepínat mezi soubory automaticky.

## 🛠️ Dostupné nástroje

### 1. `read_file(fileName)`

Přečte obsah konkrétního souboru.

**Parametry:**

- `fileName` (string) - Název nebo cesta k souboru (např. "styles.css", "app.js")
- `lineStart` (number, optional) - Počáteční řádek (1-indexed)
- `lineEnd` (number, optional) - Koncový řádek (1-indexed)

**Příklad:**

```javascript
read_file({
  fileName: 'styles.css',
});
```

**Návratová hodnota:**

````javascript
{
  success: true,
  fileName: "styles.css",
  content: "/* CSS obsah... */",
  lineCount: 150,
  formattedOutput: "📄 **styles.css** (150 řádků):\n```css\n...\n```"
}
````

---

### 2. `list_files(includeContent)`

Získá seznam všech otevřených souborů s metadaty.

**Parametry:**

- `includeContent` (boolean, default: false) - Zahrnout náhled obsahu

**Příklad:**

```javascript
list_files({
  includeContent: false,
});
```

**Návratová hodnota:**

```javascript
{
  success: true,
  count: 3,
  files: [
    {
      id: 1234567890,
      name: "index.html",
      language: "html",
      lines: 250,
      size: 12500,
      isActive: true,
      preview: null
    },
    // ...další soubory
  ],
  activeFile: { /* aktivní soubor */ }
}
```

---

### 3. `edit_file(fileName, content, switchBack)`

Upraví konkrétní soubor (automaticky přepne, upraví a volitelně se vrátí zpět).

**Parametry:**

- `fileName` (string) - Název souboru k editaci
- `content` (string) - Nový obsah souboru
- `switchBack` (boolean, default: false) - Přepnout zpět na původní soubor

**Příklad:**

```javascript
edit_file({
  fileName: 'styles.css',
  content: 'body { background: #fff; }',
  switchBack: true,
});
```

**Návratová hodnota:**

```javascript
{
  success: true,
  fileName: "styles.css",
  linesChanged: 15,
  switchedBack: true,
  formattedOutput: "✅ Soubor **styles.css** upraven (15 řádků), přepnuto zpět"
}
```

---

### 4. `create_file(fileName, content, language, switchTo)`

Vytvoří nový soubor.

**Parametry:**

- `fileName` (string) - Název nového souboru (např. "app.js", "styles.css")
- `content` (string) - Počáteční obsah souboru
- `language` (string, optional) - Jazyk (html, css, javascript, json)
- `switchTo` (boolean, default: true) - Přepnout na nový soubor

**Příklad:**

```javascript
create_file({
  fileName: 'utils.js',
  content: 'export const add = (a, b) => a + b;',
  language: 'javascript',
  switchTo: false,
});
```

**Návratová hodnota:**

```javascript
{
  success: true,
  fileName: "utils.js",
  fileId: 1234567891,
  lines: 1,
  switchedTo: false,
  formattedOutput: "✅ Vytvořen nový soubor **utils.js** (1 řádek)"
}
```

---

### 5. `switch_file(fileName)`

Přepne na jiný soubor.

**Parametry:**

- `fileName` (string) - Název souboru

**Příklad:**

```javascript
switch_file({
  fileName: 'app.js',
});
```

**Návratová hodnota:**

```javascript
{
  success: true,
  fileName: "app.js",
  lines: 320,
  formattedOutput: "👉 Přepnuto na **app.js** (320 řádků)"
}
```

---

### 6. `read_all_files(maxFilesSize)`

Získá obsah všech otevřených souborů najednou (použít opatrně u velkých projektů).

**Parametry:**

- `maxFilesSize` (number, default: 50000) - Maximální celková velikost v znacích

**Příklad:**

```javascript
read_all_files({
  maxFilesSize: 30000,
});
```

**Návratová hodnota:**

```javascript
{
  success: true,
  fileCount: 3,
  totalSize: 28500,
  files: [
    {
      name: "index.html",
      language: "html",
      lines: 250,
      size: 12500,
      isActive: true,
      content: "<!DOCTYPE html>..."
    },
    // ...další soubory
  ]
}
```

---

## 💡 Jak AI využívá multi-file podporu

### 1. **Automatické rozpoznání kontextu**

Když uživatel říká:

> "Změň barvu tlačítka na modrou"

AI:

1. Podívá se na seznam otevřených souborů
2. Najde `styles.css` (CSS soubor)
3. Použije `read_file("styles.css")` pokud obsah není v kontextu
4. Upraví CSS a aplikuje změnu

### 2. **Multi-file kontext v promptu**

Když je otevřeno více souborů, AI dostává:

````
📁 Otevřené soubory (3):

📄 **index.html** (aktivní) (250 řádků, html):
```html
<!DOCTYPE html>
<html>
...
````

📄 **styles.css** (150 řádků, css):

```css
body {
  margin: 0;
  ...
}
```

📄 **app.js** (320 řádků, javascript):

```javascript
const state = {
  ...
};
```

````

### 3. **Inteligentní výběr souboru**

AI ví, že:
- **Změny vzhledu** → hledá `.css` soubor
- **Nová funkce** → hledá `.js` soubor
- **HTML struktura** → hledá `.html` soubor
- **❌ NIKDY** nepřidává CSS/JS inline pokud existuje samostatný soubor!

### 4. **Automatické vytváření souborů**

Když uživatel říká:
> "Vytvořte kalkulačku"

A projekt má jen `index.html`, AI automaticky:
1. Vytvoří `styles.css` s `create_file()`
2. Vytvoří `app.js` s `create_file()`
3. Upraví `index.html` aby je linkoval

---

## 🔧 Implementační detaily

### Registrace tools

V [src/modules/ai/tools/index.js](../../src/modules/ai/tools/index.js):

```javascript
import { multiFileTools } from './MultiFileTools.js';

export function initializeTools() {
  // ... další tools

  // Multi-File Tools
  for (const [name, tool] of Object.entries(multiFileTools)) {
    toolSystem.registerTool(name, tool.schema, tool.handler);
  }
}
````

### Rozšířený kontext v AIPanel

V [src/modules/ai/AIPanel.js](../../src/modules/ai/AIPanel.js) (řádky ~1257-1299):

```javascript
// Build files context - ENHANCED with content
let filesContext = '';
if (openFiles.length > 0) {
  if (openFiles.length > 1) {
    const MAX_TOTAL_SIZE = 30000;
    let totalSize = 0;
    const filesWithContent = [];

    for (const f of openFiles) {
      const content = f.content || '';
      if (totalSize + content.length < MAX_TOTAL_SIZE) {
        filesWithContent.push({
          name: f.name,
          language: f.language || 'html',
          lines: content.split('\n').length,
          content,
          isActive: f.id === activeFileId,
        });
        totalSize += content.length;
      } else {
        filesWithContent.push({
          name: f.name,
          truncated: true,
          isActive: f.id === activeFileId,
        });
      }
    }

    filesContext = `\n\nOtevřené soubory (${openFiles.length}):\n\n`;
    filesWithContent.forEach(f => {
      if (f.truncated) {
        filesContext += `📄 **${f.name}**${f.isActive ? ' (aktivní)' : ''} - [obsah vynechán kvůli velikosti]\n\n`;
      } else {
        filesContext += `📄 **${f.name}**${f.isActive ? ' (aktivní)' : ''} (${f.lines} řádků, ${f.language}):\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n\n`;
      }
    });
  }
}
```

---

## ⚠️ Bezpečnostní opatření

### 1. **Validace souboru**

Před editací/čtením se kontroluje, zda soubor existuje v `state.get('files.tabs')`.

### 2. **Limit velikosti**

`read_all_files()` má limit 50 000 znaků (default 30 000) aby nepřetížil kontext.

### 3. **Truncation**

Pokud je projekt příliš velký, soubory se zkrátí s oznámením: `[obsah vynechán kvůli velikosti]`.

### 4. **Bezpečné přepínání**

`edit_file()` s `switchBack: true` se automaticky vrátí na původní soubor.

---

## 📊 Limity a doporučení

### Limity

- **Max total size**: 30 000 znaků (všechny soubory dohromady)
- **Max jednotlivý soubor**: Bez omezení, ale doporučeno < 10 000 řádků
- **Počet souborů**: Neomezený, ale více než 10 souborů může zpomalit

### Doporučení

- Pro velké projekty používej `read_file()` místo `read_all_files()`
- Používej `includeContent: false` pokud nepotřebuješ obsah
- Při editaci více souborů používej `switchBack: true` pro lepší UX

---

## 🎯 Příklady použití

### Scénář 1: Uživatel chce změnit barvu pozadí

**Uživatel:** "Změň pozadí na bílé"

**AI:**

1. Vidí v kontextu že je otevřen `styles.css`
2. Najde `body { background: ... }`
3. Vygeneruje nový kód s `background: #fff;`
4. Aplikuje změnu do `styles.css`

---

### Scénář 2: Vytvoření nového projektu

**Uživatel:** "Vytvoř todo list aplikaci"

**AI:**

1. Vytvoří `index.html` s HTML strukturou
2. Použije `create_file("styles.css", "...")`
3. Použije `create_file("app.js", "...")`
4. Upraví `index.html` aby linkoval CSS a JS

---

### Scénář 3: Refactoring napříč soubory

**Uživatel:** "Přesuň funkci `formatDate` do utils.js"

**AI:**

1. Použije `read_file("app.js")` aby našla funkci
2. Použije `create_file("utils.js", "export const formatDate = ...")`
3. Použije `edit_file("app.js", "import { formatDate } from './utils.js';")`

---

## 🚀 Budoucí vylepšení

- [ ] Podpora pro více jazyků (Python, TypeScript, JSON)
- [ ] Automatické diff view pro změny
- [ ] Undo/Redo pro multi-file operace
- [ ] Git integrace (commit změn napříč soubory)
- [ ] Batch edit (upravit více souborů najednou)
- [ ] Search & Replace napříč všemi soubory

---

## 📝 Changelog

### v1.0.0 (2024-01-XX)

- ✅ Implementovány všechny multi-file tools
- ✅ Rozšířen AI kontext o obsah souborů
- ✅ Automatické detekce jazyka při vytváření souborů
- ✅ Bezpečnostní limity pro velikost kontextu
- ✅ Dokumentace a příklady použití

---

## 🔗 Související dokumentace

- [Tool System](./TOOL_SYSTEM.md) - Přehled všech dostupných nástrojů
- [Architecture](../architecture/ARCHITECTURE_ANALYSIS.md) - Architektura aplikace
- [AI Module](../../src/modules/ai/AIModule.js) - AI modul implementace

---

**Autor:** AI Development Team
**Datum:** 2024-01-XX
**Verze:** 1.0.0
