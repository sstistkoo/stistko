# AI Agents System - Dokumentace

## Přehled

AI Agents System je pokročilý systém pro kolaborativní programování s více specializovanými AI agenty. Každý agent má svou expertní oblast a může pracovat samostatně nebo v týmu s ostatními agenty.

## Dostupní Agenti

### 1. 🏗️ Architekt

**Role**: Návrh architektury a struktury aplikace

**Schopnosti**:

- Návrh struktury aplikací a komponent
- Vytváření diagramů a modelů
- Definování API a rozhraní
- Optimalizace výkonu a škálovatelnosti
- Doporučování best practices a design patterns

**Kdy použít**: Při plánování nových projektů, refaktoringu nebo návrhu komplexních systémů

### 2. 🎨 Frontend Developer

**Role**: HTML, CSS, JavaScript a React vývoj

**Schopnosti**:

- HTML5 a sémantické značky
- CSS3, Flexbox, Grid, animace
- JavaScript ES6+, DOM manipulace
- React, Vue, Angular frameworks
- Responsive design a mobile-first
- Accessibility (a11y) a UX best practices

**Kdy použít**: Pro vývoj uživatelského rozhraní, styling, interaktivních komponent

### 3. ⚙️ Backend Developer

**Role**: Server-side logika a databáze

**Schopnosti**:

- Node.js, Express, REST APIs
- Python, Django, Flask
- Databáze: SQL, MongoDB, Redis
- Authentication a authorization
- API design a dokumentace
- Performance optimization a caching

**Kdy použít**: Pro server-side logiku, databázové dotazy, API endpoints

### 4. 🚀 Full-Stack Developer

**Role**: Kompletní end-to-end vývoj

**Schopnosti**:

- Frontend: React, Vue, HTML/CSS
- Backend: Node.js, Python
- Databáze: PostgreSQL, MongoDB
- DevOps: Docker, CI/CD
- Cloud: AWS, Azure, GCP
- Kompletní aplikace od A do Z

**Kdy použít**: Pro celkový vývoj aplikace, propojení frontendu s backendem

### 5. 🐛 Debugger

**Role**: Hledání a oprava chyb

**Schopnosti**:

- Analýza chybových hlášení
- Console.log a debugging tools
- Performance profiling
- Memory leaks detection
- Error handling best practices
- Testing a QA

**Kdy použít**: Při řešení bugů, performance issues, memory leaks

### 6. 👁️ Code Reviewer

**Role**: Review kódu a quality assurance

**Schopnosti**:

- Code review a best practices
- Security vulnerabilities
- Performance issues
- Code smells a refactoring
- Documentation a comments
- Clean code principles

**Kdy použít**: Pro kontrolu kvality kódu před commitem nebo deploym

### 7. 📚 Documentation Writer

**Role**: Tvorba dokumentace

**Schopnosti**:

- API dokumentace
- README a usage guides
- Code comments a JSDoc
- Architecture documentation
- Tutorial a examples
- Wiki a knowledge base

**Kdy použít**: Pro vytvoření dokumentace projektu, API, nebo tutoriálů

### 8. ✅ Test Engineer

**Role**: Tvorba testů a QA

**Schopnosti**:

- Unit tests (Jest, Mocha)
- Integration tests
- E2E tests (Cypress, Playwright)
- Test coverage a quality
- TDD a BDD metodologie
- Performance testing

**Kdy použít**: Pro psaní unit testů, integration testů, nebo E2E testů

## Jak používat

### Aktivace agenta

1. Otevři AI panel (🤖 tlačítko v pravém horním rohu)
2. Přejdi na tab "🤖 Agenti"
3. Klikni na "⚪ Aktivovat" u zvoleného agenta
4. Agent se označí jako "✅ Aktivní"

### Chat s agentem

1. U aktivního agenta klikni na "💬 Chat"
2. Otevře se chatovací rozhraní s historií konverzace
3. Napiš svůj dotaz nebo požadavek
4. Agent odpoví na základě aktuálního kódu v editoru

### Kolaborativní práce (Multi-agent)

1. Aktivuj 2 nebo více agentů
2. Klikni na "🤝 Společný úkol"
3. Zadej úkol pro agenty
4. Agenti projdou třemi fázemi:
   - **Phase 1: Analýza** - každý agent analyzuje úkol ze svého pohledu
   - **Phase 2: Peer Review** - agenti hodnotí práci ostatních
   - **Phase 3: Syntéza** - vytvoření finálního řešení

### Příklady použití

#### Příklad 1: Tvorba Landing Page

```
Aktivní agenti: Architekt, Frontend Developer, Documentation Writer

Úkol: "Vytvoř moderní landing page pro fitness aplikaci"

Architekt: Navrhne strukturu, sekce, komponenty
Frontend Developer: Vytvoří HTML/CSS/JS kód
Documentation Writer: Přidá komentáře a dokumentaci
```

#### Příklad 2: Oprava Bugů

```
Aktivní agenti: Debugger, Code Reviewer

Úkol: "Najdi a oprav chyby v tomto kódu"

Debugger: Analyzuje chyby, navrhne opravy
Code Reviewer: Zkontroluje opravu, doporučí best practices
```

#### Příklad 3: Full-Stack Aplikace

```
Aktivní agenti: Architekt, Frontend, Backend, Test Engineer

Úkol: "Vytvoř TODO aplikaci s autentizací"

Architekt: Navrhne architekturu (API, databázi, komponenty)
Frontend: Vytvoří UI komponenty
Backend: Implementuje API a databázi
Test Engineer: Vytvoří testy pro všechny části
```

## API

### Programatické použití

```javascript
// Získat všechny agenty
const agents = window.AIAgents.getAgents();

// Aktivovat agenta
window.AIAgents.activateAgent('frontend');

// Poslat zprávu agentovi
const response = await window.AIAgents.sendToAgent('frontend', 'Vytvoř navbar', {
  code: currentCode,
});

// Kolaborativní session
const results = await window.AIAgents.collaborativeSession(
  ['architect', 'frontend', 'backend'],
  'Vytvoř blog aplikaci',
  { code: currentCode }
);

// Vymazat historii
window.AIAgents.clearAllHistory();
```

## Best Practices

1. **Vybírej správné agenty**: Použij agenty odpovídající typu úkolu
2. **Poskytni kontext**: Agent má přístup k aktuálnímu kódu v editoru
3. **Kolaborace**: Pro komplexní úkoly použij více agentů najednou
4. **Historie**: Agenti si pamatují předchozí konverzaci pro kontinuitu
5. **Vymazání**: Pravidelně mažte historii pro čerstvý start

## Tipy a Triky

- **Specifické dotazy**: Čím konkrétnější dotaz, tím lepší odpověď
- **Iterativní práce**: Ptej se na follow-up otázky pro zpřesnění
- **Kombinace**: Zkombinuj různé agenty pro nejlepší výsledky
- **Review**: Vždy nechej Code Reviewera zkontrolovat finální kód
- **Dokumentace**: Po dokončení použij Documentation Writera

## Technické detaily

- **Model**: Používá globální AI objekt z ai_module.js
- **Persistence**: Historie konverzace se ukládá pro každého agenta
- **Context**: Agenti mají přístup k aktuálnímu kódu, otevřeným souborům a chybám
- **Asynchronní**: Všechny operace jsou asynchronní (Promise-based)

## Budoucí vylepšení

- [ ] Import/export konfigurací agentů
- [ ] Vlastní agenti s uživatelskými prompty
- [ ] Integrace s GitHub pro code review
- [ ] Vizualizace kolaborativního procesu
- [ ] Automatické návrhy agentů podle typu úkolu
- [ ] Persist historie mezi sessions (localStorage)
- [ ] Voice input/output pro agenty
- [ ] Multi-language support

## Podpora

Pro více informací nebo hlášení problémů kontaktujte vývojový tým.
