# Vylepšení stability aplikace

## 🎯 Cíl

Zastavit "točení dokola" - situaci, kdy oprava jedné věci pokazí něco jiného.

## 🛡️ Implementovaná ochrana

### 1. Ochrana proti duplicitním event listenerům

**Soubor:** `src/core/events.js`

```javascript
on(event, callback) {
  if (!this.listeners.has(event)) {
    this.listeners.set(event, new Set());
  }

  const eventListeners = this.listeners.get(event);

  // OCHRANA: Zkontroluj jestli už není stejný handler zaregistrovaný
  for (const listener of eventListeners) {
    if (listener === callback) {
      console.warn(`⚠️ EventBus: Duplicitní handler pro '${event}' byl ignorován`);
      return () => eventListeners.delete(callback);
    }
  }

  eventListeners.add(callback);
  return () => eventListeners.delete(callback);
}
```

**Proč:** Moduly se někdy reinicializují a registrují listenery vícekrát, což způsobuje cascade updates.

**Benefit:** Event se vyvolá jen jednou, předchází nekonečným smyčkám.

---

### 2. Ochrana proti duplicitním state subscribers

**Soubor:** `src/core/state.js`

```javascript
subscribe(pathOrCallback, callback) {
  // subscribe(callback) - globální
  if (typeof pathOrCallback === 'function') {
    callback = pathOrCallback;
    pathOrCallback = '*';
  }

  if (!this.subscribers.has(pathOrCallback)) {
    this.subscribers.set(pathOrCallback, new Set());
  }

  const subs = this.subscribers.get(pathOrCallback);

  // OCHRANA: Zkontroluj jestli už není stejný subscriber zaregistrovaný
  if (subs.has(callback)) {
    console.warn(`⚠️ State: Duplicitní subscriber pro '${pathOrCallback}' byl ignorován`);
    return () => {
      subs.delete(callback);
      if (subs.size === 0) {
        this.subscribers.delete(pathOrCallback);
      }
    };
  }

  subs.add(callback);
  return () => {
    subs.delete(callback);
    if (subs.size === 0) {
      this.subscribers.delete(pathOrCallback);
    }
  };
}
```

**Proč:** Stejný problém jako s event listenery - subscribers se registrují vícekrát.

**Benefit:** State notifikace se odešle jen jednou na subscriber.

---

### 3. Batch updates pro hromadné změny

**Soubor:** `src/core/state.js`

```javascript
/**
 * Spustí batch mód pro hromadné změny
 * @param {Function} callback - Funkce se změnami
 * @returns {Promise<void>}
 */
async batch(callback) {
  this.batchMode = true;
  this.batchUpdates = [];

  try {
    await callback();
  } finally {
    this.batchMode = false;

    // Vyvolej všechny notifikace najednou
    const uniquePaths = new Map();
    this.batchUpdates.forEach(update => {
      // Drž jen poslední hodnotu pro každou cestu
      uniquePaths.set(update.path, update);
    });

    uniquePaths.forEach(update => {
      this._executeNotify(update.path, update.value, update.oldValue);
    });

    this.batchUpdates = [];
  }
}
```

**Použití v AIPanel.js:**

```javascript
modal.querySelector('#replaceAllFiles').addEventListener('click', async () => {
  // Nahraď všechny soubory pomocí batch update
  await state.batch(async () => {
    eventBus.emit('github:project:loaded', {
      name: repoName,
      files: allFiles,
    });
  });

  eventBus.emit('toast:show', {
    message: `✅ Nahrazeno ${allFiles.length} souborů z ${repoName}`,
    type: 'success',
    duration: 3000,
  });
  closeModal();
});
```

**Proč:** Při načítání 50 souborů se spustí 50 notifikací → 50× refresh preview, 50× update UI, atd.

**Benefit:**

- Místo 50 notifikací jen 1 finální
- Aplikace se "nezasekne" při hromadných operacích
- Konzistence - všechny změny proběhnou atomicky

---

### 4. Debounce pro auto-save

**Soubor:** `src/modules/editor/Editor.js`

```javascript
constructor(container) {
  // ...

  // Debounced save function - ukládá max 1x za 300ms
  this.debouncedSaveToActiveTab = debounce(() => {
    this.saveToActiveTab();
  }, 300);

  // ...
}

handleInput() {
  const code = this.getCode();

  // ...

  // DŮLEŽITÉ: Auto-save změn do aktivního tabu (debounced)
  this.debouncedSaveToActiveTab();

  // ...
}
```

**Proč:** Každý keystroke spouští auto-save → notifikace → možné re-rendery.

**Benefit:**

- Save se provede max 1× za 300ms
- Lepší výkon při rychlém psaní
- Méně state updates

---

### 5. Guard pro preview regeneraci

**Soubor:** `src/modules/preview/Preview.js`

```javascript
constructor(container) {
  this.container = container;
  this.iframe = null;
  this.lastCode = null; // Ukládáme poslední kód pro porovnání
  this.init();
  this.setupEventListeners();
}

update(code) {
  try {
    // OCHRANA: Pokud se kód nezměnil, nepřegeneruj preview
    if (this.lastCode === code) {
      return;
    }
    this.lastCode = code;

    // ... zbytek update logiky
  }
}
```

**Proč:** Preview se někdy regeneruje i když se kód nezměnil (kvůli duplicitním eventům).

**Benefit:**

- Preview se obnoví jen když se opravdu něco změnilo
- Lepší výkon
- Méně "blikání"

---

## 📊 Výsledky

### Před úpravami:

- ❌ Event listeners se registrují vícekrát
- ❌ Načtení 50 souborů = 50× refresh všeho
- ❌ Každý keystroke = save + notifikace
- ❌ Preview se regeneruje zbytečně
- ❌ Nekonečné smyčky při složitých operacích

### Po úpravách:

- ✅ Duplicitní handlers jsou automaticky ignorovány (+ console warning)
- ✅ Načtení 50 souborů = 1× finální update
- ✅ Save max 1× za 300ms
- ✅ Preview jen při změně kódu
- ✅ Atomické batch operace

---

## 🧪 Testování

1. **Otevři konzoli** (F12)
2. **Načti GitHub repo** s mnoha soubory
3. **Zkontroluj:**
   - Neměly by se objevit duplicitní warning messages
   - Aplikace by se neměla "zasekávat"
   - Preview by měl refresh jen jednou na konci

---

## 🔍 Debug tipy

### Jak zjistit duplicitní handlers:

```javascript
// V konzoli:
console.log('EventBus listeners:', eventBus.listeners);
console.log('State subscribers:', state.subscribers);
```

### Sleduj batch mode:

```javascript
// V src/core/state.js přidej do batch():
console.log('🔄 Batch mode START');
// ...
console.log('✅ Batch mode END - processed', uniquePaths.size, 'updates');
```

### Sleduj preview updates:

```javascript
// V Preview.update() přidej:
console.log('🖼️ Preview update:', code.substring(0, 50) + '...');
```

---

## 🚀 Další kroky

### Možná vylepšení:

1. **Lifecycle management** - Přidat cleanup metody do modulů
2. **Request cancellation** - Zrušit předchozí request při novém
3. **Memoization** - Cache výsledků složitých operací
4. **Virtual scrolling** - Pro velké seznamy souborů
5. **Web Workers** - Těžké operace mimo main thread

### Monitoring:

- Přidat metriky kolikrát se spustil batch
- Počet ignorovaných duplicitních handlers
- Čas stráený v různých operacích
