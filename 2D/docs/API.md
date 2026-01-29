# 📖 API Reference - Soustružník 2D

> Kompletní dokumentace všech veřejných funkcí a objektů

---

## 📋 Obsah

1. [Globals](#globals) - Globální proměnné
2. [Canvas API](#canvas-api) - Kreslení a viewport
3. [Shape API](#shape-api) - Práce s objekty
4. [Controller API](#controller-api) - Logika aplikace
5. [UI API](#ui-api) - Uživatelské rozhraní
6. [AI API](#ai-api) - Gemini integrace
7. [Storage API](#storage-api) - Persistence
8. [Utils API](#utils-api) - Utility funkce
9. [Events](#events) - Dostupné eventy

---

## Globals

Global state a konstanty dostupné přes `window` objekt.

### State Variables

#### `window.shapes`
```javascript
Type: Array<Shape>
Default: []

// Shape object
{
  id: string,              // Unikátní ID
  type: 'line' | 'circle' | 'arc' | 'dimension' | 'tangent' | 'perpendicular',
  color: string,           // Hex barva #rrggbb
  lineStyle: 'solid' | 'dashed' | 'dotted',
  lineWidth: number,       // Tloušťka čáry
  points: Array<{x, y}>,   // Body tvaru
  // type-specific properties
}
```

#### `window.selectedIndex`
```javascript
Type: number
Default: -1

// -1 = žádný tvar vybraný
// >= 0 = index vybraného tvaru v window.shapes
```

#### `window.mode`
```javascript
Type: string
Default: 'line'

Possible Values:
  'line'          - Kreslení čáry
  'circle'        - Kreslení kružnice
  'arc'           - Kreslení oblouku
  'dimension'     - Přidání kóty
  'tangent'       - Tečna
  'perpendicular' - Kolmice
  'select'        - Výběr objektu
  'pan'           - Posun plátna
```

#### `window.history`
```javascript
Type: Array<any>
Default: []

// Undo/Redo stack
// Ukládá snapshot stavu
```

### Canvas Variables

#### `window.canvas`
```javascript
Type: HTMLCanvasElement

// HTML canvas element
canvas.width     // Šířka v pixelech
canvas.height    // Výška v pixelech
```

#### `window.ctx`
```javascript
Type: CanvasRenderingContext2D

// 2D rendering context
// Používá se pro kreslení
```

### Viewport Variables

#### `window.viewportX` / `window.viewportY`
```javascript
Type: number
Default: 0

// Aktuální pozice viewportu ve světových souřadnicích
// Umožňuje pan a zoom
```

#### `window.zoom`
```javascript
Type: number
Default: 1.0

// Úroveň zoomu
// > 1.0 : zoom in
// < 1.0 : zoom out
```

### Color Settings

#### `window.defaultDrawColor`
```javascript
Type: string
Default: '#4a9eff'

// Barva nových tvarů
```

#### `window.dimensionLineColor`
```javascript
Type: string
Default: '#ffa500'

// Barva čar kót
```

#### `window.dimensionTextColor`
```javascript
Type: string
Default: '#ffff99'

// Barva textu kót
```

---

## Canvas API

Canvas rendering a transformace souřadnic.

### Drawing Functions

#### `window.draw()`
```javascript
Signature: () => void

// Překresli všechny objekty na plátně
// Volá se automaticky po každé změně

Example:
  window.shapes.push(newShape);
  window.draw();  // Aktualizuj display
```

#### `window.drawShape(shape, ctx)`
```javascript
Signature: (shape: Shape, ctx: CanvasRenderingContext2D) => void

// Vykresli jediný tvar
// Vnitřní funkce, obvykle se nepoužívá přímo

Example:
  window.drawShape(window.shapes[0], window.ctx);
```

### Viewport Functions

#### `window.resetView()`
```javascript
Signature: () => void

// Zobrazit všechny objekty
// Fit All - přizpůsobit zoom a pan

Example:
  window.resetView();  // "Fit All" tlačítko
```

#### `window.togglePan()`
```javascript
Signature: () => void

// Zapnout/vypnout režim posunu
// Hold Shift by měl fungovat taky

Example:
  window.togglePan();  // Přepnout mode na 'pan'
```

### Coordinate Transformation

#### `window.worldToScreen(point)`
```javascript
Signature: (point: {x: number, y: number}) => {x: number, y: number}

// Transformace ze světových souřadnic na screen
// Bere v úvahu viewport a zoom

Params:
  point: Bod ve světových souřadnicích

Returns:
  Bod v screen pixelech

Example:
  const screenPos = window.worldToScreen({x: 100, y: 200});
  console.log(screenPos.x, screenPos.y);  // Pixel pozice
```

#### `window.screenToWorld(point)`
```javascript
Signature: (point: {x: number, y: number}) => {x: number, y: number}

// Transformace ze screen pixelů na světové souřadnice
// Inverzní funkce k worldToScreen

Params:
  point: Bod v screen souřadnicích (obvykle mouse event)

Returns:
  Bod ve světových souřadnicích

Example:
  const worldPos = window.screenToWorld({
    x: event.clientX,
    y: event.clientY
  });
  console.log(worldPos);  // Světové souřadnice
```

---

## Shape API

Práce s geometrickými objekty.

### Shape Object

```javascript
// Obecný tvar
{
  id: string,
  type: string,
  color: string,
  lineStyle: string,
  lineWidth: number,
  points: Array<{x, y}>,
  // ... type-specific
}
```

### Shape Types

#### Line
```javascript
{
  type: 'line',
  p1: {x, y},      // Počátek
  p2: {x, y},      // Konec
  color: string,
  lineWidth: number
}
```

#### Circle
```javascript
{
  type: 'circle',
  center: {x, y},  // Střed
  radius: number,  // Poloměr
  color: string,
  lineWidth: number
}
```

#### Arc
```javascript
{
  type: 'arc',
  center: {x, y},
  radius: number,
  startAngle: number,  // V radiánech
  endAngle: number,
  color: string
}
```

#### Dimension
```javascript
{
  type: 'dimension',
  dimType: 'linear' | 'radius' | 'center' | 'rectWidth' | 'rectHeight',
  p1: {x, y},
  p2: {x, y},
  value: number,         // Měřená hodnota
  lineColor: string,
  textColor: string
}
```

### Creating Shapes

#### `window.addShape(shape)`
```javascript
Signature: (shape: Shape) => void

// Přidej nový tvar do plátna
// Automaticky překresli

Params:
  shape: Shape object

Example:
  window.addShape({
    type: 'line',
    p1: {x: 0, y: 0},
    p2: {x: 100, y: 100},
    color: '#4a9eff',
    lineWidth: 2
  });
```

#### `window.selectShape(index)`
```javascript
Signature: (index: number) => void

// Vyber tvar podle indexu
// Aktivuje výběr pro mazání/editaci

Params:
  index: Index v window.shapes (-1 = deselect)

Example:
  window.selectShape(0);   // Vyber první tvar
  window.selectShape(-1);  // Zrušit výběr
```

#### `window.deleteSelected()`
```javascript
Signature: () => void

// Smaž aktuálně vybraný tvar
// Také uloží do history (pro undo)

Example:
  window.selectShape(0);
  window.deleteSelected();  // Smaž první tvar
```

---

## Controller API

Aplikační logika a správa stavů.

### Mode Management

#### `window.setMode(mode)`
```javascript
Signature: (mode: string) => void

// Změní aktuální režim kreslení
// Automaticky zobrazí nápovědu

Params:
  mode: 'line' | 'circle' | 'arc' | 'tangent' | ...

Example:
  window.setMode('line');      // Režim čáry
  window.setMode('circle');    // Režim kružnice
  window.setMode('dimension'); // Režim kóty
```

### History Management

#### `window.undo()`
```javascript
Signature: () => void

// Vrátit poslední akci
// Klávesa: Ctrl+Z

Example:
  window.undo();  // Vrátit poslední operaci
```

#### `window.redo()`
```javascript
Signature: () => void

// Obnovit vrácené akci
// Klávesa: Ctrl+Y

Example:
  window.redo();  // Obnovit vrácené
```

#### `window.pushHistory(snapshot)`
```javascript
Signature: (snapshot: any) => void

// Přidej snapshot do undo stacku
// Volá se automaticky

Params:
  snapshot: Current state to save

Example:
  window.pushHistory({
    shapes: JSON.parse(JSON.stringify(window.shapes)),
    selectedIndex: window.selectedIndex
  });
```

### Export Functions

#### `window.exportPNG()`
```javascript
Signature: () => void

// Exportuj kreslení jako PNG
// Stáhne se do Downloads

Example:
  window.exportPNG();
  // → drawing_1703274480000.png (v Downloads)
```

#### `window.saveToJSON()`
```javascript
Signature: () => void

// Exportuj projekt jako JSON
// Stáhne se do Downloads

Example:
  window.saveToJSON();
  // → project_1703274480000.json
```

#### `window.loadFromJSON(data)`
```javascript
Signature: (data: any) => void

// Načti projekt z JSON objektu
// Přepíše aktuální stav

Params:
  data: Project JSON data

Example:
  const json = {
    shapes: [...],
    settings: {...}
  };
  window.loadFromJSON(json);
```

---

## UI API

Uživatelské rozhraní a modals.

### Modal Functions

#### `window.showModal(name)`
```javascript
Signature: (name: string) => void

// Zobrazit modal dialog
// Možné modaly: 'about', 'settings', 'help', 'ai'

Params:
  name: Modal identifier

Example:
  window.showModal('settings');
  window.showModal('about');
```

#### `window.hideModal()`
```javascript
Signature: () => void

// Schovat aktuální modal

Example:
  window.hideModal();
```

### Color Settings

#### `window.setDimensionLineColor(color)`
```javascript
Signature: (color: string) => void

// Změnit barvu čar kót
// Barva se uloží do localStorage

Params:
  color: Hex barva (#rrggbb)

Example:
  window.setDimensionLineColor('#ff0000');  // Červená
  window.setDimensionLineColor('#00ff00');  // Zelená
```

#### `window.setDimensionTextColor(color)`
```javascript
Signature: (color: string) => void

// Změnit barvu textu kót
// Barva se uloží do localStorage

Params:
  color: Hex barva (#rrggbb)

Example:
  window.setDimensionTextColor('#ffffff');  // Bílá
```

### Settings Management

#### `window.initializeDefaultSettings()`
```javascript
Signature: () => void

// Načti nastavení barev z localStorage
// Volá se automaticky při startu

Example:
  window.initializeDefaultSettings();
```

#### `window.initializeDimensionSettings()`
```javascript
Signature: () => void

// Načti nastavení kót z localStorage
// Volá se automaticky při startu

Example:
  window.initializeDimensionSettings();
```

---

## AI API

Google Gemini API integrace.

### API Management

#### `window.initializeAI()`
```javascript
Signature: () => void

// Inicializuj AI s API klíčem
// Klíč se načte z localStorage nebo embedded

Example:
  window.initializeAI();
```

#### `window.setAPIKey(key)`
```javascript
Signature: (key: string) => void

// Nastav vlastní Gemini API klíč
// Klíč se uloží do localStorage (2-part security)

Params:
  key: Full Google Gemini API key

Example:
  window.setAPIKey('AIzaSyD...');
```

#### `window.getAPIKey()`
```javascript
Signature: () => string

// Získej aktuální API klíč
// Vrací embedded key pokud není vlastní klíč

Returns:
  Aktuální API klíč

Example:
  const key = window.getAPIKey();
  console.log(key.substring(0, 10));  // AIzaSyD...
```

### Chat Functions

#### `window.sendAIRequest(prompt)`
```javascript
Signature: async (prompt: string) => Promise<string>

// Pošli zprávu AI a čekej odpověď
// Používá Gemini 1.5 Flash model

Params:
  prompt: Uživatelská zpráva

Returns:
  Promise<string> - AI odpověď

Example:
  const response = await window.sendAIRequest(
    'Jak nakreslit pravidelný šestiúhelník?'
  );
  console.log(response);
```

---

## Storage API

Persistence a data management.

### Project Storage

#### `window.saveProject(name)`
```javascript
Signature: (name: string) => void

// Ulož projekt do localStorage
// JSON formát

Params:
  name: Projekt název (bez .json)

Example:
  window.saveProject('my-design');
```

#### `window.loadProject(name)`
```javascript
Signature: (name: string) => void

// Načti projekt z localStorage
// Přepíše aktuální stav

Params:
  name: Projekt název

Example:
  window.loadProject('my-design');
```

#### `window.listProjects()`
```javascript
Signature: () => Array<string>

// Vrátí seznam všech uložených projektů

Returns:
  Array projektů

Example:
  const projects = window.listProjects();
  console.log(projects);  // ['project1', 'project2']
```

### Local Storage Keys

```javascript
// Settings
'defaultDrawColor'        // Barva nových tvarů
'defaultDrawLineStyle'    // Styl čar
'dimensionLineColor'      // Barva kót
'dimensionTextColor'      // Barva textu kót

// API
'soustruznik_api_keys'    // Pole API klíčů
'key1', 'key2'            // 2-part API klíč

// Projects
'project_<name>'          // Uložený projekt
```

---

## Utils API

Utility funkce a geometrické výpočty.

### Geometry Functions

#### `window.distance(p1, p2)`
```javascript
Signature: (p1: {x, y}, p2: {x, y}) => number

// Vypočti vzdálenost mezi dvěma body
// Používá Pythagoras

Params:
  p1, p2: Body

Returns:
  Vzdálenost (číslo)

Example:
  const d = window.distance({x: 0, y: 0}, {x: 3, y: 4});
  console.log(d);  // 5
```

#### `window.angle(p1, p2)`
```javascript
Signature: (p1: {x, y}, p2: {x, y}) => number

// Vypočti úhel mezi dvěma body
// Vrací radiány (-π to π)

Params:
  p1: Počátek
  p2: Konec

Returns:
  Úhel v radiánech

Example:
  const a = window.angle({x: 0, y: 0}, {x: 1, y: 1});
  console.log(a * 180 / Math.PI);  // 45 stupňů
```

#### `window.intersection(line1, line2)`
```javascript
Signature: (line1: {p1, p2}, line2: {p1, p2}) => {x, y} | null

// Najdi průsečík dvou linií
// Vrací null pokud se neprotínají

Params:
  line1: Linie 1 ({p1, p2})
  line2: Linie 2 ({p1, p2})

Returns:
  Bod {x, y} nebo null

Example:
  const inter = window.intersection(
    {p1: {x: 0, y: 0}, p2: {x: 10, y: 10}},
    {p1: {x: 0, y: 10}, p2: {x: 10, y: 0}}
  );
  console.log(inter);  // {x: 5, y: 5}
```

#### `window.tangentToCircle(p, center, radius)`
```javascript
Signature: (p: {x, y}, center: {x, y}, radius: number) => Array<{x, y}>

// Najdi tečny z bodu k círculi
// Vrací max. 2 body (tečné body na círculi)

Params:
  p: Bod vně círculi
  center: Střed círculi
  radius: Poloměr

Returns:
  Array bodů na círculi

Example:
  const tangents = window.tangentToCircle(
    {x: 0, y: 0},
    {x: 10, y: 0},
    5
  );
```

---

## Events

Dostupné eventos a hooky.

### Canvas Events

```javascript
// Vlastní events (volné hooky)
window.addEventListener('shapeAdded', (e) => {
  console.log('Nový tvar:', e.detail.shape);
});

window.addEventListener('shapeDeleted', (e) => {
  console.log('Smazaný tvar:', e.detail.index);
});

window.addEventListener('modeChanged', (e) => {
  console.log('Nový režim:', e.detail.mode);
});

window.addEventListener('shapeSelected', (e) => {
  console.log('Vybraný tvar:', e.detail.index);
});
```

### Browser Events

```javascript
// Klávesnica - keyboard.js handlery
document.addEventListener('keydown', (e) => {
  // Implementováno v keyboard.js
});

// Myš - canvas.js handlery
canvas.addEventListener('mousedown', (e) => {
  // Implementováno v canvas.js
});

canvas.addEventListener('mousemove', (e) => {
  // Implementováno v canvas.js
});

canvas.addEventListener('mouseup', (e) => {
  // Implementováno v canvas.js
});

canvas.addEventListener('wheel', (e) => {
  // Zoom - implementováno v canvas.js
});
```

---

## Type Definitions

```typescript
// Point
type Point = {
  x: number,
  y: number
}

// Shape
type Shape = {
  id: string,
  type: 'line' | 'circle' | 'arc' | 'dimension' | 'tangent' | 'perpendicular',
  color: string,
  lineStyle: 'solid' | 'dashed' | 'dotted',
  lineWidth: number,
  points: Point[]
}

// Line (extends Shape)
type Line = Shape & {
  p1: Point,
  p2: Point
}

// Circle (extends Shape)
type Circle = Shape & {
  center: Point,
  radius: number
}

// Dimension (extends Shape)
type Dimension = Shape & {
  dimType: 'linear' | 'radius' | 'center' | 'rectWidth' | 'rectHeight',
  p1: Point,
  p2: Point,
  value: number,
  lineColor: string,
  textColor: string
}
```

---

## Code Examples

### Příklad 1: Nakreslit čáru programově

```javascript
window.addShape({
  type: 'line',
  p1: {x: 0, y: 0},
  p2: {x: 100, y: 100},
  color: '#4a9eff',
  lineWidth: 2
});
window.draw();
```

### Příklad 2: Změnit barvu všech tvárů

```javascript
for (let shape of window.shapes) {
  shape.color = '#ff0000';  // Červená
}
window.draw();
```

### Příklad 3: Najít průsečík a přidat bod

```javascript
const inter = window.intersection(
  {p1: window.shapes[0].p1, p2: window.shapes[0].p2},
  {p1: window.shapes[1].p1, p2: window.shapes[1].p2}
);

if (inter) {
  window.addShape({
    type: 'line',
    p1: inter,
    p2: {x: inter.x + 10, y: inter.y},
    color: '#00ff00'
  });
}
```

### Příklad 4: Chat s AI

```javascript
async function askAI() {
  const response = await window.sendAIRequest(
    'Nakresli mi návod na tečnu k círculi'
  );
  console.log(response);
  alert(response);
}
```

---

*Poslední aktualizace: 22. prosince 2025*
