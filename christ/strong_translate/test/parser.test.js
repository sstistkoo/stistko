import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCzTXT, parseImportJSON } from '../js/parser.js';

test('parseCzTXT parses one G entry with core fields', () => {
  const input = [
    'G1 | alpha',
    'VÝZNAM: vyznam text',
    'Definice: definice text',
    'Použití: uziti',
    'Původ: puvod',
    'Specialista: specialista',
    'KJV: kjv'
  ].join('\n');

  const out = parseCzTXT(input);
  assert.equal(out.G1.vyznam, 'vyznam text');
  assert.equal(out.G1.definice, 'definice text');
  assert.equal(out.G1.pouziti, 'uziti');
  assert.equal(out.G1.puvod, 'puvod');
  assert.equal(out.G1.specialista, 'specialista');
  assert.equal(out.G1.kjv, 'kjv');
});

test('parseCzTXT handles UTF-8 BOM and CRLF', () => {
  const input = '\uFEFFG2 | beta\r\nVyznam: text\r\nDefinice: def\r\n';
  const out = parseCzTXT(input);
  assert.equal(out.G2.vyznam, 'text');
  assert.equal(out.G2.definice, 'def');
});

test('parseCzTXT supports fullwidth colon', () => {
  const input = 'G3 | gamma\nVYZNAM： hodnota\nDEFINICE： definice';
  const out = parseCzTXT(input);
  assert.equal(out.G3.vyznam, 'hodnota');
  assert.equal(out.G3.definice, 'definice');
});

test('parseCzTXT ignores blocks without key header', () => {
  const input = 'Neco: bez hlavicky\nDefinice: x';
  const out = parseCzTXT(input);
  assert.deepEqual(out, {});
});

test('parseImportJSON parses map object variant', () => {
  const input = JSON.stringify({
    G10: { vyznam: 'a', definice: 'b', puvod: 'c' },
    H20: { vyznam: 'x', definice: 'y' }
  });
  const out = parseImportJSON(input);
  assert.equal(out.G10.vyznam, 'a');
  assert.equal(out.H20.definice, 'y');
});

test('parseImportJSON parses array wrapper with key field', () => {
  const input = JSON.stringify([
    { key: 'G11', vyznam: 'v', definice: 'd' },
    { strong: 'H22', vyznam: 'v2', definice: 'd2' }
  ]);
  const out = parseImportJSON(input);
  assert.equal(out.G11.definice, 'd');
  assert.equal(out.H22.vyznam, 'v2');
});

test('parseImportJSON parses data envelope arrays', () => {
  const input = JSON.stringify({
    data: [{ id: 'G99', vyznam: 'ok', definice: 'def' }]
  });
  const out = parseImportJSON(input);
  assert.equal(out.G99.vyznam, 'ok');
});

test('parseImportJSON ignores unknown keys and empty records', () => {
  const input = JSON.stringify({
    X1: { vyznam: 'x', definice: 'y' },
    G5: { vyznam: '   ', definice: '' }
  });
  const out = parseImportJSON(input);
  assert.deepEqual(out, {});
});
