import test from 'node:test';
import assert from 'node:assert/strict';

// Business logic and helpers for Módulo 6: Estadísticas Territoriales ASH
export function formatearCodigoCenso(anio, municipio, correlativo) {
  const clean = municipio.toUpperCase().slice(0, 3);
  return `ASH-${anio}-${clean}-${correlativo.toString().padStart(3, '0')}`;
}

export function calcularCoberturasComunidad(totales, conAgua, conSaneamiento) {
  if (totales <= 0) throw new Error('El número total de viviendas debe ser mayor a cero');
  if (conAgua > totales) throw new Error('Las viviendas con agua no pueden superar el total de viviendas');
  if (conSaneamiento > totales) throw new Error('Las viviendas con saneamiento no pueden superar el total de viviendas');

  const coberturaAgua = Number(((conAgua / totales) * 100).toFixed(1));
  const deficitAgua = Number((100 - coberturaAgua).toFixed(1));
  const coberturaSaneamiento = Number(((conSaneamiento / totales) * 100).toFixed(1));
  const deficitSaneamiento = Number((100 - coberturaSaneamiento).toFixed(1));

  return {
    coberturaAgua,
    deficitAgua,
    coberturaSaneamiento,
    deficitSaneamiento
  };
}

export function validarCloracionNorma(ppm) {
  // Norma técnica guatemalteca COGUANOR NGO 29 001: 0.5 a 1.5 ppm
  if (ppm < 0) throw new Error('El valor de ppm de cloro no puede ser negativo');
  if (ppm < 0.5) return { apta: false, estado: 'Deficiente (Riesgo Bacteriológico)' };
  if (ppm > 1.5) return { apta: false, estado: 'Sobreclorado (Riesgo Químico)' };
  return { apta: true, estado: 'Óptimo (Norma COGUANOR)' };
}

export function consolidarEstadisticasRegionales(censos) {
  let totalViviendas = 0;
  let totalAgua = 0;
  let totalSaneamiento = 0;
  let totalClorados = 0;

  for (const c of censos) {
    totalViviendas += c.viviendasTotales;
    totalAgua += c.viviendasConAgua;
    totalSaneamiento += c.viviendasConSaneamiento;
    if (c.sistemaCloracion) totalClorados++;
  }

  const coberturaAguaRegional = totalViviendas > 0 ? Number(((totalAgua / totalViviendas) * 100).toFixed(1)) : 0;
  const coberturaSaneamientoRegional = totalViviendas > 0 ? Number(((totalSaneamiento / totalViviendas) * 100).toFixed(1)) : 0;

  return {
    totalViviendas,
    totalAgua,
    totalSaneamiento,
    totalClorados,
    coberturaAguaRegional,
    deficitAguaRegional: Number((100 - coberturaAguaRegional).toFixed(1)),
    coberturaSaneamientoRegional,
    deficitSaneamientoRegional: Number((100 - coberturaSaneamientoRegional).toFixed(1))
  };
}

export function identificarComunidadMayorDeficit(censos) {
  if (!Array.isArray(censos) || censos.length === 0) return null;
  return censos.reduce((peor, actual) => {
    const deficitActual = 100 - (actual.viviendasConAgua / actual.viviendasTotales * 100);
    const deficitPeor = peor ? 100 - (peor.viviendasConAgua / peor.viviendasTotales * 100) : -1;
    return deficitActual > deficitPeor ? actual : peor;
  }, null);
}

export function clasificarVulnerabilidadSanitaria(coberturaAgua, coberturaSaneamiento) {
  const promedio = (coberturaAgua + coberturaSaneamiento) / 2;
  if (promedio < 40) return 'Alta Vulnerabilidad';
  if (promedio < 70) return 'Vulnerabilidad Media';
  return 'Baja Vulnerabilidad';
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 6
// ==========================================

test('1. Formato estandarizado de código de censo comunitario ASH', () => {
  assert.equal(formatearCodigoCenso(2024, 'Santa Eulalia', 1), 'ASH-2024-SAN-001');
  assert.equal(formatearCodigoCenso(2024, 'Soloma', 14), 'ASH-2024-SOL-014');
});

test('2. Cálculo de porcentaje de cobertura y déficit de agua potable comunitario', () => {
  const res = calcularCoberturasComunidad(200, 150, 100);
  assert.equal(res.coberturaAgua, 75.0);
  assert.equal(res.deficitAgua, 25.0);
});

test('3. Cálculo de porcentaje de cobertura y déficit de saneamiento básico', () => {
  const res = calcularCoberturasComunidad(200, 150, 80);
  assert.equal(res.coberturaSaneamiento, 40.0);
  assert.equal(res.deficitSaneamiento, 60.0);
});

test('4. Validación de regla de negocio: viviendas con agua no pueden superar el total', () => {
  assert.throws(() => {
    calcularCoberturasComunidad(100, 120, 50);
  }, /no pueden superar el total/);
});

test('5. Validación de regla de negocio: viviendas con saneamiento no pueden superar el total', () => {
  assert.throws(() => {
    calcularCoberturasComunidad(100, 80, 105);
  }, /no pueden superar el total/);
});

test('6. Validación de norma COGUANOR de cloro residual en rango óptimo (0.5 a 1.5 ppm)', () => {
  const test1 = validarCloracionNorma(0.8);
  const test2 = validarCloracionNorma(1.2);
  assert.equal(test1.apta, true);
  assert.equal(test2.apta, true);
  assert.ok(test1.estado.includes('Óptimo'));
});

test('7. Alerta de agua deficiente en cloro con riesgo bacteriológico (<0.5 ppm)', () => {
  const test = validarCloracionNorma(0.2);
  assert.equal(test.apta, false);
  assert.ok(test.estado.includes('Riesgo Bacteriológico'));
});

test('8. Alerta de agua sobreclorada con riesgo químico (>1.5 ppm)', () => {
  const test = validarCloracionNorma(2.0);
  assert.equal(test.apta, false);
  assert.ok(test.estado.includes('Sobreclorado'));
});

test('9. Control de excepción para valores negativos de cloro', () => {
  assert.throws(() => validarCloracionNorma(-0.5), /no puede ser negativo/);
});

test('10. Consolidación agregada territorial de los 6 municipios mancomunados', () => {
  const censos = [
    { viviendasTotales: 300, viviendasConAgua: 210, viviendasConSaneamiento: 150, sistemaCloracion: true },
    { viviendasTotales: 200, viviendasConAgua: 100, viviendasConSaneamiento: 80, sistemaCloracion: false }
  ];
  const consolidado = consolidarEstadisticasRegionales(censos);
  assert.equal(consolidado.totalViviendas, 500);
  assert.equal(consolidado.coberturaAguaRegional, 62.0);
  assert.equal(consolidado.deficitAguaRegional, 38.0);
  assert.equal(consolidado.coberturaSaneamientoRegional, 46.0);
});

test('11. Conteo de sistemas de agua con infraestructura de cloración', () => {
  const censos = [
    { viviendasTotales: 100, viviendasConAgua: 80, viviendasConSaneamiento: 50, sistemaCloracion: true },
    { viviendasTotales: 100, viviendasConAgua: 80, viviendasConSaneamiento: 50, sistemaCloracion: true },
    { viviendasTotales: 100, viviendasConAgua: 80, viviendasConSaneamiento: 50, sistemaCloracion: false }
  ];
  const consolidado = consolidarEstadisticasRegionales(censos);
  assert.equal(consolidado.totalClorados, 2);
});

test('12. Identificación algorítmica de la comunidad con mayor déficit para inversión prioritaria', () => {
  const censos = [
    { comunidad: 'Aldea A', viviendasTotales: 100, viviendasConAgua: 80, viviendasConSaneamiento: 50 }, // 20% deficit
    { comunidad: 'Aldea B', viviendasTotales: 100, viviendasConAgua: 30, viviendasConSaneamiento: 20 }, // 70% deficit
    { comunidad: 'Aldea C', viviendasTotales: 100, viviendasConAgua: 90, viviendasConSaneamiento: 80 }  // 10% deficit
  ];
  const critica = identificarComunidadMayorDeficit(censos);
  assert.equal(critica.comunidad, 'Aldea B');
});

test('13. Clasificación de Alta Vulnerabilidad Sanitaria (<40% promedio)', () => {
  const nivel = clasificarVulnerabilidadSanitaria(30, 35);
  assert.equal(nivel, 'Alta Vulnerabilidad');
});

test('14. Clasificación de Vulnerabilidad Media (40% - 70% promedio)', () => {
  const nivel = clasificarVulnerabilidadSanitaria(60, 50);
  assert.equal(nivel, 'Vulnerabilidad Media');
});

test('15. Clasificación de Baja Vulnerabilidad Sanitaria (>=70% promedio)', () => {
  const nivel = clasificarVulnerabilidadSanitaria(85, 80);
  assert.equal(nivel, 'Baja Vulnerabilidad');
});
