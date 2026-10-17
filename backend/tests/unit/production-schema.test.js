import test from 'node:test';
import assert from 'node:assert/strict';
import { missingProductionColumns } from '../../src/lib/production-schema.js';

test('el control de despliegue detecta columnas faltantes en cualquier módulo', () => {
  const models = [{ name: 'Usuario', fields: [
    { name: 'id', kind: 'scalar' },
    { name: 'mustChangePassword', kind: 'scalar' },
    { name: 'rol', kind: 'object' },
  ] }, { name: 'PublicacionTransparencia', fields: [{ name: 'mediaRef', kind: 'scalar' }] }];
  const rows = [
    { table_name: 'Usuario', column_name: 'id' },
    { table_name: 'PublicacionTransparencia', column_name: 'mediaRef' },
  ];
  assert.deepEqual(missingProductionColumns(rows, models), ['Usuario.mustChangePassword']);
  rows.push({ table_name: 'Usuario', column_name: 'mustChangePassword' });
  assert.deepEqual(missingProductionColumns(rows, models), []);
});
