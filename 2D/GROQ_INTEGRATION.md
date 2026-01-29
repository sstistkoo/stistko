# Groq API Integrace

## Přehled

Projekt nyní podporuje dva AI providery:
- **Gemini** (Google) - původní provider
- **Groq** - nový provider s rychlejšími modely

## Přidané funkce

### 1. Provider Selection
- Dropdown pro výběr AI providera (Gemini / Groq) v AI panelu
- Automatická aktualizace modelů podle vybraného providera
- Oddělené API klíče pro každého providera

### 2. Groq Modely

#### Nejchytřejší:
- `openai/gpt-oss-120b` - GPT OSS 120B (~500 tok/s)
- `moonshotai/kimi-k2-instruct-0905` - Kimi K2 (256K kontext)

#### Chat:
- `llama-3.3-70b-versatile` - Llama 3.3 70B (nejlepší pro chat)
- `qwen/qwen3-32b` - Qwen 3 32B (silný na kód)

#### Rychlé:
- `openai/gpt-oss-20b` - GPT OSS 20B (~1000 tok/s)
- `llama-3.1-8b-instant` - Llama 3.1 8B (~560 tok/s)
- `meta-llama/llama-4-scout-17b-16e-instruct` - Llama 4 Scout (~750 tok/s)

#### Vision / OCR:
- `meta-llama/llama-4-maverick-17b-128e-instruct` - Llama 4 Maverick
- `meta-llama/llama-4-scout-17b-16e-instruct` - Llama 4 Scout

### 3. Vision Support
- Upload obrázků pro Groq Vision modely
- Automatické zobrazení/skrytí upload tlačítka podle vybraného modelu
- Base64 encoding obrázků pro API volání

### 4. API Key Management
- Oddělené správy klíčů pro Gemini a Groq
- Tab interface v Settings modálu
- LocalStorage pro uložení klíčů obou providerů

## Soubory změněny

### index.html
- Přidán dropdown pro výběr AI providera
- Rozšířen Settings modal o Groq tab
- Přidán upload container pro obrázky

### src/ai.js
- Přidána funkce `callGroqDirect()` pro Groq API volání
- Aktualizace `MODEL_LIMITS` o Groq modely
- Funkce `updateModelsForProvider()` pro dynamickou změnu modelů
- Funkce `updateImageUploadVisibility()` pro vision support
- Aktualizace `updateApiUsageUI()` pro podporu obou providerů

### src/utils.js
- Funkce `getStoredGroqKeys()` a `saveStoredGroqKeys()`
- Funkce `getCurrentGroqApiKey()` a `getCurrentGroqApiKeyName()`
- Funkce `renderGroqKeyList()` pro zobrazení Groq klíčů
- Funkce `addGroqApiKey()`, `switchGroqApiKey()`, `removeGroqApiKey()`
- Funkce `switchProviderTab()` pro přepínání mezi taby

### lib/init.js
- Inicializace provider modelů při startu
- Setup listeneru pro změnu modelu

## Použití

### 1. Získání Groq API klíče
1. Jděte na https://console.groq.com/keys
2. Vytvořte si účet a získejte API klíč

### 2. Přidání klíče do aplikace
1. Klikněte na ⚙️ v AI panelu
2. Přepněte na tab "⚡ Groq"
3. Zadejte název a API klíč
4. Klikněte "Přidat a použít"

### 3. Použití Groq
1. V AI panelu vyberte "⚡ Groq" v provider dropdownu
2. Vyberte požadovaný model
3. Pro Vision modely se zobrazí tlačítko "📷 Obrázek"
4. Zadejte prompt a odešlete

## API Endpoint

Groq API: `https://api.groq.com/openai/v1/chat/completions`

```javascript
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "user",
      "content": "prompt text"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}
```

Pro Vision modely:
```javascript
{
  "role": "user",
  "content": [
    { "type": "text", "text": "prompt" },
    { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
  ]
}
```

## Výhody Groq

1. **Rychlost** - až 1000 tokenů/s (10x rychlejší než Gemini)
2. **Vyšší limity** - 30 RPM oproti 10-15 RPM u Gemini
3. **Vision support** - OCR a analýza obrázků
4. **Variety modelů** - různé velikosti pro různé potřeby
5. **Optimalizace pro kód** - modely jako Qwen 3 32B

## Zachování kompatibility

- Gemini zůstává výchozím providerem
- Všechny existující funkce Gemini fungují beze změny
- API klíče jsou ukládány odděleně
- Lze snadno přepínat mezi providery

## Budoucí rozšíření

- [ ] Podpora dalších providerů (Anthropic, OpenAI)
- [ ] Streaming responses
- [ ] Model comparison tool
- [ ] Cost tracking per provider
