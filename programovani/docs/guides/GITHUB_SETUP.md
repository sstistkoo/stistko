# 🔐 GitHub Autorizace & Přístup

## ✅ Odpověď na otázku: Stačí username a token?

**ANO**, ale token musí mít správná oprávnění!

### 📋 Požadované GitHub Token Scopes:

#### Pro **veřejné** repozitáře:

```
✅ public_repo - Přístup k veřejným repozitářům
```

#### Pro **privátní** repozitáře:

```
✅ repo (full control) - Zahrnuje:
   - repo:status
   - repo_deployment
   - public_repo
   - repo:invite
   - security_events
```

#### Další užitečné (volitelné):

```
⚠️ workflow - Pro spouštění GitHub Actions
⚠️ gist - Pro Gist operace
⚠️ read:org - Pro organizační repozitáře
```

### 🔧 Jak vytvořit Personal Access Token:

1. **GitHub.com** → Settings → Developer settings
2. **Personal access tokens** → Tokens (classic)
3. **Generate new token** → Generate new token (classic)
4. **Note**: "HTML Studio Access"
5. **Expiration**: 30 days, 60 days, 90 days nebo No expiration
6. **Select scopes**:
   - ✅ `repo` (pro privátní) nebo `public_repo` (jen veřejné)
7. **Generate token** → Zkopíruj token! (Uvidíš ho jen jednou)

### 💾 Co token umožňuje:

#### ✅ **Čtení** (Read):

- Zobrazení souborů
- Klonování repozitáře
- Stažení kódu
- Prohlížení commit historie
- Čtení Issues & Pull Requests

#### ✅ **Zápis** (Write):

- Push změn
- Vytváření commitů
- Vytváření/mazání větví
- Vytváření Pull Requests
- Vytváření Issues
- Nahrávání souborů
- Publish na GitHub Pages

#### ❌ **Token NEMŮŽE**:

- Změnit nastavení účtu
- Smazat účet
- Změnit repozitář settings (jen s `admin:repo_hook`)

---

## 🐛 Chyba 404: html_studio.html

```
❌ GET https://sstistkoo.github.io/progres/programovani/html_studio.html 404 (Not Found)
```

### 🔍 Co se děje?

Někde v kódu je **zastaralý odkaz** na starý soubor `html_studio.html`, který:

1. **Neexistuje** v aktuálním projektu
2. Je **přejmenován** na `index.html`
3. Je v **archive/** složce

### 📁 Současná struktura:

```
✅ index.html              - Hlavní soubor (nový modularizovaný)
❌ html_studio.html        - Přesunutý do archive/
📦 archive/
   ├── html_studio.html   - Stará monolitická verze
   ├── html_studio.html.backup2
   └── ...
```

### 🔧 Řešení:

Odkaz na `html_studio.html` pravděpodobně pochází z:

1. **GitHub Pages nastavení** - Repozitář má nastavený starý index
2. **Browser cache** - Prohlížeč si pamatuje starý URL
3. **Někde v kódu** - Zastaralý odkaz v JavaScriptu

### ✅ Jak opravit:

#### 1. **GitHub Pages nastavení**:

```
Repository → Settings → Pages
Source: Deploy from a branch
Branch: main (nebo master)
Folder: / (root)
```

Po uložení GitHub Pages publikuje **index.html** (ne html_studio.html)

#### 2. **Vyčistit cache**:

```
Chrome: Ctrl+Shift+Delete → Vymazat cache
Firefox: Ctrl+Shift+Delete → Vymazat cache
Edge: Ctrl+Shift+Delete → Vymazat cache
```

#### 3. **Správný GitHub Pages URL**:

```
✅ https://sstistkoo.github.io/progres/
✅ https://sstistkoo.github.io/progres/programovani/
❌ https://sstistkoo.github.io/progres/programovani/html_studio.html
```

GitHub Pages automaticky hledá `index.html` v root složce!

---

## 🚀 Použití v HTML Studio:

### Přihlášení:

1. Klikni na **GitHub ikonu** (🐙) v pravém horním rohu
2. Nebo klikni na **Files** tlačítko → GitHub tab
3. Klikni **"Přihlásit se na GitHub"**
4. Zadej **username** a **token**

### Co můžeš dělat:

#### ✅ S tokenem `public_repo`:

- Číst veřejné repozitáře
- Push do vlastních veřejných repozitářů
- Vytvářet Issues ve veřejných repozitářích

#### ✅ S tokenem `repo`:

- **Vše výše PLUS:**
- Číst privátní repozitáře
- Push do privátních repozitářů
- Spravovat deployment

---

## 🔒 Bezpečnost tokenu:

### ⚠️ **NIKDY:**

- ❌ Nesdílej token veřejně
- ❌ Necommituj token do Gitu
- ❌ Neposílej token přes nezabezpečenou síť

### ✅ **VŽDY:**

- ✅ Používej HTTPS (ne HTTP)
- ✅ Token ukládej v `localStorage` (pouze browser)
- ✅ Nastav expiraci tokenu (30-90 dní)
- ✅ Revokuj token po použití na cizím PC
- ✅ Používej různé tokeny pro různé aplikace

### 🗑️ **Revoke token** (zneplatnění):

```
GitHub.com → Settings → Developer settings
→ Personal access tokens → Tokens (classic)
→ [Tvůj token] → Delete / Revoke
```

---

## 📊 Token v HTML Studio:

### Kde se ukládá:

```javascript
localStorage.setItem('github_username', 'sstistkoo');
localStorage.setItem('github_token', 'ghp_xxxxxxxxxxxxx');
```

### Jak se používá:

```javascript
// GitHub API call
fetch('https://api.github.com/user/repos', {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  },
});
```

### Co token umožňuje v aplikaci:

1. **Zobrazení repozitářů** - Seznam všech tvých repos
2. **Push změn** - Nahrání souborů do repozitáře
3. **Commit** - Vytvoření commit s popisem
4. **Pull** - Stažení změn z repozitáře
5. **GitHub Pages** - Publikování na Pages

---

## 🎯 Doporučené workflow:

### 1. První nastavení:

```
1. Vytvoř Personal Access Token (scope: repo)
2. Přihlas se v HTML Studio (username + token)
3. Připoj/vytvoř repozitář
```

### 2. Běžná práce:

```
1. Edituj kód
2. Commit (popis změn)
3. Push na GitHub
4. GitHub Pages automaticky publikuje
```

### 3. Synchronizace:

```
1. Pull - Stáhni změny z GitHubu
2. Resolve conflicts (pokud jsou)
3. Edituj
4. Push zpět
```

---

## 🐙 GitHub Pages publikace:

### Automatická:

```
1. Push do main/master větve
2. GitHub Actions (pokud nastaveno)
3. GitHub Pages automaticky publishne
4. Dostupné na: https://[username].github.io/[repo]/
```

### Manuální:

```
Repository → Settings → Pages
Source: Deploy from a branch
Branch: main
Folder: / (root)
Save
```

### Čas publikace:

- První deploy: ~1-3 minuty
- Aktualizace: ~30-60 sekund

---

## ✅ Závěr:

1. **Username + Token = Plný přístup** ✅
2. **Token musí mít správné scopes** (repo nebo public_repo)
3. **html_studio.html chyba** = Zastaralý odkaz, použij `index.html`
4. **GitHub Pages URL**: `https://sstistkoo.github.io/progres/` (bez html_studio.html)
5. **Token je citlivý** - Ukládej bezpečně!

---

**Potřebuješ pomoci?** Piš! 🚀
