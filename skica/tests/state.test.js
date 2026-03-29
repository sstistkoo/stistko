// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Testy: state.js (undo/redo, toast, stav)          ║
// ╚══════════════════════════════════════════════════════════════╝

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM
vi.stubGlobal('document', {
  getElementById: () => ({
    disabled: false,
    classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() },
    textContent: '',
  }),
  createElement: (tag) => ({
    className: '', textContent: '', innerHTML: '',
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    setAttribute: vi.fn(),
  }),
  body: { appendChild: vi.fn() },
  querySelector: () => null,
});

vi.stubGlobal('window', {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
});

vi.stubGlobal('navigator', { vibrate: vi.fn() });

// Mock render.js
vi.mock('../js/render.js', () => ({
  renderAll: vi.fn(),
  renderAllDebounced: vi.fn(),
}));

import { state, pushUndo, undo, redo, showToast } from '../js/state.js';

// ════════════════════════════════════════
// ── pushUndo ──
// ════════════════════════════════════════
describe('pushUndo', () => {
  beforeEach(() => {
    state.objects = [];
    state.undoStack = [];
    state.redoStack = [];
    state.selected = null;
    state.drawing = false;
    state.tool = 'select';
  });

  it('uloží aktuální stav objektů na undo stack', () => {
    state.objects = [{ type: 'point', x: 1, y: 2, id: 1 }];
    pushUndo();
    expect(state.undoStack).toHaveLength(1);
    const saved = JSON.parse(state.undoStack[0]);
    expect(saved).toHaveLength(1);
    expect(saved[0].x).toBe(1);
  });

  it('vymaže redo stack po pushUndo', () => {
    state.redoStack = ['["something"]'];
    pushUndo();
    expect(state.redoStack).toHaveLength(0);
  });

  it('ukládá hlubokou kopii (ne referenci)', () => {
    state.objects = [{ type: 'point', x: 5, y: 5, id: 1 }];
    pushUndo();
    state.objects[0].x = 99;
    const saved = JSON.parse(state.undoStack[0]);
    expect(saved[0].x).toBe(5); // nepozměněný
  });

  it('více pushUndo přidává na stack', () => {
    state.objects = [{ type: 'point', x: 0, y: 0, id: 1 }];
    pushUndo();
    state.objects = [{ type: 'point', x: 10, y: 10, id: 1 }];
    pushUndo();
    state.objects = [{ type: 'point', x: 20, y: 20, id: 1 }];
    pushUndo();
    expect(state.undoStack).toHaveLength(3);
  });
});

// ════════════════════════════════════════
// ── maxUndo limit ──
// ════════════════════════════════════════
describe('maxUndo limit', () => {
  beforeEach(() => {
    state.objects = [];
    state.undoStack = [];
    state.redoStack = [];
    state.selected = null;
    state.drawing = false;
    state.tool = 'select';
  });

  it('undo stack nepřeroste maxUndo (50)', () => {
    for (let i = 0; i < 60; i++) {
      state.objects = [{ type: 'point', x: i, y: i, id: 1 }];
      pushUndo();
    }
    expect(state.undoStack.length).toBeLessThanOrEqual(state.maxUndo);
    expect(state.undoStack.length).toBe(50);
  });

  it('při překročení limitu se odstraní nejstarší stav', () => {
    for (let i = 0; i < 55; i++) {
      state.objects = [{ type: 'point', x: i, y: 0, id: 1 }];
      pushUndo();
    }
    // Nejstarší stavy (0-4) by měly být odstraněny
    const oldest = JSON.parse(state.undoStack[0]);
    expect(oldest[0].x).toBe(5); // 0,1,2,3,4 odstraněny
  });
});

// ════════════════════════════════════════
// ── undo ──
// ════════════════════════════════════════
describe('undo', () => {
  beforeEach(() => {
    state.objects = [];
    state.undoStack = [];
    state.redoStack = [];
    state.selected = null;
    state.drawing = false;
    state.tool = 'select';
  });

  it('obnoví předchozí stav objektů', () => {
    state.objects = [{ type: 'point', x: 1, y: 1, id: 1 }];
    pushUndo();
    state.objects = [{ type: 'point', x: 99, y: 99, id: 1 }];
    undo();
    expect(state.objects).toHaveLength(1);
    expect(state.objects[0].x).toBe(1);
  });

  it('přesune stav na redo stack', () => {
    state.objects = [{ type: 'point', x: 1, y: 1, id: 1 }];
    pushUndo();
    state.objects = [{ type: 'point', x: 2, y: 2, id: 1 }];
    undo();
    expect(state.redoStack).toHaveLength(1);
    const redoState = JSON.parse(state.redoStack[0]);
    expect(redoState[0].x).toBe(2);
  });

  it('na prázdném undo stacku se nic nestane', () => {
    state.objects = [{ type: 'point', x: 42, y: 42, id: 1 }];
    undo();
    expect(state.objects).toHaveLength(1);
    expect(state.objects[0].x).toBe(42);
  });

  it('vícenásobné undo postupně obnovuje stavy', () => {
    state.objects = [];
    pushUndo(); // stav 0: []

    state.objects = [{ type: 'point', x: 1, y: 1, id: 1 }];
    pushUndo(); // stav 1: [point(1,1)]

    state.objects = [{ type: 'point', x: 2, y: 2, id: 1 }];
    // aktuální: [point(2,2)]

    undo(); // → [point(1,1)]
    expect(state.objects[0].x).toBe(1);

    undo(); // → []
    expect(state.objects).toHaveLength(0);
  });

  it('resetuje selected po undo', () => {
    state.objects = [{ type: 'point', x: 1, y: 1, id: 1 }];
    pushUndo();
    state.selected = 0;
    state.objects = [{ type: 'point', x: 2, y: 2, id: 1 }];
    undo();
    expect(state.selected).toBeNull();
  });
});

// ════════════════════════════════════════
// ── redo ──
// ════════════════════════════════════════
describe('redo', () => {
  beforeEach(() => {
    state.objects = [];
    state.undoStack = [];
    state.redoStack = [];
    state.selected = null;
    state.drawing = false;
    state.tool = 'select';
  });

  it('obnoví stav po undo', () => {
    state.objects = [{ type: 'point', x: 1, y: 1, id: 1 }];
    pushUndo();
    state.objects = [{ type: 'point', x: 5, y: 5, id: 1 }];
    undo();
    expect(state.objects[0].x).toBe(1);
    redo();
    expect(state.objects[0].x).toBe(5);
  });

  it('na prázdném redo stacku se nic nestane', () => {
    state.objects = [{ type: 'point', x: 42, y: 42, id: 1 }];
    redo();
    expect(state.objects[0].x).toBe(42);
  });

  it('undo → redo → undo cyklus zachová konzistenci', () => {
    state.objects = [];
    pushUndo();
    state.objects = [{ type: 'point', x: 10, y: 10, id: 1 }];

    undo();
    expect(state.objects).toHaveLength(0);

    redo();
    expect(state.objects).toHaveLength(1);
    expect(state.objects[0].x).toBe(10);

    undo();
    expect(state.objects).toHaveLength(0);
  });

  it('pushUndo po undo vymaže redo stack', () => {
    state.objects = [];
    pushUndo();
    state.objects = [{ type: 'point', x: 1, y: 1, id: 1 }];
    undo();
    expect(state.redoStack).toHaveLength(1);
    pushUndo(); // nový push → redo se vymaže
    expect(state.redoStack).toHaveLength(0);
  });
});

// ════════════════════════════════════════
// ── showToast ──
// ════════════════════════════════════════
describe('showToast', () => {
  it('nevyhodí chybu v Node prostředí', () => {
    expect(() => showToast('Test zpráva')).not.toThrow();
  });

  it('nevyhodí chybu s vlastním duration', () => {
    expect(() => showToast('Krátká', 500)).not.toThrow();
  });

  it('nevyhodí chybu s prázdným řetězcem', () => {
    expect(() => showToast('')).not.toThrow();
  });
});
