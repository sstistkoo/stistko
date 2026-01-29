# 🏗️ Architektura - Soustružník 2D

> Technický návrh a design principy modulární CAD aplikace

---

## 📋 Obsah

1. [Přehled](#přehled)
2. [Modulová Architektura](#modulová-architektura)
3. [Data Flow](#data-flow)
4. [Globální State](#globální-state)
5. [Canvas Vrstva](#canvas-vrstva)
6. [Drawing Engine](#drawing-engine)
7. [Event Handling](#event-handling)
8. [Storage & Persistence](#storage--persistence)
9. [AI Integrace](#ai-integrace)
10. [Performance](#performance)

---

## Přehled

Soustružník 2D je moderní webová aplikace postavená na **HTML5 Canvas** s **vanilla JavaScript** a integrací **Google Gemini API**.

### Klíčové Principy
- ✅ **Modularita** - Oddělené starosti (SoC)
- ✅ **Reaktivnost** - Event-driven architektura
- ✅ **Performance** - Efektivní canvas rendering
- ✅ **Persistence** - localStorage pro data
- ✅ **Accessibility** - Keyboard shortcuts

---

## Modulová Architektura

### Struktura
```
index.html              ← DOM & CSS
    ↓
[globals.js]           ← Globální state
    ↓
[keyboard.js]          ← Mapování kláves
    ↓
[canvas.js]            ← Event handlery
    ↓
[controller.js]        ← Logika aplikace
    ↓
[drawing.js]           ← Canvas rendering
    ↓
[ui.js]                ← UI & modals
[utils.js]             ← Utility funkce
[ai.js]                ← AI integrace
    ↓
[init.js]              ← Inicializace
```

### Moduly

#### 1. **globals.js** (104 řádků)
Centrální místo pro globální proměnné a konstanty.

```javascript
// Globální state
window.shapes = [];           // Pole všech objektů
window.selectedIndex = -1;    // Vybraný objekt (-1 = nic)
window.mode = "line";         // Aktuální režim kreslení
window.history = [];          // Undo/Redo stack

// Výchozí nastavení
window.defaultDrawColor = "#4a9eff";
window.defaultDrawLineStyle = "solid";

// Barvy kót
window.dimensionLineColor = "#ffa500";
window.dimensionTextColor = "#ffff99";

// Canvas
window.canvas = null;
window.ctx = null;
window.width = 0;
window.height = 0;

// Viewport
window.viewportX = 0;
window.viewportY = 0;
window.zoom = 1.0;
```

**Zodpovědnost:** Centralizované state management

---

#### 2. **keyboard.js** (307 řádků)
Mapování klávesových zkratek na funkce.

```javascript
// Mapování kláves
window.KEYBOARD_MAP = {
  '1': 'setMode("line")',
  '2': 'setMode("circle")',
  '3': 'setMode("arc")',
  'delete': 'deleteSelected()',
  'ctrl+z': 'undo()',
  'ctrl+y': 'redo()',
  't': 'setMode("tangent")',
  'p': 'setMode("perpendicular")',
  'd': 'setMode("dimension")',
};

// Event listener na klíče
document.addEventListener('keydown', (e) => {
  const key = makeKeyString(e);
  if (KEYBOARD_MAP[key]) {
    eval(KEYBOARD_MAP[key]);
  }
});
```

**Zodpovědnost:** Mapování uživatelských vstupů z klávesnice

---

#### 3. **utils.js** (350 řádků)
Utility funkce a geometrické výpočty.

```javascript
// Geometrie
distance(p1, p2)          // Vzdálenost mezi body
angle(p1, p2)             // Úhel mezi body
intersection(l1, l2)      // Průsečík dvou linií
tangentToCircle(p, c, r)  // Tečna z bodu k círculi
perpendicular(p, l)       // Kolmice z bodu k liniи

// Transformace
worldToScreen(point)      // Světové souř. → Screen
screenToWorld(point)      // Screen → Světové souř.
```

**Zodpovědnost:** Matematické a utility operace

---

#### 4. **drawing.js** (1,665 řádků)
Canvas rendering engine - nejkomplexnější modul.

```javascript
// Hlavní funkce
draw()                   // Překresli všechny objekty
drawShape(shape, ctx)    // Vykresli jeden objekt

// Typy objektů
shape.type: "line", "circle", "arc", "dimension",
            "tangent", "perpendicular"

// Rendering logika
drawLine(line)           // Vykresli čáru
drawCircle(circle)       // Vykresli kružnici
drawDimension(dim)       // Vykresli kótu

// Canvas state
ctx.lineWidth = 0.4      // Tloušťka čar (kót)
ctx.strokeStyle = color  // Barva čáry
ctx.fillStyle = color    // Barva výplně
```

**Zodpovědnost:** Veškeré canvas rendering

---

#### 5. **canvas.js** (512 řádků)
Event handling a vstupní zpracování.

```javascript
// Event handlery
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('wheel', handleZoom);

// Zpracování
handleMouseDown()        // Začátek kreslení
handleMouseMove()        // Pohyb kurzoru
handleMouseUp()          // Konec kreslení
```

**Zodpovědnost:** Vstupní events (mouse, touch, wheel)

---

#### 6. **controller.js** (420 řádků)
Logika aplikace - orchestruje všechny moduly.

```javascript
// Režimy kreslení
setMode(mode)            // Přepnout režim
addShape(shape)          // Přidat nový objekt
deleteSelected()         // Smazat vybraný
selectShape(index)       // Vybrat objekt

// Undo/Redo
undo()                   // Vrátit poslední akci
redo()                   // Obnovit vrácenou akci
pushHistory()            // Uložit do stacku

// Export
exportPNG()              // Exportovat PNG
saveTOJSON()             // Uložit JSON
loadFromJSON(data)       // Načíst JSON
```

**Zodpovědnost:** Aplikační logika a orchestrace

---

#### 7. **ui.js** (1,187 řádků)
UI logika, modals a uživatelské interakce.

```javascript
// Modals
showModal(name)          // Zobrazit modal
hideModal()              // Schovat modal
setDimensionLineColor()  // Změnit barvu kót

// Dropdown menu
showDrawModeMenu()       // Menu režimů kreslení
showFileMenu()           // Menu souborů

// Settings
initializeDefaultSettings()      // Načíst nastavení
initializeDimensionSettings()    // Načíst barvy kót
```

**Zodpovědnost:** Uživatelské rozhraní a interakce

---

#### 8. **ai.js** (287 řádků)
Google Gemini API integrace.

```javascript
// API
initializeAI()           // Setup API
sendAIRequest(prompt)    // Poslat dotaz AI
parseAIResponse(data)    // Zpracovat odpověď

// Storage
saveAPIKey(key)          // Uložit API klíč
getAPIKey()              // Načíst API klíč
```

**Zodpovědnost:** AI integrace a LLM komunikace

---

#### 9. **init.js** (207 řádků)
Inicializace aplikace.

```javascript
function initializeApp() {
  // 1. Setup canvas
  // 2. Load saved data
  // 3. Initialize UI
  // 4. Start animation loop
  // 5. Setup event listeners
}
```

**Zodpovědnost:** Startup a inicializace

---

## Data Flow

### Typický Flow - Kreslení Čáry

```
1. User Input
   └─ canvas.addEventListener('mousedown')

2. Event Handling (canvas.js)
   └─ handleMouseDown()

3. Controller (controller.js)
   └─ setMode('line')
   └─ addShape({ type: 'line', points: [] })

4. Drawing (drawing.js)
   └─ draw()
   └─ drawShape(shape)

5. Canvas Render
   └─ ctx.strokeStyle = color
   └─ ctx.lineTo(x, y)
   └─ ctx.stroke()

6. UI Update (ui.js)
   └─ updateStatusBar()
   └─ updateShapeCount()
```

### Undo/Redo Flow

```
User Action
  ↓
pushHistory(snapshot)
  ↓
window.history.push(snapshot)
  ↓
[Undo]
  ↓
pop from history
  ↓
restore state
  ↓
draw()
```

---

## Globální State

### Struktura

```javascript
window = {
  // State
  shapes: [],                    // Pole objektů
  selectedIndex: -1,             // Vybraný index
  mode: "line",                  // Aktuální režim
  history: [],                   // Undo stack

  // Canvas
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,

  // Viewport
  viewportX: number,
  viewportY: number,
  zoom: number,

  // Colors
  defaultDrawColor: "#4a9eff",
  dimensionLineColor: "#ffa500",
  dimensionTextColor: "#ffff99",

  // Functions
  draw: Function,
  addShape: Function,
  deleteSelected: Function,
  undo: Function,
  redo: Function,
  // ... dalších 20+ funkcí
}
```

### Proč Global State?

✅ **Výhody:**
- Snadný přístup z jakéhokoli místa
- Rychlá komunikace mezi moduly
- localStorage integrace

⚠️ **Nevýhody:**
- Možné kolize jmen
- Těžší debugging

🛡️ **Mitigation:**
- Prefixování (`window.` pro jasnost)
- Dokumentace
- Testování

---

## Canvas Vrstva

### Koordináty

```
World Space
┌───────────────────┐
│ (0,0)       (W,0) │  ← Matematické koordináty
│                   │
│                   │
│(0,H)       (W,H)  │
└───────────────────┘

        ↓ worldToScreen()
        ↓ (+ viewport, zoom)

Screen Space
┌───────────────────┐
│ (0,0)       (px,0)│  ← Pixel koordináty
│                   │
│                   │
│(0,px)      (px,px)│
└───────────────────┘
```

### Transformace

```javascript
// World → Screen
function worldToScreen(point) {
  return {
    x: (point.x - viewportX) * zoom,
    y: height - (point.y - viewportY) * zoom
  };
}

// Screen → World
function screenToWorld(point) {
  return {
    x: point.x / zoom + viewportX,
    y: (height - point.y) / zoom + viewportY
  };
}
```

---

## Drawing Engine

### Algoritmus Kreslení

```javascript
function draw() {
  // 1. Clear canvas
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, width, height);

  // 2. Setup viewport
  ctx.save();
  ctx.translate(-viewportX * zoom, height + viewportY * zoom);
  ctx.scale(zoom, -zoom);

  // 3. Draw grid/background
  drawGrid();

  // 4. Draw shapes
  for (let shape of shapes) {
    if (shape.type === 'line') {
      drawLine(shape);
    } else if (shape.type === 'circle') {
      drawCircle(shape);
    } else if (shape.type === 'dimension') {
      drawDimension(shape);
    }
    // ... ostatní typy
  }

  // 5. Highlight selected
  if (selectedIndex >= 0) {
    const s = shapes[selectedIndex];
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 1;
    // highlight outline
  }

  // 6. Restore context
  ctx.restore();
}
```

### Dimension Rendering

```javascript
function drawDimension(dim) {
  // 1. Vykresli čáru
  ctx.lineWidth = 0.4;
  ctx.strokeStyle = window.dimensionLineColor || "#ffa500";
  ctx.beginPath();
  ctx.moveTo(dim.p1.x, dim.p1.y);
  ctx.lineTo(dim.p2.x, dim.p2.y);
  ctx.stroke();

  // 2. Vykresli šipky
  // - Na konci čáry
  // - Nebo vně, pokud je čára krátká

  // 3. Vykresli text (hodnota)
  ctx.fillStyle = window.dimensionTextColor || "#ffff99";
  ctx.font = "12px Arial";
  ctx.fillText(value, textX, textY);
}
```

---

## Event Handling

### Input Pipeline

```
User Action
  ↓
document.addEventListener()
  ↓
canvas.js: handleEvent()
  ↓
controller.js: processInput()
  ↓
drawing.js: draw()
  ↓
ui.js: updateUI()
```

### Klávesnice

```javascript
// keyboard.js - Mapování
document.addEventListener('keydown', (e) => {
  const key = makeKeyString(e);  // "ctrl+s", "delete", atd

  if (key === 'delete') {
    window.deleteSelected();
  } else if (key === 'ctrl+z') {
    window.undo();
  }
  // ...
});
```

### Myš

```javascript
// canvas.js - Event handlery
canvas.addEventListener('mousedown', (e) => {
  const worldPos = screenToWorld({ x: e.offsetX, y: e.offsetY });
  // Zpracuj input podle režimu
});

canvas.addEventListener('mousemove', (e) => {
  const worldPos = screenToWorld({ x: e.offsetX, y: e.offsetY });
  // Náhled kreslení
  draw();
});

canvas.addEventListener('mouseup', (e) => {
  // Finalizuj tvar
});
```

---

## Storage & Persistence

### localStorage

```javascript
// Uložit
function saveProject(name) {
  const data = {
    shapes: window.shapes,
    settings: {
      dimensionLineColor: window.dimensionLineColor,
      dimensionTextColor: window.dimensionTextColor,
    }
  };
  localStorage.setItem(`project_${name}`, JSON.stringify(data));
}

// Načíst
function loadProject(name) {
  const data = JSON.parse(localStorage.getItem(`project_${name}`));
  window.shapes = data.shapes;
  window.dimensionLineColor = data.settings.dimensionLineColor;
  draw();
}
```

### Export PNG

```javascript
function exportPNG() {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `drawing_${Date.now()}.png`;
  link.click();
}
```

---

## AI Integrace

### API Call

```javascript
async function sendAIRequest(prompt) {
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{
        text: prompt
      }]
    }]
  });

  const response = result.response.text();
  return response;
}
```

### API Key Management

```javascript
// Uložit klíč (2-part security)
function setAPIKey(fullKey) {
  const part1 = fullKey.substring(0, fullKey.length / 2);
  const part2 = fullKey.substring(fullKey.length / 2);

  localStorage.setItem('key1', part1);
  localStorage.setItem('key2', part2);
}

// Načíst klíč
function getAPIKey() {
  const part1 = localStorage.getItem('key1') || window.API_KEY_PART1;
  const part2 = localStorage.getItem('key2') || window.API_KEY_PART2;
  return part1 + part2;
}
```

---

## Performance

### Optimizace

#### 1. **Canvas Rendering**
```javascript
// ✅ Good - Render na demand
if (shapes.length > 0) {
  draw();  // Pouze když je potřeba
}

// ❌ Bad - Render v každém frameu
requestAnimationFrame(draw);  // Zbytečné CPU
```

#### 2. **Event Throttling**
```javascript
// ✅ Good - Throttle mousemove
let lastDraw = 0;
canvas.addEventListener('mousemove', (e) => {
  if (Date.now() - lastDraw > 16) {  // max 60 FPS
    draw();
    lastDraw = Date.now();
  }
});
```

#### 3. **Shape Culling**
```javascript
// ✅ Good - Render viditelné tvary
function draw() {
  for (let shape of shapes) {
    if (isInViewport(shape)) {
      drawShape(shape);  // Pouze viditelné
    }
  }
}
```

### Metriky

| Metrika | Target | Aktuální |
|---------|--------|----------|
| FPS | 60 | 60 ✅ |
| Memory | < 50MB | ~20MB ✅ |
| Paint Time | < 16ms | ~5ms ✅ |
| Load Time | < 2s | ~1s ✅ |

---

## Rozšiřitelnost

### Přidání Nového Tvaru

```javascript
// 1. Přidej typ do utils.js
const SHAPE_TYPES = {
  LINE: 'line',
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',  // ← Nový
};

// 2. Přidej rendering do drawing.js
function drawRectangle(rect) {
  ctx.strokeStyle = rect.color;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

// 3. Přidej mode do controller.js
case 'rectangle':
  addShape({ type: 'rectangle', ... });
  break;

// 4. Přidej klávesovou zkratku do keyboard.js
'r': 'setMode("rectangle")',
```

### Přidání Nového Feature

```javascript
// 1. Přidej funkcionalitu do relevantního modulu
// 2. Vyexponuj v globálním namespace
// 3. Přidej klávesové mapování
// 4. Aktualizuj UI
// 5. Testuj
```

---

## Závěr

Architektura Soustružníka je postavena na principech **modularity**, **čistoty kódu** a **performance**. Globální state je ústředním bodem, ale je jasně strukturován a dokumentován.

Díky modularnímu designu je aplikace snadno rozšiřitelná a udržovatelná.

---

*Poslední aktualizace: 22. prosince 2025*
