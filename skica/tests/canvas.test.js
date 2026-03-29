// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Testy: canvas.js (transformace, snap, autoCenter)  ║
// ╚══════════════════════════════════════════════════════════════╝

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Nastavit DOM globály PŘED importem modulů (canvas.js přistupuje k DOM na úrovni modulu)
const { mockCanvas } = vi.hoisted(() => {
  const mockCanvas = { width: 800, height: 600, getContext: () => ({}) };
  const mockWrap = { clientWidth: 800, clientHeight: 600 };
  const mockStatusZoom = { textContent: '' };

  const mockEl = () => ({
    disabled: false, textContent: '', innerHTML: '',
    classList: { toggle: () => {}, add: () => {}, remove: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    style: {},
  });

  globalThis.document = {
    getElementById: (id) => {
      if (id === 'drawCanvas') return mockCanvas;
      if (id === 'canvasWrap') return mockWrap;
      if (id === 'statusZoom') return mockStatusZoom;
      return mockEl();
    },
    createElement: () => {
      const el = mockEl();
      el.className = '';
      return el;
    },
    body: { appendChild: () => {} },
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  globalThis.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: { vibrate: () => {} },
    writable: true,
    configurable: true,
  });

  return { mockCanvas };
});

vi.mock('../js/render.js', () => ({
  renderAll: vi.fn(),
}));

import { state } from '../js/state.js';
import { worldToScreen, screenToWorld, snapPt, autoCenterView } from '../js/canvas.js';

// ════════════════════════════════════════
// ── worldToScreen ──
// ════════════════════════════════════════
describe('worldToScreen', () => {
  beforeEach(() => {
    state.zoom = 1;
    state.panX = 400;
    state.panY = 300;
  });

  it('počátek world → střed canvasu (s výchozím pan)', () => {
    const [sx, sy] = worldToScreen(0, 0);
    expect(sx).toBe(400);
    expect(sy).toBe(300);
  });

  it('kladný world X → posun doprava na obrazovce', () => {
    const [sx, sy] = worldToScreen(10, 0);
    expect(sx).toBe(410);
    expect(sy).toBe(300);
  });

  it('kladný world Y → posun nahoru na obrazovce (záporné sy)', () => {
    const [sx, sy] = worldToScreen(0, 10);
    expect(sx).toBe(400);
    expect(sy).toBe(290); // Y je invertované
  });

  it('zoom 2× zdvojnásobí vzdálenost na obrazovce', () => {
    state.zoom = 2;
    const [sx, sy] = worldToScreen(5, 5);
    expect(sx).toBe(410); // 5*2 + 400
    expect(sy).toBe(290); // -5*2 + 300
  });

  it('zoom 0.5× zmenší vzdálenost', () => {
    state.zoom = 0.5;
    const [sx, sy] = worldToScreen(20, 20);
    expect(sx).toBe(410); // 20*0.5 + 400
    expect(sy).toBe(290); // -20*0.5 + 300
  });

  it('záporné world souřadnice', () => {
    const [sx, sy] = worldToScreen(-10, -10);
    expect(sx).toBe(390); // -10*1 + 400
    expect(sy).toBe(310); // -(-10)*1 + 300
  });

  it('vlastní pan posun', () => {
    state.panX = 100;
    state.panY = 200;
    const [sx, sy] = worldToScreen(0, 0);
    expect(sx).toBe(100);
    expect(sy).toBe(200);
  });
});

// ════════════════════════════════════════
// ── screenToWorld ──
// ════════════════════════════════════════
describe('screenToWorld', () => {
  beforeEach(() => {
    state.zoom = 1;
    state.panX = 400;
    state.panY = 300;
  });

  it('střed canvasu → world počátek', () => {
    const [wx, wy] = screenToWorld(400, 300);
    expect(wx).toBeCloseTo(0, 10);
    expect(wy).toBeCloseTo(0, 10);
  });

  it('posun doprava → kladný world X', () => {
    const [wx, wy] = screenToWorld(410, 300);
    expect(wx).toBeCloseTo(10, 10);
    expect(wy).toBeCloseTo(0, 10);
  });

  it('posun nahoru → kladný world Y', () => {
    const [wx, wy] = screenToWorld(400, 290);
    expect(wx).toBeCloseTo(0, 10);
    expect(wy).toBeCloseTo(10, 10);
  });

  it('zoom 2× – menší world vzdálenost pro stejný screen posun', () => {
    state.zoom = 2;
    const [wx, wy] = screenToWorld(410, 290);
    expect(wx).toBeCloseTo(5, 10);
    expect(wy).toBeCloseTo(5, 10);
  });

  it('zoom 0.5× – větší world vzdálenost pro stejný screen posun', () => {
    state.zoom = 0.5;
    const [wx, wy] = screenToWorld(410, 290);
    expect(wx).toBeCloseTo(20, 10);
    expect(wy).toBeCloseTo(20, 10);
  });
});

// ════════════════════════════════════════
// ── worldToScreen / screenToWorld – inverze ──
// ════════════════════════════════════════
describe('worldToScreen ↔ screenToWorld inverze', () => {
  beforeEach(() => {
    state.zoom = 1;
    state.panX = 400;
    state.panY = 300;
  });

  it('roundtrip world→screen→world (0,0)', () => {
    const [sx, sy] = worldToScreen(0, 0);
    const [wx, wy] = screenToWorld(sx, sy);
    expect(wx).toBeCloseTo(0, 10);
    expect(wy).toBeCloseTo(0, 10);
  });

  it('roundtrip world→screen→world (15, -7)', () => {
    const [sx, sy] = worldToScreen(15, -7);
    const [wx, wy] = screenToWorld(sx, sy);
    expect(wx).toBeCloseTo(15, 10);
    expect(wy).toBeCloseTo(-7, 10);
  });

  it('roundtrip screen→world→screen (500, 200)', () => {
    const [wx, wy] = screenToWorld(500, 200);
    const [sx, sy] = worldToScreen(wx, wy);
    expect(sx).toBeCloseTo(500, 10);
    expect(sy).toBeCloseTo(200, 10);
  });

  it('roundtrip se zoom 3.5 a pan offset', () => {
    state.zoom = 3.5;
    state.panX = 123;
    state.panY = 456;
    const [sx, sy] = worldToScreen(42, -13);
    const [wx, wy] = screenToWorld(sx, sy);
    expect(wx).toBeCloseTo(42, 8);
    expect(wy).toBeCloseTo(-13, 8);
  });

  it('roundtrip se zoom 0.1 (velké oddálení)', () => {
    state.zoom = 0.1;
    const [sx, sy] = worldToScreen(100, 200);
    const [wx, wy] = screenToWorld(sx, sy);
    expect(wx).toBeCloseTo(100, 8);
    expect(wy).toBeCloseTo(200, 8);
  });
});

// ════════════════════════════════════════
// ── snapPt ──
// ════════════════════════════════════════
describe('snapPt', () => {
  beforeEach(() => {
    state.zoom = 1;
    state.panX = 400;
    state.panY = 300;
    state.objects = [];
    state.intersections = [];
    state.tempPoints = [];
    state.drawing = false;
    state.snapToPoints = true;
    state.snapToGrid = false;
    state.gridSize = 10;
    state.mouse = { x: 0, y: 0, rawX: 0, rawY: 0, sx: 0, sy: 0, snapped: false, snapType: '' };
    state.layers = [
      { id: 0, name: 'L0', color: '#fff', visible: true, locked: false },
    ];
  });

  it('vrátí snapped bod pokud je v thresholdu (objektový snap)', () => {
    state.objects = [
      { type: 'point', x: 10, y: 10, id: 1, layer: 0 },
    ];
    const [rx, ry] = snapPt(11, 11); // vzdálenost √2 ≈ 1.41 < 20
    expect(rx).toBe(10);
    expect(ry).toBe(10);
    expect(state.mouse.snapped).toBe(true);
    expect(state.mouse.snapType).toBe('point');
  });

  it('vrátí originál pokud nic v dosahu (snapToPoints zapnuto, žádné objekty)', () => {
    state.objects = [];
    const [rx, ry] = snapPt(55.5, 77.3);
    expect(rx).toBe(55.5);
    expect(ry).toBe(77.3);
    expect(state.mouse.snapped).toBe(false);
  });

  it('snap k počátku (0,0) pokud je blízko', () => {
    const [rx, ry] = snapPt(1, 1);
    expect(rx).toBe(0);
    expect(ry).toBe(0);
    expect(state.mouse.snapType).toBe('point');
  });

  it('nesnappuje k (0,0) pokud je daleko', () => {
    const [rx, ry] = snapPt(100, 100);
    expect(rx).toBe(100);
    expect(ry).toBe(100);
  });

  it('snap k středu úsečky', () => {
    state.objects = [
      { type: 'line', x1: 0, y1: 0, x2: 20, y2: 0, id: 1, layer: 0 },
    ];
    // Snap bod na (10,0) – střed úsečky
    const [rx, ry] = snapPt(10.5, 0.5);
    expect(rx).toBeCloseTo(10, 5);
    expect(ry).toBeCloseTo(0, 5);
  });

  it('snap k bodům kružnice (střed)', () => {
    state.objects = [
      { type: 'circle', cx: 50, cy: 50, r: 20, id: 1, layer: 0 },
    ];
    const [rx, ry] = snapPt(50.5, 50.5);
    expect(rx).toBeCloseTo(50, 5);
    expect(ry).toBeCloseTo(50, 5);
  });

  it('grid snap pokud je zapnutý a žádné objektové body v dosahu', () => {
    state.snapToPoints = false;
    state.snapToGrid = true;
    state.gridSize = 10;
    const [rx, ry] = snapPt(13.7, 27.2);
    expect(rx).toBe(10);
    expect(ry).toBe(30);
    expect(state.mouse.snapType).toBe('grid');
  });

  it('pokud jsou oba snapy vypnuté, vrátí originál', () => {
    state.snapToPoints = false;
    state.snapToGrid = false;
    const [rx, ry] = snapPt(13.7, 27.2);
    expect(rx).toBe(13.7);
    expect(ry).toBe(27.2);
    expect(state.mouse.snapped).toBe(false);
  });

  it('snap k průsečíku má prioritu (při shodné vzdálenosti)', () => {
    state.objects = [
      { type: 'point', x: 10, y: 10, id: 1, layer: 0 },
    ];
    state.intersections = [{ x: 10, y: 10 }];
    const [rx, ry] = snapPt(10.5, 10.5);
    // Průsečík vyhraje (d <= objD)
    expect(rx).toBe(10);
    expect(ry).toBe(10);
  });

  it('snap k tempPoints při kreslení', () => {
    state.drawing = true;
    state.tempPoints = [{ x: 30, y: 30 }];
    const [rx, ry] = snapPt(30.5, 30.5);
    expect(rx).toBe(30);
    expect(ry).toBe(30);
    expect(state.mouse.snapType).toBe('point');
  });
});

// ════════════════════════════════════════
// ── autoCenterView ──
// ════════════════════════════════════════
describe('autoCenterView', () => {
  beforeEach(() => {
    state.objects = [];
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    mockCanvas.width = 800;
    mockCanvas.height = 600;
  });

  it('prázdný výkres – reset na výchozí pozici', () => {
    autoCenterView();
    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(400); // width/2
    expect(state.panY).toBe(300); // height/2
  });

  it('jeden bod – vycentruje na tento bod', () => {
    state.objects = [{ type: 'point', x: 50, y: 50, id: 1, layer: 0 }];
    autoCenterView();
    // Bod by měl být uprostřed canvasu
    const [sx, sy] = worldToScreen(50, 50);
    expect(sx).toBeCloseTo(400, 0);
    expect(sy).toBeCloseTo(300, 0);
  });

  it('úsečka – zoom a pan aby se vešla', () => {
    state.objects = [
      { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, id: 1, layer: 0 },
    ];
    autoCenterView();
    // Střed úsečky (50,0) by měl být uprostřed canvasu
    const [sx, sy] = worldToScreen(50, 0);
    expect(sx).toBeCloseTo(400, 0);
    expect(sy).toBeCloseTo(300, 0);
    // Zoom by neměl být 0 ani nekonečno
    expect(state.zoom).toBeGreaterThan(0);
    expect(isFinite(state.zoom)).toBe(true);
  });

  it('kružnice – bere v úvahu celý bounding box', () => {
    state.objects = [
      { type: 'circle', cx: 0, cy: 0, r: 50, id: 1, layer: 0 },
    ];
    autoCenterView();
    // Střed (0,0) uprostřed
    const [sx, sy] = worldToScreen(0, 0);
    expect(sx).toBeCloseTo(400, 0);
    expect(sy).toBeCloseTo(300, 0);
  });

  it('více objektů – vejdou se všechny', () => {
    state.objects = [
      { type: 'point', x: -100, y: -100, id: 1, layer: 0 },
      { type: 'point', x: 100, y: 100, id: 2, layer: 0 },
    ];
    autoCenterView();
    // Oba body by měly být na canvasu (screen souřadnice v rozmezí 0-800, 0-600)
    const [sx1, sy1] = worldToScreen(-100, -100);
    const [sx2, sy2] = worldToScreen(100, 100);
    expect(sx1).toBeGreaterThan(0);
    expect(sx1).toBeLessThan(800);
    expect(sx2).toBeGreaterThan(0);
    expect(sx2).toBeLessThan(800);
  });
});
