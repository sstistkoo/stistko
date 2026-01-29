# 🎯 Orchestrator Agent - Průvodce

## Co je Orchestrator?

**Orchestrator** je hlavní koordinační agent, který automaticky **analyzuje úkol a rozděluje ho** mezi ostatní specializované agenty. Je to jako project manager, který ví, koho na co nasadit.

## 🚀 Jak to funguje?

### Klasický režim (bez Orchestrátora)

```
Ty → Manuálně aktivuješ agenty → Zadáš úkol → Všichni pracují paralelně
```

### Orchestrovaný režim (s Orchestrátorem)

```
Ty → Aktivuješ Orchestrátora + další agenty → Zadáš jeden úkol →
     Orchestrator analyzuje úkol →
     Orchestrator rozdělí úkol mezi agenty →
     Každý agent pracuje na své části →
     Orchestrator spojí výsledky
```

## 📋 Jak použít

### 1. JavaScript Agenti (Online)

#### Krok 1: Aktivuj agenty

```
🤖 AI Panel → Tab "Agenti" → ⚡ JavaScript
```

Aktivuj:

- ✅ **🎯 Orchestrator** (povinný)
- ✅ 🏗️ Architekt
- ✅ 🎨 Frontend Developer
- ✅ ⚙️ Backend Developer
- ✅ (další podle potřeby)

#### Krok 2: Spusť orchestrovaný úkol

Klikni na tlačítko **"🎯 Orchestrovaný úkol"**

#### Krok 3: Zadej úkol

Napiš jednoduše celý úkol:

```
"Vytvoř kompletní landing page pro fitness aplikaci s přihlášením"
```

#### Co se stane:

1. **Orchestrator analyzuje** úkol a vytvoří plán
2. **Rozdělí práci**:
   - Architekt: Navrhni strukturu a design
   - Frontend: Vytvoř HTML/CSS komponenty
   - Backend: Implementuj API pro přihlášení
   - atd.
3. **Agenti pracují** na svých částech
4. **Orchestrator spojí** všechny výsledky do finálního řešení

### 2. CrewAI (Python + Ollama)

CrewAI má Orchestrátora vestavěného (`allow_delegation=True`), takže automaticky koordinuje.

Stačí:

```bash
python python/crewai_api.py
```

A v UI:

```
🐍 CrewAI → 🤝 Společný úkol
```

## 💡 Příklady použití

### Příklad 1: E-shop od A do Z

```
Úkol: "Vytvoř základní e-shop s košíkem a platbou"

Orchestrator rozdělí:
├─ Architekt: Databázový model (produkty, košík, objednávky)
├─ Frontend: UI pro seznam produktů a košík
├─ Backend: API pro CRUD operace a platbu
├─ Tester: Testy pro celý flow
└─ Documentation: Dokumentace API
```

### Příklad 2: Dashboard s grafy

```
Úkol: "Admin dashboard s grafy návštěvnosti"

Orchestrator rozdělí:
├─ Architekt: Struktura dashboardu a komponenty
├─ Frontend: Grafy (Chart.js), tabulky, filtry
├─ Backend: API pro získání statistik
└─ Full-Stack: Propojení frontendu s API
```

### Příklad 3: Oprava chyb

```
Úkol: "Oprav všechny chyby v mém kódu"

Orchestrator rozdělí:
├─ Debugger: Najdi všechny chyby
├─ Code Reviewer: Zkontroluj kvalitu a security
└─ Tester: Vytvoř testy aby se to neopakovalo
```

## 🎯 Kdy použít Orchestrátora?

### ✅ Ideální pro:

- **Komplexní projekty** (více součástí)
- **Nejasné zadání** (Orchestrator ho rozloží)
- **Chceš automatizaci** rozdělení práce
- **Více specializací** potřeba (frontend + backend + testy)

### ⚠️ Ne ideální pro:

- **Jednoduché úkoly** (stačí 1 agent)
- **Jasně definované** (víš přesně co chceš)
- **Rychlé dotazy** (orchestrace trvá déle)

## 🆚 Orchestrovaný vs Kolaborativní

| Feature        | 🎯 Orchestrovaný   | 🤝 Kolaborativní    |
| -------------- | ------------------ | ------------------- |
| **Koordinace** | Orchestrator řídí  | Agenti si rovni     |
| **Rozdělení**  | Automatické        | Všichni stejný úkol |
| **Rychlost**   | Sekvenční          | Paralelní           |
| **Složitost**  | Pro velké projekty | Pro peer review     |
| **Výstup**     | Strukturovaný      | Konsenzus           |

## 🔧 Tipy & Triky

### Tip 1: Specifické instrukce

Místo:

```
"Udělej web"
```

Lépe:

```
"Vytvoř responzivní web s Hero sekcí, 3 features kartami a kontakt formulářem.
Použij moderní CSS Grid a animace."
```

### Tip 2: Kombinuj agenty chytře

Pro web projekt:

```
✅ Orchestrator + Architekt + Frontend + Code Reviewer + Tester
```

Pro opravu bugů:

```
✅ Orchestrator + Debugger + Code Reviewer
```

### Tip 3: Context je důležitý

Orchestrator má přístup k aktuálnímu kódu v editoru, takže může říct:

```
"Rozšiř tento navbar o hamburger menu"
```

### Tip 4: Iteruj

Po první orchestrované session můžeš:

```
"Teď přidej dark mode do všech komponent"
```

Orchestrator použije předchozí výsledky!

## 🐛 Troubleshooting

### Orchestrator není aktivní

```
Řešení: Aktivuj 🎯 Orchestrator agenta před spuštěním
```

### Orchestrator vrací divné výsledky

```
Možné příčiny:
- Úkol je moc vágní (buď specifičtější)
- Málo aktivních agentů (aktivuj víc)
- AI model není dobrý (zkus jiný provider)
```

### Trvá to dlouho

```
Orchestrovaný režim je sekvenční:
1. Orchestrator plánuje (5-10s)
2. Agenti pracují jeden po druhém (10-20s každý)
3. Orchestrator spojuje (5-10s)

Celkem: 1-3 minuty pro komplexní úkol
```

### Chci rychlejší výsledky

```
Použij místo toho:
- 🤝 Kolaborativní (paralelní)
- Nebo jen jeden agent přímo
```

## 🎓 Pokročilé

### Custom Orchestrator prompt

Můžeš upravit system prompt v `ai_agents.js`:

```javascript
this.registerAgent('orchestrator', {
  systemPrompt: `Tvůj vlastní prompt...`,
});
```

### Prioritizace agentů

Orchestrator přiřadí priority (1, 2, 3...) podle důležitosti.

### Monitoring

V konzoli vidíš:

```
🎯 Phase 1: Task Distribution by Orchestrator
  → Architekt: Navrhni strukturu...
  → Frontend: Vytvoř komponenty...
🔨 Phase 2: Executing Distributed Tasks
  → architect: [odpověď]
  → frontend: [odpověď]
✨ Phase 3: Synthesis by Orchestrator
```

## 📚 Další čtení

- [AI_AGENTS_DOCS.md](AI_AGENTS_DOCS.md) - Kompletní dokumentace
- [CREWAI_INTEGRATION.md](CREWAI_INTEGRATION.md) - Python CrewAI

---

**Užij si Orchestrátora! 🎯🚀**
