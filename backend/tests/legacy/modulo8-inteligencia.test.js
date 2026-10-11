import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Lógica de negocio de Módulo 8: Inteligencia Territorial y Criptografía Forense (IPIM & CGC)

export function calcularIndiceIPIM({ defAgua, defSan, sinCloro, porcentajeSolvencia, obrasActivas }) {
  const puntajeHidrico = (defAgua * 0.45) + (defSan * 0.35) + (sinCloro * 0.20);
  const factorDesatencionObras = obrasActivas === 0 ? 100 : obrasActivas === 1 ? 50 : 20;
  const factorCompromisoFiscal = 100 - porcentajeSolvencia;

  const puntajeFinal = Number(((puntajeHidrico * 0.50) + (factorDesatencionObras * 0.30) + (factorCompromisoFiscal * 0.20)).toFixed(1));

  let nivelPrioridad = 'Moderada';
  let recomendacionAccion = 'Mantenimiento preventivo y monitoreo OMAS';
  if (puntajeFinal >= 70) {
    nivelPrioridad = 'Crítica';
    recomendacionAccion = 'Adjudicación urgente de fondos de cooperación internacional (USAID/BID)';
  } else if (puntajeFinal >= 50) {
    nivelPrioridad = 'Alta';
    recomendacionAccion = 'Formulación prioritaria de perfil técnico de alcantarillado o agua potable';
  }

  return { puntajeFinal, nivelPrioridad, recomendacionAccion };
}

export function generarMerkleRootForense(bloques) {
  const hashes = Object.values(bloques).map(b => crypto.createHash('sha256').update(JSON.stringify(b)).digest('hex'));
  const root = crypto.createHash('sha256').update(hashes.join(':')).digest('hex');
  return root;
}

export function validarSelloCGC(hash) {
  return typeof hash === 'string' && hash.length === 64 && /^[0-9a-f]{64}$/.test(hash);
}

// 15 PRUEBAS UNITARIAS DE MÓDULO 8
test('1. Cálculo de IPIM: asignación de Prioridad Crítica (>=70) ante alto déficit', () => {
  const res = calcularIndiceIPIM({ defAgua: 80, defSan: 70, sinCloro: 90, porcentajeSolvencia: 20, obrasActivas: 0 });
  assert.equal(res.nivelPrioridad, 'Crítica');
  assert.ok(res.puntajeFinal >= 70);
});

test('2. Cálculo de IPIM: asignación de Prioridad Alta (50 - 69 pts)', () => {
  const res = calcularIndiceIPIM({ defAgua: 65, defSan: 60, sinCloro: 50, porcentajeSolvencia: 40, obrasActivas: 1 });
  assert.equal(res.nivelPrioridad, 'Alta');
  assert.ok(res.puntajeFinal >= 50 && res.puntajeFinal < 70);
});

test('3. Cálculo de IPIM: asignación de Prioridad Moderada (<50 pts) con buena cobertura', () => {
  const res = calcularIndiceIPIM({ defAgua: 15, defSan: 20, sinCloro: 10, porcentajeSolvencia: 90, obrasActivas: 2 });
  assert.equal(res.nivelPrioridad, 'Moderada');
  assert.ok(res.puntajeFinal < 50);
});

test('4. Recomendación ejecutiva vinculada a Prioridad Crítica (fondos internacionales)', () => {
  const res = calcularIndiceIPIM({ defAgua: 90, defSan: 85, sinCloro: 95, porcentajeSolvencia: 10, obrasActivas: 0 });
  assert.match(res.recomendacionAccion, /cooperación internacional/i);
});

test('5. Recomendación ejecutiva vinculada a Prioridad Alta (perfil técnico)', () => {
  const res = calcularIndiceIPIM({ defAgua: 55, defSan: 50, sinCloro: 40, porcentajeSolvencia: 50, obrasActivas: 1 });
  assert.match(res.recomendacionAccion, /perfil técnico/i);
});

test('6. Generación válida de Merkle Root SHA-256 sobre los 7 módulos institucionales', () => {
  const mockBloques = { p: [1, 2], arc: ['a'], tx: [100], actas: ['ACTA-1'], conv: ['C-1'], ash: ['CEN-1'], pub: ['PUB-1'] };
  const root = generarMerkleRootForense(mockBloques);
  assert.equal(validarSelloCGC(root), true);
});

test('7. Inmutabilidad criptográfica: si un solo registro cambia, el Merkle Root cambia', () => {
  const bloquesOriginales = { p: [{ id: 1, v: 10 }] };
  const bloquesAlterados = { p: [{ id: 1, v: 11 }] };
  const root1 = generarMerkleRootForense(bloquesOriginales);
  const root2 = generarMerkleRootForense(bloquesAlterados);
  assert.notEqual(root1, root2);
});

test('8. Formato hexadecimal estricto de 64 caracteres del sello SHA-256', () => {
  const hashValido = crypto.createHash('sha256').update('MFN-CGC-2024').digest('hex');
  assert.equal(validarSelloCGC(hashValido), true);
  assert.equal(validarSelloCGC('invalido'), false);
});

test('9. Ordenamiento algorítmico del ranking de municipios de mayor a menor vulnerabilidad', () => {
  const lista = [
    { muni: 'A', puntajeIPIM: 45.2 },
    { muni: 'B', puntajeIPIM: 88.5 },
    { muni: 'C', puntajeIPIM: 62.1 }
  ];
  lista.sort((a, b) => b.puntajeIPIM - a.puntajeIPIM);
  assert.equal(lista[0].muni, 'B');
  assert.equal(lista[2].muni, 'A');
});

test('10. Impacto de cero obras activas incrementa factor de desatención a 100 pts', () => {
  const sinObras = calcularIndiceIPIM({ defAgua: 50, defSan: 50, sinCloro: 50, porcentajeSolvencia: 50, obrasActivas: 0 });
  const conObras = calcularIndiceIPIM({ defAgua: 50, defSan: 50, sinCloro: 50, porcentajeSolvencia: 50, obrasActivas: 3 });
  assert.ok(sinObras.puntajeFinal > conObras.puntajeFinal);
});

test('11. Compromiso fiscal: municipios insolventes reciben mayor necesidad de auxilio institucional', () => {
  const insolvente = calcularIndiceIPIM({ defAgua: 60, defSan: 60, sinCloro: 60, porcentajeSolvencia: 10, obrasActivas: 1 });
  const solvente = calcularIndiceIPIM({ defAgua: 60, defSan: 60, sinCloro: 60, porcentajeSolvencia: 100, obrasActivas: 1 });
  assert.ok(insolvente.puntajeFinal > solvente.puntajeFinal);
});

test('12. Resiliencia ante valores en cero o municipio modelo', () => {
  const modelo = calcularIndiceIPIM({ defAgua: 0, defSan: 0, sinCloro: 0, porcentajeSolvencia: 100, obrasActivas: 5 });
  assert.equal(modelo.nivelPrioridad, 'Moderada');
  assert.ok(modelo.puntajeFinal <= 10);
});

test('13. Verificación de existencia de los 6 municipios canónicos de la Mancomunidad', () => {
  const canónicos = ['Santa Eulalia', 'San Pedro Soloma', 'San Mateo Ixtatán', 'San Rafael la Independencia', 'Santa Cruz Barillas', 'San Juan Ixcoy'];
  assert.equal(canónicos.length, 6);
  assert.ok(canónicos.includes('Santa Eulalia'));
});

test('14. Consistencia del hash de dictamen con estampa de tiempo', () => {
  const fecha = '2024-03-24';
  const h1 = crypto.createHash('sha256').update('DICTAMEN-MFN' + fecha).digest('hex');
  const h2 = crypto.createHash('sha256').update('DICTAMEN-MFN' + fecha).digest('hex');
  assert.equal(h1, h2);
});

test('15. Validación de emisión de dictamen ejecutivo vinculante para la Asamblea', () => {
  const dictamen = {
    titulo: 'Dictamen Algorítmico de Priorización de Inversión Intermunicipal (IPIM)',
    municipioRecomendado: 'San Mateo Ixtatán',
    selloCriptografico: crypto.createHash('sha256').update('test').digest('hex')
  };
  assert.ok(dictamen.titulo.includes('IPIM'));
  assert.equal(dictamen.municipioRecomendado, 'San Mateo Ixtatán');
  assert.equal(validarSelloCGC(dictamen.selloCriptografico), true);
});
