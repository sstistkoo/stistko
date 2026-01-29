# 🤖 Doporučená VS Code rozšíření pro AI komunikaci

## Top AI rozšíření pro VS Code

### 1. **GitHub Copilot** ⭐⭐⭐⭐⭐

- **ID:** `GitHub.copilot`
- **Co dělá:** AI asistent pro psaní kódu, autocompletace, chat interface
- **Výhody:**
  - Nejlepší AI code completion
  - Integrovaný chat přímo v editoru
  - Kontextově aware suggestions
  - Podpora pro všechny jazyky
- **Požadavky:** GitHub účet + předplatné (nebo GitHub Pro/Student)

### 2. **Continue - Codestral, Claude, and more** ⭐⭐⭐⭐⭐

- **ID:** `Continue.continue`
- **Co dělá:** Open-source AI code assistant
- **Výhody:**
  - Podpora pro různé AI modely (Claude, GPT-4, Codestral, lokální LLM)
  - Zdarma
  - Customizovatelné
  - Chat interface + inline suggestions
  - Tab autocomplete
  - Možnost použít vlastní API klíče
- **Ideální pro:** Uživatele, kteří chtějí flexibilitu v výběru AI modelu

### 3. **Cline (dříve Claude Dev)** ⭐⭐⭐⭐⭐

- **ID:** `saoudrizwan.claude-dev`
- **Co dělá:** Autonomní AI coding assistant s přístupem k souborovému systému
- **Výhody:**
  - Claude 3.5 Sonnet / Haiku / Opus support
  - Může číst a zapisovat soubory
  - Může spouštět terminal příkazy
  - Autonomous coding - vyřeší složité úkoly samostatně
  - Browser tool - může otevírat a analyzovat webové stránky
  - MCP (Model Context Protocol) support
- **Ideální pro:** Komplexní refaktoringy, velké změny v projektu

### 4. **Codeium** ⭐⭐⭐⭐

- **ID:** `Codeium.codeium`
- **Co dělá:** Zdarma alternativa k GitHub Copilot
- **Výhody:**
  - Zcela zdarma
  - Rychlé AI suggestions
  - Chat interface
  - Podpora 70+ jazyků
  - Nevyžaduje platbu
- **Ideální pro:** Studenty a vývojáře, kteří nechtějí platit

### 5. **Tabnine** ⭐⭐⭐⭐

- **ID:** `TabNine.tabnine-vscode`
- **Co dělá:** AI code completion
- **Výhody:**
  - Lokální AI model (privacy friendly)
  - Nebo cloud modely
  - Team learning
  - GDPR compliant
- **Ideální pro:** Firmy s přísnými bezpečnostními požadavky

### 6. **Cursor Rules for VSCode** ⭐⭐⭐

- **ID:** `YakGPT.cursor-rules-for-vscode`
- **Co dělá:** Přináší Cursor's .cursorrules do VS Code
- **Výhody:**
  - Projekt-specifické AI instrukce
  - Kontextová pravidla pro AI
  - Funguje s jinými AI extensions

### 7. **ChatGPT - Genie AI** ⭐⭐⭐

- **ID:** `genieai.chatgpt-vscode`
- **Co dělá:** ChatGPT integrace do VS Code
- **Výhody:**
  - Přímý přístup k ChatGPT
  - Code generation
  - Refactoring suggestions
  - Documentation generation

---

## 🎯 Doporučení podle use-case

### Pro maximální produktivitu:

1. **GitHub Copilot** nebo **Continue** (pro code completion)
2. **Cline** (pro složité refaktoringy a autonomní coding)

### Pro studenty/hobby projekty:

1. **Codeium** (zdarma, výkonný)
2. **Continue** (flexibilní, můžeš použít vlastní API)

### Pro enterprise/bezpečnost:

1. **Tabnine** (lokální modely)
2. **GitHub Copilot for Business**

### Pro experimentování s různými AI modely:

1. **Continue** (podpora pro Claude, GPT-4, Codestral, Mistral, lokální modely)
2. **Cline** (Claude Sonnet 3.5)

---

## 🚀 Jak nainstalovat

### Metoda 1: Přes VS Code

1. Otevři VS Code
2. Stiskni `Ctrl+Shift+X` (Extensions)
3. Vyhledej název rozšíření
4. Klikni "Install"

### Metoda 2: Přes příkazový řádek

```bash
code --install-extension Continue.continue
code --install-extension saoudrizwan.claude-dev
code --install-extension Codeium.codeium
```

---

## 🔧 Integrace s vaším projektem

### Pro Continue:

1. Po instalaci otevři Continue panel (ikona v levém sidebaru)
2. Vyber AI model (Claude, GPT-4, nebo vlastní)
3. Zadej API klíč
4. Můžeš nastavit vlastní prompt v `.continuerc.json`

### Pro Cline:

1. Otevři Cline z Activity Bar (levý sidebar)
2. Nastav API klíč pro Claude
3. Cline může:
   - Číst a upravovat soubory
   - Spouštět příkazy v terminalu
   - Otevírat webové stránky
   - Používat MCP servery

### Pro Codeium:

1. Po instalaci se přihlas (zdarma účet)
2. Začne automaticky doplňovat kód

---

## 💡 Pro-tipy

### 1. Kombinuj více rozšíření

- **Continue** pro chat a inline suggestions
- **Cline** pro složité autonomní úkoly
- **GitHub Copilot** pro nejlepší autocomplete

### 2. Nastav klávesové zkratky

```json
{
  "key": "ctrl+shift+i",
  "command": "continue.continueGUIView.focus"
}
```

### 3. Používej context příkazy

V **Continue** nebo **Cline**:

- `@file` - přidá soubor do kontextu
- `@folder` - přidá celou složku
- `@code` - přidá vybraný kód
- `@terminal` - přidá terminal output

### 4. Vytvořte `.cursorrules` soubor

```
Tento projekt používá:
- Vanilla JavaScript (ES6+)
- Modulární architekturu
- State management pattern
- Event-driven komunikaci

Vždy:
- Používej české komentáře
- Následuj existující coding style
- Testuj změny před commitem
```

---

## 🔗 Užitečné odkazy

- [Continue Documentation](https://continue.dev/docs)
- [Cline GitHub](https://github.com/saoudrizwan/claude-dev)
- [GitHub Copilot Docs](https://docs.github.com/copilot)
- [Codeium Docs](https://codeium.com/vscode_tutorial)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)

---

## ⚠️ Poznámky k bezpečnosti

- **Nikdy nesdílej API klíče** v projektech
- Používej `.env` soubory (přidej do `.gitignore`)
- Pro firemní projekty konzultuj s IT oddělením
- Některé AI rozšíření odesílají kód na servery (čti Terms of Service)

---

## 🎁 Bonus: MCP (Model Context Protocol)

**Co je MCP?**

- Nový standard od Anthropic
- Umožňuje AI přístup k externím nástrojům a datům
- Podporováno v **Cline** a brzy v dalších rozšířeních

**Užitečné MCP servery:**

- `@modelcontextprotocol/server-filesystem` - přístup k souborům
- `@modelcontextprotocol/server-github` - GitHub integrace
- `@modelcontextprotocol/server-brave-search` - web search

Instalace MCP serveru:

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

Konfigurace v Cline settings.
