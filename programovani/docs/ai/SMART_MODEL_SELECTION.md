# 🎯 Inteligentní Výběr AI Modelů

## Přehled Systému

Systém automaticky vybírá nejlepší dostupný AI model pro kódování s ohledem na:

- ✅ Kvalitu pro tvorbu HTML/JS/CSS kódu
- ✅ Rate limity (RPM - requests per minute)
- ✅ Dostupnost API klíčů
- ✅ Penalizaci za překročení limitů
- ✅ Automatický reset časovačů

## Priority Modelů (Seřazeno Podle Kvality)

### Tier 1: Nejlepší (90-100 kvalita)

1. **Gemini 2.5 Pro** - kvalita 98, 5 RPM, penalty 120min
2. **Gemini 2.5 Flash** - kvalita 95, 15 RPM, penalty 60min
3. **Llama 3.3 70B (Groq)** - kvalita 92, 30 RPM, penalty 30min

### Tier 2: Velmi Dobré (80-90 kvalita)

4. **Codestral (Mistral)** - kvalita 90, 10 RPM, penalty 60min
5. **Mixtral 8x7B (Groq)** - kvalita 88, 30 RPM, penalty 30min
6. **Command R+ (Cohere)** - kvalita 87, 20 RPM, penalty 60min
7. **Mistral Small** - kvalita 85, 30 RPM, penalty 60min

### Tier 3: Dobré (70-80 kvalita)

8. **Gemini Flash Thinking (OpenRouter)** - kvalita 93, 20 RPM
9. **Llama 3.1 70B (OpenRouter)** - kvalita 85, 20 RPM
10. **Command R (Cohere)** - kvalita 82, 20 RPM
11. **Gemma 2 9B (Groq)** - kvalita 78, 30 RPM
12. **Qwen 2.5 7B (HuggingFace)** - kvalita 76, 10 RPM, penalty 120min

### Tier 4: Základní (60-70 kvalita)

13. **Mistral Small (OpenRouter)** - kvalita 75, 20 RPM
14. **Llama 3.2 3B (HuggingFace)** - kvalita 70, 10 RPM, penalty 120min

## Jak Funguje Rate Limit Protection

### 1. Tracking Requestů

```javascript
// Každý request je zaznamenán s časovým razítkem
AI._recordModelRequest('groq', 'llama-3.3-70b-versatile');
```

### 2. Kontrola Dostupnosti

```javascript
// Před každým požadavkem se zkontroluje dostupnost
if (AI.isModelAvailable('groq', 'llama-3.3-70b-versatile')) {
  // Model je dostupný
}
```

### 3. Automatický Fallback

Když model není dostupný:

1. Zkusí **všechny ostatní modely stejného providera**
2. Pak přejde na **dalšího providera podle priority**
3. Pokračuje dokud nenajde dostupný model

## Typy Limitů

### RPM (Requests Per Minute)

- **Detekce**: Počítá requesty za poslední minutu
- **Reset**: Automaticky po 1 minutě
- **Penalty**: Navíc penalty doba (30-120min)
- **Příklad**: Groq má 30 RPM, po překročení čeká 1min + 30min penalty

### Daily Limit

- **Detekce**: Celkový denní limit překročen
- **Reset**: O půlnoci (00:00)
- **Penalty**: Žádná
- **Příklad**: Gemini free tier má denní limit

### Quota Limit

- **Detekce**: Měsíční kvóta vyčerpána
- **Reset**: Na začátku měsíce
- **Penalty**: Žádná

## Použití v Kódu

### Automatický Výběr Nejlepšího Modelu

```javascript
// Systém automaticky vybere nejlepší dostupný
const best = AI.selectBestCodingModel();
console.log(`Použiji: ${best.provider}/${best.model} (kvalita: ${best.quality})`);
```

### Manuální Výběr s Kontrolou

```javascript
if (AI.isModelAvailable('gemini', 'gemini-2.5-flash')) {
  const response = await AI.ask(prompt, {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });
}
```

### Informace o Limitech

```javascript
// Zobrazí stav všech modelů
console.table(AI._modelLimitTracking);
```

## Penalty System

Penalty system chrání před ban/throttling ze strany AI providerů:

- **Groq**: 30min penalty (má nejvyšší free limity)
- **Gemini**: 60-120min penalty (striktní limity)
- **Mistral**: 60min penalty
- **Cohere**: 60min penalty
- **HuggingFace**: 120min penalty (CORS problémy)
- **OpenRouter**: 60min penalty

## Příklad Průběhu

```
1. User pošle požadavek
2. Systém vybere: Gemini 2.5 Flash (kvalita 95)
3. Request OK → zaznamenán čas
4. Po 15 requestech → RPM limit
5. Penalty: čeká 1min + 60min
6. Automaticky přepne na: Llama 3.3 70B (Groq, kvalita 92)
7. Groq má 30 RPM → více prostoru
8. Po vyčerpání Groq → Mistral Codestral (kvalita 90)
9. Atd...
```

## Výhody Systému

✅ **Vždy nejlepší možná kvalita** - prioritizuje podle kvality
✅ **Ochrana před ban** - respektuje limity s rezervou
✅ **Automatický fallback** - nikdy neselže kvůli limitům
✅ **Transparentní** - loguje každý krok
✅ **Optimalizované pro kódování** - modely vybrané specificky pro HTML/CSS/JS

## Monitoring

Console logy ukazují:

- ✅ Vybraný model s kvalitou
- ⏸️ Modely v penalty/waiting
- 🚫 Limit hits s typem
- 🔄 Automatické fallbacky

```javascript
// Příklad výstupu
✅ Vybrán nejlepší model: gemini/gemini-2.5-flash (kvalita: 95)
🚫 gemini:gemini-2.5-flash RPM limit - penalty 60min
✅ Trying fallback to: groq llama-3.3-70b-versatile
⏸️ groq:llama-3.3-70b-versatile RPM limit (čeká 15s)
✅ Trying fallback to: mistral codestral-latest
```
