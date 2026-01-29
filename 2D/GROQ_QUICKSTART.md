# 🚀 Groq AI Integration - Quick Start

Tento projekt nyní podporuje **Groq API** jako další AI provider vedle Gemini!

## ✨ Co je nového?

### Dva AI Providers
- **🤖 Gemini** (Google) - původní, stabilní
- **⚡ Groq** - nový, ultra-rychlý (až 1000 tokenů/s!)

### 8 Groq Modelů
Vyberte model podle potřeby:

**Nejchytřejší:**
- GPT OSS 120B - nejlepší kvalita (~500 tok/s)
- Kimi K2 - 256K kontext pro dlouhé texty

**Chat:**
- Llama 3.3 70B - nejlepší pro konverzaci
- Qwen 3 32B - expert na programování

**Rychlé:**
- GPT OSS 20B - ~1000 tok/s 🚀
- Llama 3.1 8B - ~560 tok/s
- Llama 4 Scout - ~750 tok/s

**Vision (OCR/Obrázky):**
- Llama 4 Maverick - analýza obrázků
- Llama 4 Scout - OCR + vision

## 🎯 Jak začít (3 kroky)

### 1️⃣ Získejte Groq API klíč
```
1. Jděte na: https://console.groq.com/keys
2. Zaregistrujte se (zdarma!)
3. Vytvořte nový API klíč
4. Zkopírujte klíč (začíná "gsk_...")
```

### 2️⃣ Přidejte klíč do aplikace
```
1. Otevřete aplikaci
2. Klikněte na "⚙️" tlačítko v AI panelu
3. Přepněte na tab "⚡ Groq"
4. Zadejte název (např. "Můj Groq")
5. Vložte API klíč
6. Klikněte "Přidat a použít"
```

### 3️⃣ Použijte Groq
```
1. V AI panelu nahoře vyberte "⚡ Groq"
2. Vyberte model (např. "Llama 3.3 70B")
3. Zadejte prompt
4. Odešlete → Rychlá odpověď! 🚀
```

## 📷 Použití Vision Modelů

Pro modely s vision support:

1. Vyberte Vision model (Llama 4 Maverick/Scout)
2. Objeví se tlačítko "📷 Obrázek"
3. Klikněte a vyberte obrázek
4. Napište prompt (např. "Co je na obrázku?")
5. Odešlete

## 💡 Tipy

### Kdy použít Groq?
- ✅ Chcete rychlé odpovědi (10x rychlejší než Gemini)
- ✅ Potřebujete OCR nebo analýzu obrázků
- ✅ Programování (Qwen 3 je expert)
- ✅ Dlouhé konverzace (Kimi K2 má 256K kontext)

### Kdy použít Gemini?
- ✅ Máte demo klíč předvyplněný
- ✅ Chcete nejnovější Gemini 3 Pro
- ✅ Preferujete Google ekosystém

## 🎨 Funkce

### ✅ Co funguje
- [x] Výběr mezi Gemini / Groq
- [x] 8 Groq modelů
- [x] Oddělené API klíče
- [x] Vision support (obrázky)
- [x] Stejný interface jako Gemini
- [x] Automatická detekce vision modelů
- [x] Statistiky použití API

### 🔜 Plánované
- [ ] Další providery (Claude, OpenAI)
- [ ] Streaming odpovědí
- [ ] Porovnání modelů
- [ ] Sledování nákladů

## 🆘 Řešení problémů

**"Nemáte Groq API klíč"**
→ Přidejte klíč v ⚙️ → Groq tab

**"Upload obrázků není vidět"**
→ Vyberte Vision model (Llama 4 Maverick/Scout)

**"Model není v seznamu"**
→ Přepněte provider na "⚡ Groq"

**"Pomalé odpovědi"**
→ Vyberte rychlejší model (GPT OSS 20B = 1000 tok/s!)

## 📊 Srovnání Rychlosti

| Model | Rychlost | Kvalita | Použití |
|-------|----------|---------|---------|
| Gemini Flash-Lite | ~50 tok/s | ⭐⭐⭐⭐ | Běžné úkoly |
| Groq GPT OSS 20B | ~1000 tok/s | ⭐⭐⭐ | Rychlé odpovědi |
| Groq GPT OSS 120B | ~500 tok/s | ⭐⭐⭐⭐⭐ | Nejlepší kvalita |
| Groq Llama 3.3 70B | ~400 tok/s | ⭐⭐⭐⭐⭐ | Chat & AI |

## 🎉 Výhody Groq

1. **Rychlost** - až 20x rychlejší než standardní LLM
2. **Zdarma** - velkorysé free tier limity
3. **Variety** - 8 různých modelů pro různé účely
4. **Vision** - OCR a analýza obrázků
5. **Spolehlivost** - vysoká dostupnost API

## 📝 Technické Detaily

### API Endpoint
```
https://api.groq.com/openai/v1/chat/completions
```

### Limity
- **RPM (Requests Per Minute):** 30
- **TPM (Tokens Per Minute):** Varies by model
- **Free Tier:** Ano! 🎉

### Podporované formáty obrázků
- JPEG, PNG, WebP
- Base64 encoding
- Max velikost: podle modelu

---

**Vytvořeno:** 24. prosince 2025
**Verze:** 1.0.0

Pro více informací viz [GROQ_INTEGRATION.md](GROQ_INTEGRATION.md)
