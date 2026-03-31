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
  it('gear polyline exports with all required AC1015 sections', () => {
    const profile = generateFullGearProfile(2, 20, 20, 0, 20, 0, 0);
    const gearObj = {
      type: 'polyline',
      vertices: profile.vertices,
      bulges: profile.bulges,
      closed: true,
    };
    const dxf = exportDXF([gearObj]);

    // Required sections
    expect(dxf).toContain('$ACADVER');
    expect(dxf).toContain('AC1015');
    expect(dxf).toContain('CLASSES');
    expect(dxf).toContain('BLOCKS');
    expect(dxf).toContain('*MODEL_SPACE');
    expect(dxf).toContain('*PAPER_SPACE');
    expect(dxf).toContain('OBJECTS');
    expect(dxf).toContain('DICTIONARY');
    expect(dxf).toContain('BLOCK_RECORD');
    expect(dxf).toContain('AcDbEntity');
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('VPORT');
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
