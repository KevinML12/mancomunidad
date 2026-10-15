import assert from 'node:assert/strict';
import test from 'node:test';
import { csvCell } from '../src/lib/csv.js';

test('CSV escapa comillas y evita fórmulas al abrirlo en una hoja de cálculo', () => {
  assert.equal(csvCell('Obra "A"'), '"Obra ""A"""');
  assert.equal(csvCell('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"');
  assert.equal(csvCell('  +SUM(1,2)'), '"\'  +SUM(1,2)"');
  assert.equal(csvCell('normal'), '"normal"');
});
