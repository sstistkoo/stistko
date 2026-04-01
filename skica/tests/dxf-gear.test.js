import { describe, it, expect, vi } from 'vitest';

// Mock DOM
vi.stubGlobal('document', {
  getElementById: () => ({
    disabled: false,
    classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() },
    textContent: '',
  }),
  createElement: () => ({
    className: '', textContent: '', innerHTML: '',
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(), addEventListener: vi.fn(), setAttribute: vi.fn(),
  }),
  body: { appendChild: vi.fn() },
  querySelector: () => null,
});
vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 768, addEventListener: vi.fn() });
vi.stubGlobal('navigator', { vibrate: vi.fn() });
vi.mock('../js/render.js', () => ({ renderAll: vi.fn(), renderAllDebounced: vi.fn() }));

import { exportDXF, parseDXF } from '../js/dxf.js';
import { generateFullGearProfile } from '../js/tools/gearGenerator.js';

describe('DXF gear export for Fusion 360', () => {
  it('gear polyline exports with AC1014 format for Fusion 360', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const gearObj = {
      type: 'polyline',
      vertices: profile.vertices,
      bulges: profile.bulges,
      closed: true,
    };
    const dxf = exportDXF([gearObj]);

    // Required sections (Fusion 360 format)
    expect(dxf).toContain('$ACADVER');
    expect(dxf).toContain('AC1014');
    expect(dxf).toContain('BLOCKS');
    expect(dxf).toContain('*MODEL_SPACE');
    expect(dxf).toContain('*PAPER_SPACE');
    expect(dxf).toContain('OBJECTS');
    expect(dxf).toContain('DICTIONARY');
    expect(dxf).toContain('BLOCK_RECORD');
    expect(dxf).toContain('AcDbEntity');
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('LTYPE');
    expect(dxf).toContain('LAYER');
    expect(dxf).toContain('STYLE');
    expect(dxf).toContain('APPID');
  });

  it('gear DXF round-trips correctly', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const gearObj = {
      type: 'polyline',
      vertices: profile.vertices,
      bulges: profile.bulges,
      closed: true,
    };
    const dxf = exportDXF([gearObj]);
    const result = parseDXF(dxf);
    expect(result.errors).toHaveLength(0);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe('polyline');
    expect(result.entities[0].vertices.length).toBe(profile.vertices.length);
    expect(result.entities[0].closed).toBe(true);
  });

  it('gear profile generates non-zero bulges for arcs', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const nonZeroBulges = profile.bulges.filter(b => b !== 0);
    // 20 teeth × 2 arcs (tip + root) = 40 bulges
    expect(nonZeroBulges.length).toBe(40);
    // All bulge values should be finite numbers
    nonZeroBulges.forEach(b => {
      expect(Number.isFinite(b)).toBe(true);
    });
  });

  it('DXF export includes bulge group codes (42) for gear arcs', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const gearObj = {
      type: 'polyline',
      vertices: profile.vertices,
      bulges: profile.bulges,
      closed: true,
    };
    const dxf = exportDXF([gearObj]);
    const lines = dxf.split('\n');
    const bulgeLines = lines.filter((l, i) => l.trim() === '42' && i > 0 && lines[i-1].trim() !== 'HEADER');
    expect(bulgeLines.length).toBe(40);
  });

  it('DXF export includes extrusion direction (210/220/230) for circles', () => {
    // Test s circle entity, která má extrusion direction
    const dxf = exportDXF([{ type: 'circle', cx: 0, cy: 0, r: 10 }]);
    expect(dxf).toContain('210');
    expect(dxf).toContain('220');
    expect(dxf).toContain('230');
  });

  it('round-trip preserves all bulge values', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const gearObj = {
      type: 'polyline',
      vertices: profile.vertices,
      bulges: profile.bulges,
      closed: true,
    };
    const dxf = exportDXF([gearObj]);
    const result = parseDXF(dxf);
    expect(result.errors).toHaveLength(0);
    const entity = result.entities[0];
    const importedBulges = entity.bulges.filter(b => b !== 0);
    expect(importedBulges.length).toBe(40);
  });

  it('has no NaN values in output', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const gearObj = {
      type: 'polyline',
      vertices: profile.vertices,
      bulges: profile.bulges,
      closed: true,
    };
    const dxf = exportDXF([gearObj]);
    const lines = dxf.split('\n');
    for (let i = 0; i < lines.length; i++) {
      expect(lines[i]).not.toBe('NaN');
      expect(lines[i]).not.toBe('Infinity');
      expect(lines[i]).not.toBe('-Infinity');
    }
  });
});
