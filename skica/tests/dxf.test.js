// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Testy: dxf.js (parseDXF)                          ║
// ╚══════════════════════════════════════════════════════════════╝

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM (potřeba pro state.js → document.getElementById)
vi.stubGlobal('document', {
  getElementById: () => ({
    disabled: false,
    classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() },
    textContent: '',
  }),
  createElement: () => ({
    className: '', textContent: '', innerHTML: '',
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
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
}));

import { parseDXF } from '../js/dxf.js';

const PI = Math.PI;

// ═══════════════════════════════════════════
// Helper: Sestaví minimální DXF soubor
// ═══════════════════════════════════════════
function makeDXF(entityLines) {
  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES',
    ...entityLines,
    '0', 'ENDSEC',
    '0', 'EOF',
  ].join('\n');
}

// ════════════════════════════════════════
// ── parseDXF – základní scénáře ──
// ════════════════════════════════════════
describe('parseDXF', () => {
  it('vrací prázdný výsledek pro prázdný řetězec', () => {
    const result = parseDXF('');
    expect(result.entities).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('ENTITIES');
  });

  it('vrací chybu když chybí sekce ENTITIES', () => {
    const dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF';
    const result = parseDXF(dxf);
    expect(result.entities).toHaveLength(0);
    expect(result.errors[0]).toContain('ENTITIES');
  });

  it('parsuje prázdnou sekci ENTITIES', () => {
    const dxf = makeDXF([]);
    const result = parseDXF(dxf);
    expect(result.entities).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ════════════════════════════════════════
// ── LINE ──
// ════════════════════════════════════════
describe('parseDXF – LINE', () => {
  it('parsuje úsečku se souřadnicemi', () => {
    const dxf = makeDXF([
      '0', 'LINE',
      '10', '0.0',
      '20', '0.0',
      '11', '100.0',
      '21', '50.0',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(errors).toHaveLength(0);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('line');
    expect(entities[0].x1).toBe(0);
    expect(entities[0].y1).toBe(0);
    expect(entities[0].x2).toBe(100);
    expect(entities[0].y2).toBe(50);
  });

  it('přiřadí barvu z ACI kódu', () => {
    const dxf = makeDXF([
      '0', 'LINE',
      '62', '1',
      '10', '0', '20', '0', '11', '10', '21', '10',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].color).toBe('#ff0000');
  });

  it('použije výchozí barvu pro neznámý ACI kód', () => {
    const dxf = makeDXF([
      '0', 'LINE',
      '62', '999',
      '10', '0', '20', '0', '11', '10', '21', '10',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].color).toBe('#89b4fa'); // COLORS.primary
  });

  it('výchozí barva když chybí kód 62', () => {
    const dxf = makeDXF([
      '0', 'LINE',
      '10', '5', '20', '10', '11', '15', '21', '20',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].color).toBe('#89b4fa');
  });

  it('souřadnice defaultují na 0 když chybí', () => {
    const dxf = makeDXF([
      '0', 'LINE',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].x1).toBe(0);
    expect(entities[0].y1).toBe(0);
    expect(entities[0].x2).toBe(0);
    expect(entities[0].y2).toBe(0);
  });
});

// ════════════════════════════════════════
// ── CIRCLE ──
// ════════════════════════════════════════
describe('parseDXF – CIRCLE', () => {
  it('parsuje kružnici', () => {
    const dxf = makeDXF([
      '0', 'CIRCLE',
      '10', '50.0',
      '20', '50.0',
      '40', '25.0',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(errors).toHaveLength(0);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('circle');
    expect(entities[0].cx).toBe(50);
    expect(entities[0].cy).toBe(50);
    expect(entities[0].r).toBe(25);
  });

  it('kružnice s ACI barvou', () => {
    const dxf = makeDXF([
      '0', 'CIRCLE',
      '62', '3',
      '10', '0', '20', '0', '40', '10',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].color).toBe('#00ff00');
  });

  it('poloměr defaultuje na 0 když chybí kód 40', () => {
    const dxf = makeDXF([
      '0', 'CIRCLE',
      '10', '10', '20', '10',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].r).toBe(0);
  });
});

// ════════════════════════════════════════
// ── ARC ──
// ════════════════════════════════════════
describe('parseDXF – ARC', () => {
  it('parsuje oblouk s úhly v radiánech', () => {
    const dxf = makeDXF([
      '0', 'ARC',
      '10', '75.0',
      '20', '25.0',
      '40', '20.0',
      '50', '0.0',
      '51', '90.0',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(errors).toHaveLength(0);
    expect(entities).toHaveLength(1);
    const arc = entities[0];
    expect(arc.type).toBe('arc');
    expect(arc.cx).toBe(75);
    expect(arc.cy).toBe(25);
    expect(arc.r).toBe(20);
    expect(arc.startAngle).toBeCloseTo(0);
    expect(arc.endAngle).toBeCloseTo(PI / 2);
  });

  it('konvertuje DXF stupně na radiány', () => {
    const dxf = makeDXF([
      '0', 'ARC',
      '10', '0', '20', '0', '40', '10',
      '50', '45',
      '51', '180',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].startAngle).toBeCloseTo(45 * PI / 180);
    expect(entities[0].endAngle).toBeCloseTo(PI);
  });
});

// ════════════════════════════════════════
// ── POINT ──
// ════════════════════════════════════════
describe('parseDXF – POINT', () => {
  it('parsuje bod', () => {
    const dxf = makeDXF([
      '0', 'POINT',
      '10', '25.0',
      '20', '25.0',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('point');
    expect(entities[0].x).toBe(25);
    expect(entities[0].y).toBe(25);
  });
});

// ════════════════════════════════════════
// ── LWPOLYLINE ──
// ════════════════════════════════════════
describe('parseDXF – LWPOLYLINE', () => {
  it('parsuje otevřenou polylajnu', () => {
    const dxf = makeDXF([
      '0', 'LWPOLYLINE',
      '90', '3',
      '70', '0',
      '10', '0', '20', '0',
      '10', '10', '20', '0',
      '10', '10', '20', '10',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities).toHaveLength(1);
    const pl = entities[0];
    expect(pl.type).toBe('polyline');
    expect(pl.closed).toBe(false);
    expect(pl.vertices).toHaveLength(3);
    expect(pl.vertices[0]).toEqual({ x: 0, y: 0 });
    expect(pl.vertices[2]).toEqual({ x: 10, y: 10 });
  });

  it('parsuje uzavřenou polylajnu (flag 1)', () => {
    const dxf = makeDXF([
      '0', 'LWPOLYLINE',
      '90', '4',
      '70', '1',
      '10', '0', '20', '0',
      '10', '50', '20', '0',
      '10', '50', '20', '30',
      '10', '0', '20', '30',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].closed).toBe(true);
    expect(entities[0].vertices).toHaveLength(4);
  });

  it('parsuje polylajnu s bulge hodnotami', () => {
    const dxf = makeDXF([
      '0', 'LWPOLYLINE',
      '90', '3',
      '70', '0',
      '10', '0', '20', '0',
      '42', '0.5',
      '10', '10', '20', '0',
      '10', '10', '20', '10',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities[0].bulges[0]).toBe(0.5);
    expect(entities[0].bulges[1]).toBe(0);
    expect(entities[0].bulges[2]).toBe(0);
  });
});

// ════════════════════════════════════════
// ── Více entit ──
// ════════════════════════════════════════
describe('parseDXF – více entit', () => {
  it('parsuje více entit najednou', () => {
    const dxf = makeDXF([
      '0', 'LINE',
      '10', '0', '20', '0', '11', '10', '21', '10',
      '0', 'CIRCLE',
      '10', '5', '20', '5', '40', '3',
      '0', 'POINT',
      '10', '1', '20', '2',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(errors).toHaveLength(0);
    expect(entities).toHaveLength(3);
    expect(entities[0].type).toBe('line');
    expect(entities[1].type).toBe('circle');
    expect(entities[2].type).toBe('point');
  });
});

// ════════════════════════════════════════
// ── Nepodporované entity ──
// ════════════════════════════════════════
describe('parseDXF – chyby a hraniční případy', () => {
  it('hlásí neznámou entitu', () => {
    const dxf = makeDXF([
      '0', 'SPLINE',
      '10', '0', '20', '0',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(entities).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('SPLINE');
  });

  it('hlásí více neznámých entit', () => {
    const dxf = makeDXF([
      '0', 'SPLINE',
      '10', '0', '20', '0',
      '0', '3DFACE',
      '10', '0', '20', '0',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(entities).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });

  it('zpracuje mix známých a neznámých entit', () => {
    const dxf = makeDXF([
      '0', 'LINE',
      '10', '0', '20', '0', '11', '10', '21', '10',
      '0', 'ELLIPSE',
      '10', '0', '20', '0',
      '0', 'CIRCLE',
      '10', '5', '20', '5', '40', '2',
    ]);
    const { entities, errors } = parseDXF(dxf);
    expect(entities).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('ELLIPSE');
  });

  it('zvládne DXF s \\r\\n konci řádků', () => {
    const dxf = makeDXF([
      '0', 'POINT',
      '10', '42', '20', '24',
    ]).replace(/\n/g, '\r\n');
    const { entities } = parseDXF(dxf);
    expect(entities).toHaveLength(1);
    expect(entities[0].x).toBe(42);
    expect(entities[0].y).toBe(24);
  });

  it('zvládne neplatné číselné hodnoty', () => {
    const dxf = makeDXF([
      '0', 'POINT',
      '10', 'abc',
      '20', '',
    ]);
    const { entities } = parseDXF(dxf);
    expect(entities).toHaveLength(1);
    expect(entities[0].x).toBe(0);
    expect(entities[0].y).toBe(0);
  });

  it('parsuje kompletní test.dxf s 5 entitami', () => {
    // Simulace reálného test.dxf souboru
    const dxf = [
      '0', 'SECTION',
      '2', 'HEADER',
      '0', 'ENDSEC',
      '0', 'SECTION',
      '2', 'ENTITIES',
      '0', 'LINE', '8', '0', '62', '1',
      '10', '0.0', '20', '0.0', '11', '100.0', '21', '50.0',
      '0', 'CIRCLE', '8', '0', '62', '3',
      '10', '50.0', '20', '50.0', '40', '25.0',
      '0', 'ARC', '8', '0', '62', '5',
      '10', '75.0', '20', '25.0', '40', '20.0', '50', '0.0', '51', '90.0',
      '0', 'LWPOLYLINE', '8', '0', '62', '4', '90', '4', '70', '1',
      '10', '0.0', '20', '0.0',
      '10', '50.0', '20', '0.0', '42', '0.5',
      '10', '50.0', '20', '30.0',
      '10', '0.0', '20', '30.0',
      '0', 'POINT', '8', '0',
      '10', '25.0', '20', '25.0',
      '0', 'ENDSEC',
      '0', 'EOF',
    ].join('\n');

    const { entities, errors } = parseDXF(dxf);
    expect(errors).toHaveLength(0);
    expect(entities).toHaveLength(5);

    // LINE
    expect(entities[0].type).toBe('line');
    expect(entities[0].x1).toBe(0);
    expect(entities[0].x2).toBe(100);
    expect(entities[0].color).toBe('#ff0000');

    // CIRCLE
    expect(entities[1].type).toBe('circle');
    expect(entities[1].cx).toBe(50);
    expect(entities[1].r).toBe(25);
    expect(entities[1].color).toBe('#00ff00');

    // ARC
    expect(entities[2].type).toBe('arc');
    expect(entities[2].startAngle).toBeCloseTo(0);
    expect(entities[2].endAngle).toBeCloseTo(PI / 2);
    expect(entities[2].color).toBe('#0000ff');

    // LWPOLYLINE
    expect(entities[3].type).toBe('polyline');
    expect(entities[3].closed).toBe(true);
    expect(entities[3].vertices).toHaveLength(4);
    expect(entities[3].bulges[1]).toBe(0.5);
    expect(entities[3].color).toBe('#00ffff');

    // POINT
    expect(entities[4].type).toBe('point');
    expect(entities[4].x).toBe(25);
    expect(entities[4].y).toBe(25);
  });
});

// ════════════════════════════════════════
// ── ACI barvy (všechny definované) ──
// ════════════════════════════════════════
describe('parseDXF – ACI barvy', () => {
  const aciMap = {
    1: '#ff0000',
    2: '#ffff00',
    3: '#00ff00',
    4: '#00ffff',
    5: '#0000ff',
    6: '#ff00ff',
    7: '#ffffff',
    8: '#808080',
    9: '#c0c0c0',
  };

  Object.entries(aciMap).forEach(([code, expectedColor]) => {
    it(`ACI ${code} → ${expectedColor}`, () => {
      const dxf = makeDXF([
        '0', 'POINT',
        '62', code,
        '10', '0', '20', '0',
      ]);
      const { entities } = parseDXF(dxf);
      expect(entities[0].color).toBe(expectedColor);
    });
  });
});
