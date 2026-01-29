# 🚀 Automatické spouštění CrewAI serveru

## Co bylo implementováno

CrewAI server se nyní **automaticky spustí** když uživatel chce použít CrewAI agenty.

### ✨ Nové funkce:

1. **Automatická detekce** - Když server není dostupný, systém to detekuje
2. **Auto-start mechanismus** - Pokusí se server spustit automaticky
3. **User-friendly dialog** - Pokud auto-start nelze, zobrazí instrukce
4. **Smart retry** - 3 pokusy o připojení s timeoutem 30s
5. **Status tracking** - Sledování stavu spouštění

---

## 🎯 Jak to funguje

### Scénář 1: Web aplikace (běžný případ)

1. Uživatel klikne na "Použít CrewAI agenty"
2. Systém zjistí že server není dostupný
3. Zobrazí se dialog s instrukcemi:

   ```
   🚀 Spuštění CrewAI serveru

   Otevři nový terminál a spusť:
   cd python
   python crewai_api.py
   ```

4. Uživatel spustí server ručně
5. Systém čeká až server nastartuje (max 30s)
6. CrewAI agenti jsou připraveni! ✅

### Scénář 2: Electron/Desktop app

1. Systém automaticky spustí server na pozadí
2. Uživatel nemusí dělat nic
3. Po 2-5 sekundách je server připraven

---

## 📝 Způsoby spuštění serveru

### 1. Automaticky (z aplikace)

- Klikni na CrewAI agenty
- Následuj instrukce v dialogu

### 2. Launcher skripty (nejjednodušší)

**Windows:**

```bash
# Dvojklik na:
start-crewai.bat
```

**PowerShell:**

```powershell
.\start-crewai.ps1
```

### 3. NPM scripty

```bash
# V novém terminálu:
npm run crewai

# Nebo automaticky otevře nové CMD okno:
npm run crewai:start
```

### 4. Ručně

```bash
cd python
python crewai_api.py
```

---

## 🔧 Technické detaily

### Upravené soubory:

**CrewAIConnector.js:**

- ✅ `startServer()` - Automatické spuštění
- ✅ `waitForServer()` - Čekání na startup (30s timeout)
- ✅ `showServerStartInstructions()` - User-friendly dialog
- ✅ Smart retry logic s max 3 pokusy
- ✅ Silent mode pro background checks

**Nové soubory:**

- ✅ `start-crewai.bat` - Windows launcher
- ✅ `start-crewai.ps1` - PowerShell launcher
- ✅ `package.json` - NPM scripty

### Klíčové vlastnosti:

```javascript
// Automatický start při volání runCrew()
async runCrew(prompt, selectedAgents) {
  if (!this.isAvailable) {
    await this.startServer(); // 🚀 Automaticky spustí
  }
  // ... pokračuje normálně
}

// Inteligentní čekání
async waitForServer(maxWaitTime = 30000) {
  // Čeká až 30s, kontroluje každou sekundu
  // Zobrazuje progress každé 3 sekundy
}
```

---

## 🎨 User Experience

### Před:

```
❌ ERROR: CrewAI API not available
   Start server with: python crewai_api.py
```

### Po:

```
🔄 CrewAI server není dostupný, zkouším spustit...
⏳ Čekám na spuštění serveru...
⏳ Čekám 3s...
⏳ Čekám 6s...
✅ Server připraven!
✅ CrewAI API connected on localhost:5005
```

---

## 📊 Flow diagram

```
User clicks "Use CrewAI"
       ↓
Is server running? ──Yes──→ Use CrewAI ✅
       ↓ No
Try auto-start
       ↓
Can auto-start? ──Yes──→ Start server → Wait → Use CrewAI ✅
       ↓ No
Show instructions dialog
       ↓
User starts manually → Wait → Use CrewAI ✅
```

---

## ⚙️ Konfigurace

### Timeout a retry nastavení:

V `CrewAIConnector.js`:

```javascript
this.maxStartAttempts = 3; // Max pokusy
const maxWaitTime = 30000; // 30 sekund
const checkInterval = 1000; // Kontrola každou sekundu
```

### Změna portu:

```javascript
this.baseUrl = 'http://localhost:5005'; // Změň pokud potřebuješ
```

V `python/crewai_api.py`:

```python
app.run(debug=True, port=5005)  # Změň na jiný port
```

---

## 🐛 Troubleshooting

### Server se nespustí automaticky?

→ To je normální ve web aplikaci. Použij launcher skript.

### Timeout po 30 sekundách?

→ Server potřebuje více času. Zvyš `maxWaitTime`:

```javascript
await this.waitForServer(60000); // 60 sekund
```

### Server běží ale status říká "nedostupný"?

→ Zkontroluj port (mělo by být 5005):

```bash
netstat -ano | findstr :5005
```

### Python není nainstalovaný?

→ Nainstaluj Python 3.8+ z python.org

---

## 💡 Best Practices

### Pro vývoj:

1. Spusť server v separátním terminálu:
   ```bash
   npm run crewai
   ```
2. Nech běžet na pozadí
3. Aplikace ho najde automaticky

### Pro produkci:

1. Použij process manager (PM2, systemd)
2. Server jako systemová služba
3. Auto-restart při pádu

### Pro testování:

1. Použij launcher skripty (`start-crewai.bat`)
2. Jednoduché spuštění dvojklikem
3. Automaticky se zavře s terminálem

---

## 🚀 Příklady použití

### JavaScript:

```javascript
// V aplikaci - automaticky se spustí pokud není dostupný
const result = await window.CrewAI.runCrew('Vytvoř landing page pro restauraci', [
  'architect',
  'coder',
  'tester',
]);

// Manual control
await window.CrewAI.startServer(); // Spustí server
await window.CrewAI.checkConnection(); // Zkontroluje status
```

### PowerShell:

```powershell
# Spusť v novém okně
Start-Process powershell -ArgumentList "-NoExit", "-File", "start-crewai.ps1"

# Nebo jednoduše
.\start-crewai.bat
```

### NPM:

```bash
# Development workflow
npm run dev           # Terminal 1: Dev server
npm run crewai:start  # Terminal 2: CrewAI (auto-opens CMD)
```

---

## 📈 Výhody nové implementace

| Před                | Po                       |
| ------------------- | ------------------------ |
| ❌ Manuální start   | ✅ Automatický start     |
| ❌ Kryptické chyby  | ✅ User-friendly dialogy |
| ❌ Žádný feedback   | ✅ Real-time status      |
| ❌ Žádné retry      | ✅ 3 pokusy s timeoutem  |
| ❌ Složité spuštění | ✅ Launcher skripty      |

---

## 🎯 Future improvements

- [ ] Desktop app auto-start bez dialogu
- [ ] Background service mode
- [ ] Health monitoring dashboard
- [ ] Auto-restart při pádu serveru
- [ ] Multi-server load balancing
- [ ] Docker container support

---

**Vytvořeno:** Leden 2025
**Status:** ✅ Plně funkční
