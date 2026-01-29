# 🛠️ VS Code Tool System - Dokumentace

## 📋 Přehled

Tool System umožňuje AI asistentovi používat nástroje podobně jako VS Code Copilot:

- Čtení souborů
- Vyhledávání v kódu
- Analýza chyb
- Získávání struktury projektu

## 🔧 Aktivace

1. Otevři AI asistenta (Ctrl+Shift+A)
2. Rozbal "Nastavení AI"
3. Zaškrtni **🛠️ VS Code Mode (Tool System)**

## 📚 Dostupné nástroje

### File Operations

#### `read_file`

Přečte obsah souboru

**Parametry:**

- `filePath` (string, required) - Cesta k souboru
- `startLine` (number, optional) - Od které řádky (1-based)
- `endLine` (number, optional) - Do které řádky

**Příklad:**

```json
{
  "tool": "read_file",
  "parameters": {
    "filePath": "src/app.js",
    "startLine": 1,
    "endLine": 50
  }
}
```

#### `list_open_files`

Zobrazí všechny otevřené soubory

**Parametry:** Žádné

#### `get_active_file`

Informace o aktuálně aktivním souboru

**Parametry:** Žádné

#### `write_to_editor`

Zapíše obsah do editoru

**Parametry:**

- `content` (string, required) - Obsah k zapsání
- `append` (boolean, optional) - Přidat na konec místo přepsání

### Search Operations

#### `grep_search`

Vyhledá text v otevřených souborech

**Parametry:**

- `query` (string, required) - Co hledat
- `filePath` (string, optional) - Omezit na konkrétní soubor
- `caseSensitive` (boolean, optional) - Case-sensitive
- `maxResults` (number, optional) - Max počet výsledků (default: 20)

**Příklad:**

```json
{
  "tool": "grep_search",
  "parameters": {
    "query": "function handleClick",
    "caseSensitive": false
  }
}
```

#### `find_definitions`

Najde definice funkcí, tříd, proměnných

**Parametry:**

- `name` (string, required) - Název funkce/třídy/proměnné
- `type` (enum, optional) - 'function' | 'class' | 'variable' | 'any'

#### `get_file_structure`

Získá strukturu souboru (imports, functions, classes)

**Parametry:**

- `filePath` (string, required) - Cesta k souboru

### Code Analysis

#### `get_console_errors`

Získá JavaScript console errors

**Parametry:**

- `limit` (number, optional) - Max počet chyb (default: 10)

#### `count_tokens`

Spočítá tokeny/znaky v textu

**Parametry:**

- `text` (string, required) - Text k analýze

#### `validate_syntax`

Validuje JavaScript/HTML/CSS syntax

**Parametry:**

- `code` (string, required) - Kód k validaci
- `language` (enum, required) - 'javascript' | 'html' | 'css'

#### `analyze_complexity`

Analyzuje komplexitu kódu

**Parametry:**

- `filePath` (string, required) - Cesta k souboru

## 💬 Jak AI používá tools

AI může volat tools pomocí speciálního bloku v odpovědi:

\`\`\`tool-call
{
"tool": "read_file",
"parameters": {
"filePath": "src/app.js"
}
}
\`\`\`

Po vykonání toolu dostane AI výsledek a pokračuje v odpovědi.

## 🔄 Workflow příklad

**Uživatel:** "Najdi funkci handleClick a ukaž mi ji"

**AI interně:**

1. Zavolá `grep_search` s query "handleClick"
2. Dostane výsledek: nalezeno v src/components/Button.js:45
3. Zavolá `read_file` pro src/components/Button.js, řádky 40-60
4. Odpoví uživateli s kódem

**Uživatel vidí:**

```
🔧 Tool System:
🔧 **grep_search**: ✅ Úspěch
🔧 **read_file**: ✅ Úspěch

Našel jsem funkci handleClick v souboru Button.js:
[zobrazí kód]
```

## ⚙️ Konfigurace

Tool System lze zapnout/vypnout checkbox v AI nastavení.

Stav se ukládá do `state.ai.vsCodeMode` a přetrvává mezi relacemi.

## 🚀 Rozšíření

Nové tools můžeš přidat do:

- `src/modules/ai/tools/FileTools.js`
- `src/modules/ai/tools/SearchTools.js`
- `src/modules/ai/tools/CodeTools.js`

Struktura toolu:

```javascript
export const myTools = {
  my_tool_name: {
    schema: {
      description: 'Co tento tool dělá',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Popis parametru',
          },
        },
        required: ['param1'],
      },
    },
    handler: async ({ param1 }) => {
      // Implementace
      return {
        success: true,
        result: 'něco',
      };
    },
  },
};
```

## 📊 Statistiky

Otevři console a zapiš:

```javascript
window.aiPanel.toolSystem.getStats();
```

Zobrazí:

- Celkový počet tool calls
- Jaké tools byly použity
- Stav zapnuto/vypnuto

## 🐛 Debugging

```javascript
// Zobrazit historii tool calls
window.aiPanel.toolSystem.getHistory();

// Reset historie
window.aiPanel.toolSystem.resetHistory();

// Vypnout tool system
window.aiPanel.toolSystem.setEnabled(false);
```
