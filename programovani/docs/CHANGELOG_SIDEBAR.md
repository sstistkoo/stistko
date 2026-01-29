# 🚀 Změny v HTML Studiu - Nový Sidebar a UI vylepšení

## ✅ Co bylo změněno

### 1. 🗂️ Nový výsuvný Sidebar (VS Code styl)

**Tlačítko vlevo nahoře** - Nyní otevírá sidebar místo starého menu

#### 📂 Soubory Tab

- **Otevřené soubory**: Seznam všech otevřených souborů s ikonami
- **Aktivní soubor**: Zvýrazněný modrým pozadím
- **Zavření souboru**: Tlačítko ❌ při najetí myší
- **Přepínání**: Kliknutí na soubor ho aktivuje
- **Počítadlo**: Badge s počtem otevřených souborů

#### ⚡ Rychlé akce

- **Nový soubor** - Vytvořit nový tab
- **Uložit** - Uložit aktuální soubor
- **Stáhnout** - Stáhnout jako HTML

#### 🔧 GitHub Tab

- **Status badge**: Ukazuje stav připojení
- **Přihlášení**: Modální okno s formulářem
- **Demo režim**: Pro vývoj zadáte jen username
- **Token podpora**: Volitelný Personal Access Token
- **GitHub Pages**: Info o použití

### 2. 🔄 Přesunuto tlačítko Konzole

**Nová pozice**: Vedle tlačítka "Obnovit náhled" (F5)

- **Refresh** (🔄): Obnoví náhled
- **Konzole** (⌨️): Otevře dev console
- Obě tlačítka vedle sebe v pravém horním rohu

### 3. 🔐 GitHub Login Modal

**Místo `prompt()`** nyní krásné modální okno:

#### Funkce

- Formulář s polem pro username
- Pole pro Personal Access Token (volitelné)
- Link na GitHub Settings
- Info zpráva o demo režimu
- Tlačítka: Zrušit / Přihlásit se
- Zavření: ESC nebo kliknutí mimo
- Enter: Potvrzení formuláře

#### Design

- Backdrop blur efekt
- Smooth animace (scale + opacity)
- Responzivní (max 500px šířka)
- Dark/Light mode support

### 4. 🐛 Oprava chyby preview.refresh

**Původní chyba**:

```
TypeError: this.preview.refresh is not a function
```

**Řešení**:

- Přidána kontrola existence metody
- Fallback na manuální refresh iframe
- Bezpečné volání funkce

```javascript
if (this.preview && typeof this.preview.refresh === 'function') {
  this.preview.refresh();
} else {
  // Fallback - manual iframe refresh
  const previewFrame = document.getElementById('previewFrame');
  if (previewFrame && previewFrame.contentWindow) {
    // ... refresh code
  }
}
```

## 📁 Nové soubory

### `src/modules/sidebar/Sidebar.js` (430 řádků)

- Kompletní sidebar modul
- VS Code style UI
- Files + GitHub management
- Event handling
- State synchronizace

### `src/styles/components/sidebar.css` (600+ řádků)

- Kompletní styling
- Animace a transitions
- Responzivní design
- Dark/Light mode
- Mobile optimalizace

## 🔧 Upravené soubory

### `src/core/app.js`

- Import Sidebar modulu
- Inicializace `this.sidebar`
- Oprava `refreshPreview()` metody s fallbackem

### `index.html`

- Změna `menuBtn` → `filesBtn` (ikona souboru)
- Přidáno `refreshBtn` (🔄)
- Přidáno `consoleBtn` (⌨️)
- Event listenery pro nová tlačítka
- Upravené tooltips

### `src/modules/shortcuts/ShortcutsPanel.js`

- Odebrána akce "Konzole" (je nyní v headeru)
- Ponechána pouze klávesová zkratka Ctrl+`

### `src/styles/main.css`

- Přidán import `sidebar.css`

## 🎨 Design Features

### Sidebar

- **Šířka**: 320px
- **Animace**: Slide in zleva (cubic-bezier)
- **Shadow**: 2px 0 8px rgba
- **Tabs**: Modrá aktivní, šedá neaktivní
- **Overlay**: Tmavý backdrop při otevření

### File Items

- **Výška**: Min 44px (touch friendly)
- **Hover efekt**: Posun 2px doprava
- **Aktivní**: Modrá barva
- **Close btn**: Objeví se při hoveru
- **Ikony**: 📄 HTML, 🎨 CSS, ⚡ JS

### GitHub Modal

- **Backdrop**: rgba(0,0,0,0.5) + blur(4px)
- **Content**: Scale animace (0.9 → 1)
- **Inputs**: Focus state s primary color
- **Buttons**: Hover efekt + shadow

## ⌨️ Klávesové zkratky

### Nové

- **Ctrl + `** - Toggle konzole
- **F5** - Obnovit náhled

### Zachované

- **ESC** - Zavřít sidebar/modal
- **Ctrl + K** - Rychlé akce
- **Ctrl + S** - Uložit
- **Ctrl + N** - Nový soubor

## 📱 Mobilní podpora

### Sidebar

- **Plná šířka**: Na mobilu sidebar přes celou obrazovku
- **Max width**: 320px
- **Responsive tabs**: Text ikon skrytý na úzkých displejích
- **Touch targets**: 44x44px minimum

### Tlačítka

- **Header buttons**: Všechna 44x44px
- **Modal buttons**: 44px výška
- **Action buttons**: 44px výška

## 🔄 Event Flow

### Sidebar Toggle

```
User clicks filesBtn
→ emit('sidebar:toggle')
→ Sidebar.toggle()
→ CSS class 'visible'
→ Slide in animation
```

### File Switch

```
User clicks file in sidebar
→ emit('tabs:switch', {index})
→ TabManager switches tab
→ Sidebar.hide()
→ Editor updates
```

### GitHub Login

```
User clicks login button
→ showGitHubLoginModal()
→ Modal appears with form
→ User fills username + token
→ localStorage save
→ updateGitHubStatus()
→ Status badge updated
```

### Preview Refresh

```
User clicks refresh or presses F5
→ emit('preview:refresh')
→ app.refreshPreview()
→ Check preview.refresh exists
→ If yes: call it
→ If no: manual iframe refresh
→ Show toast notification
```

## 🚨 Breaking Changes

### ❌ Odstraněno

- **MenuBtn**: Nahrazeno filesBtn
- **Menu Panel**: Zatím zachováno, ale nepoužívá se
- **Prompt dialog**: Nahrazeno modálním oknem
- **Konzole v Shortcuts**: Přesunuta do headeru

### ⚠️ Deprecated

- `menu:show` event - použijte `sidebar:toggle`
- `menu:hide` event - použijte `sidebar:hide`

## 📋 TODO (budoucí vylepšení)

- [ ] GitHub repo browser v sidebaru
- [ ] File tree (složková struktura)
- [ ] Recent files historie
- [ ] Sidebar resize drag handle
- [ ] Pinned files feature
- [ ] File search v sidebaru
- [ ] Git integration (commits, branches)
- [ ] Keyboard navigation v sidebaru
- [ ] Custom sidebar layouts
- [ ] Export/Import workspace settings

## 🎯 Testování

### Sidebar

1. ✅ Kliknutí na filesBtn otevře sidebar
2. ✅ ESC zavře sidebar
3. ✅ Kliknutí mimo zavře sidebar
4. ✅ Tabs se přepínají Files ↔ GitHub
5. ✅ Seznam souborů se aktualizuje
6. ✅ Kliknutí na soubor ho aktivuje
7. ✅ Close button zavře soubor
8. ✅ Quick actions fungují

### GitHub Login

1. ✅ Kliknutí otevře modální okno
2. ✅ ESC zavře okno
3. ✅ Enter submituje formulář
4. ✅ Username se uloží do localStorage
5. ✅ Token se uloží (volitelně)
6. ✅ Status badge se aktualizuje
7. ✅ Toast notifikace se zobrazí

### Preview Refresh

1. ✅ F5 obnoví náhled
2. ✅ Tlačítko refresh funguje
3. ✅ Fallback při chybě funguje
4. ✅ Toast notifikace se zobrazí

### Console Button

1. ✅ Tlačítko vedle refresh
2. ✅ Ctrl+` funguje
3. ✅ Konzole se toggleuje

## 📸 Screenshots

### Sidebar - Files Tab

```
┌─────────────────────────────┐
│ 📂 Soubory  🔧 GitHub    ✕ │
├─────────────────────────────┤
│ 📂 Otevřené soubory      3  │
│ ┌─────────────────────────┐ │
│ │ 📄 index.html        ✕ │ │ ← Aktivní (modrá)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🎨 styles.css        ✕ │ │
│ └─────────────────────────┘ │
│                             │
│ ⚡ Rychlé akce              │
│ ┌─────────────────────────┐ │
│ │ 📄 Nový soubor          │ │
│ │ 💾 Uložit               │ │
│ │ ⬇️ Stáhnout            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### GitHub Modal

```
┌─────────────────────────────────┐
│ 🔧 Přihlášení na GitHub      ✕ │
├─────────────────────────────────┤
│ ℹ️ V produkci OAuth okno...     │
│                                 │
│ GitHub uživatelské jméno        │
│ ┌─────────────────────────────┐ │
│ │ např. octocat               │ │
│ └─────────────────────────────┘ │
│                                 │
│ Personal Access Token           │
│ ┌─────────────────────────────┐ │
│ │ ghp_...                     │ │
│ └─────────────────────────────┘ │
│ Pro plný přístup vytvořte token │
│                                 │
│         [ Zrušit ] [ Přihlásit ]│
└─────────────────────────────────┘
```

---

**Verze**: 1.1.0
**Datum**: 1. ledna 2026
**Autor**: AI Assistant + VS Code Copilot
