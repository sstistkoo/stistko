# Security Policy

## Demo/Testovací API klíče

Tento repozitář obsahuje **pouze DEMO a testovací API klíče** pro vývojové účely.

### Umístění demo klíčů:

- `2D/src/globals.js` - Demo klíče pro Google Gemini, Groq, OpenRouter, Mistral
- `programovani/src/core/config.js` - Demo klíče pro AI služby
- `programovani/src/modules/ai/core/AIModule.js` - Demo klíče

### ⚠️ Důležité upozornění:

Tyto klíče jsou:

- ✅ Pouze pro testování a vývoj
- ✅ S omezeným rate limitem
- ✅ Mohou být kdykoliv zneplatněny
- ❌ NIKDY NEPOUŽÍVEJTE pro produkční nasazení

### Bezpečné používání API klíčů

Pro produkční použití:

1. Vytvořte si vlastní API klíče
2. Uložte je do `.env` souboru (který je v `.gitignore`)
3. Nikdy necommitujte skutečné API klíče do GitHubu

### Reporting a Security Issue

Pokud najdete bezpečnostní problém, prosím kontaktujte majitele repozitáře přímo.
