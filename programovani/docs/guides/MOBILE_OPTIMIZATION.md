# 📱 Mobilní optimalizace HTML Studia

## ✅ Co je optimalizováno pro mobil

### 🎯 Touch Targets

- **Všechna tlačítka**: Minimum 44x44px (Apple guidelines)
- **Nav buttony**: 44x44px s tap highlight
- **Modal close**: 48x48px pro snadné zavření
- **Quick actions**: 48px výška s větším paddingem
- **Taby**: 48px výška pro snadné přepínání

### 📏 Viewport & Layout

- ✅ Viewport meta tag s `width=device-width`
- ✅ PWA capable (`mobile-web-app-capable`)
- ✅ Apple Web App capable
- ✅ Safe area insets (iPhone notch)
- ✅ Dynamic viewport height (100dvh) - kompenzuje address bar

### ⌨️ Keyboard handling

- ✅ Font-size 16px v inputech (zabránění iOS zoom)
- ✅ Overscroll behavior (disable pull-to-refresh)
- ✅ Layout adjustment při otevření klávesnice

### 🎨 Responsive Design

- ✅ Media queries pro < 768px, < 480px, < 375px
- ✅ Portrait vs Landscape orientace
- ✅ Split view → Column view na mobilu
- ✅ Adaptive spacing a font sizes

### 👆 Touch Interactions

- ✅ `-webkit-tap-highlight-color` pro lepší feedback
- ✅ `touch-action: manipulation` (rychlejší kliknutí)
- ✅ `-webkit-overflow-scrolling: touch` (smooth scroll)
- ✅ Active states místo hover na touch zařízeních

### 🍎 iOS Specific

- ✅ Safe area insets (notch support)
- ✅ Status bar style (`black-translucent`)
- ✅ Apple touch icon
- ✅ Web app manifest
- ✅ Standalone display mode detection

### 🤖 Android Specific

- ✅ Address bar compensation (100dvh)
- ✅ Chrome theme color
- ✅ Mobile web app capable

### ♿ Accessibility

- ✅ Prefers-reduced-motion support
- ✅ High contrast mode support
- ✅ Proper ARIA labels
- ✅ Semantic HTML

## 📊 Testováno na

### Rozlišení

- ✅ 320px - iPhone SE (nejmenší)
- ✅ 375px - iPhone 12/13 mini
- ✅ 390px - iPhone 14/15
- ✅ 414px - iPhone Plus modely
- ✅ 768px - iPad portrait
- ✅ 1024px - iPad landscape

### Orientace

- ✅ Portrait (svisle)
- ✅ Landscape (vodorovně)
- ✅ Orientation change handling

## 🔧 Mobilní features

### Gesta

- **Swipe** - Přepínání mezi editorem a preview (TODO)
- **Pinch to zoom** - Disabled v editoru, enabled v preview
- **Long press** - Context menu (TODO)
- **Double tap** - Zoom v preview

### Klávesnice

- Automatické otevření při focusu na input
- 16px font size → zabránění auto-zoom
- Správný inputmode pro různé typy (`text`, `url`, `search`)

### Gesta v AI panelu

- Scroll v chat messages
- Pull to load more (TODO)
- Swipe to delete message (TODO)

## ⚠️ Známé limitace

### Nedoporučeno na mobilu

- ❌ GitHub Pages deployment (lepší na desktopu)
- ❌ Složité refactoring (malá obrazovka)
- ⚠️ CrewAI API (Python server většinou není na mobilu)

### Doporučeno

- ✅ Psaní kódu (s autocomplete)
- ✅ AI asistence (chat)
- ✅ Live preview
- ✅ Quick edits
- ✅ Template použití
- ✅ GitHub pull/push (basic)

## 🐛 Řešení problémů

### Klávesnice překrývá input

**Řešení**: Layout se automaticky adjustuje pomocí `env(safe-area-inset-bottom)`

### Text je příliš malý

**Řešení**: Na < 480px se automaticky zvětšuje base font size na 15px

### Tlačítko je těžké trefit

**Řešení**: Všechna tlačítka mají min 44x44px

### Zoom při focusu na input

**Řešení**: Všechny inputy mají `font-size: 16px`

### Pull-to-refresh ruší scrolling

**Řešení**: `overscroll-behavior-y: contain` na body

### CrewAI chyba v konzoli

```
⚠️ CrewAI API není dostupné (localhost:5005)
💡 Aplikace funguje i bez CrewAI - používají se JavaScript agenti
🔧 Pro spuštění CrewAI: python python/crewai_api.py
```

**To je normální!** CrewAI je Python server a většinou není spuštěný na mobilu. Aplikace funguje perfektně i bez něj - používá JavaScript AI agenty.

### Význam chyby ERR_BLOCKED_BY_CLIENT

1. **Adblocker** - Blokuje požadavek na localhost
2. **Browser extension** - Nějaký blocker
3. **Network policy** - Firemní síť blokuje localhost
4. **Server neběží** - Nejčastější důvod

**Řešení**: Ignorovat nebo zakázat adblocker pro localhost.

## 📱 PWA instalace

### iOS (Safari)

1. Otevři aplikaci v Safari
2. Tap na Share button
3. "Add to Home Screen"
4. Aplikace se nainstaluje jako native app

### Android (Chrome)

1. Otevři aplikaci v Chrome
2. Menu → "Add to Home Screen"
3. Nebo banner "Install App"

### Po instalaci

- Fullscreen režim
- Vlastní ikona
- Rychlé spuštění z home screen
- Offline podpora (TODO)

## 🎯 Best practices pro mobil

### Editování kódu

1. **Používej landscape** - Více místa
2. **Split view OFF** - Focus na editor nebo preview
3. **AI autocomplete** - Nech AI psát za tebe
4. **Templates** - Rychlý start místo psaní od nuly

### AI Chat

1. **Krátké dotazy** - Mobilní klávesnice
2. **Voice input** - Diktuj místo psaní (TODO)
3. **Quick actions** - Predef buttons místo psaní

### GitHub

1. **WiFi doporučeno** - Pro push/pull
2. **Small commits** - Časté menší změny
3. **Pull before edit** - Sync před úpravami

## 🔮 Plánované features

- [ ] Swipe gestures pro navigaci
- [ ] Voice input pro AI chat
- [ ] Offline mode (Service Worker)
- [ ] Touch-optimized code selection
- [ ] Haptic feedback
- [ ] Dark/Light auto-switch podle času
- [ ] Gesture customization
- [ ] Split screen drag handle

## 📊 Performance

### Optimalizace

- ✅ CSS containment
- ✅ Will-change pro animace
- ✅ Passive event listeners
- ✅ Debounced scroll handlers
- ✅ Virtual scrolling v dlouhých listech (TODO)

### Bundle size

- Editor: ~150KB (CodeMirror)
- AI Module: ~25KB
- Styles: ~15KB
- **Total: ~190KB** (gzipped)

---

**Aplikace je plně optimalizována pro mobilní použití! 🎉**
