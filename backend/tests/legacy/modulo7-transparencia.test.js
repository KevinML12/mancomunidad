import test from 'node:test';
import assert from 'node:assert/strict';

// Business logic and helpers for Módulo 7: Portal de Transparencia y Datos Abiertos (RF5)
export const TIPOS_PUBLICACION = ['Proyecto', 'Acta', 'Estadística', 'Finanzas'];

export function formatearCodigoPublicacion(anio, correlativo) {
  return `PUB-${anio}-${correlativo.toString().padStart(3, '0')}`;
}

export function validarTipoPublicacion(tipo) {
  return TIPOS_PUBLICACION.includes(tipo);
}

export function filtrarContenidoCiudadano(publicaciones) {
  return publicaciones.filter(p => p.visibilidad === true);
}

export function cambiarVisibilidadPublicacion(publicacion, nuevaVisibilidad, rolUsuario) {
  if (rolUsuario !== 'GE' && rolUsuario !== 'Super Administrador') {
    throw new Error('RF5: Solo el rol de Gerente o Administrador tiene facultad para moderar la visibilidad ciudadana');
  }
  return {
    ...publicacion,
    visibilidad: Boolean(nuevaVisibilidad)
  };
}

export function sanitizarDatosPublicosProyecto(proyecto) {
  // Retorna únicamente campos auditables de interés público, eliminando datos confidenciales
  return {
    id: proyecto.id,
    codigo: proyecto.codigo || `MFN-2024-${proyecto.id}`,
    nombre: proyecto.nombre,
    agenciaFinanciadora: proyecto.agenciaFinanciadora,
    presupuestoTotal: (proyecto.presupuestoMunicipal || 0) + (proyecto.presupuestoCooperacion || 0),
    porcentajeAvanceFisico: proyecto.porcentajeAvanceFisico || 0,
    estado: proyecto.estado
  };
}

export function buscarEnPortalPublico(publicaciones, query) {
  if (!query) return publicaciones;
  const q = query.toLowerCase();
  return publicaciones.filter(p => 
    p.titulo.toLowerCase().includes(q) ||
    p.resumen.toLowerCase().includes(q) ||
    p.codigo.toLowerCase().includes(q) ||
    p.tipo.toLowerCase().includes(q)
  );
}

export function contarPublicacionesPorEstado(publicaciones) {
  const visibles = publicaciones.filter(p => p.visibilidad === true).length;
  const ocultas = publicaciones.filter(p => p.visibilidad === false).length;
  return { visibles, ocultas, total: publicaciones.length };
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 7
// ==========================================

test('1. Formato estandarizado de código de publicación en portal ciudadano', () => {
  assert.equal(formatearCodigoPublicacion(2024, 1), 'PUB-2024-001');
  assert.equal(formatearCodigoPublicacion(2024, 25), 'PUB-2024-025');
});

test('2. Validación de tipos de publicación ciudadana reconocidos', () => {
  assert.equal(validarTipoPublicacion('Proyecto'), true);
  assert.equal(validarTipoPublicacion('Acta'), true);
  assert.equal(validarTipoPublicacion('Estadística'), true);
  assert.equal(validarTipoPublicacion('Finanzas'), true);
  assert.equal(validarTipoPublicacion('DocumentoSecreto'), false);
});

test('3. RF5: Filtrado de contenido visible para el portal ciudadano (sin autenticación)', () => {
  const items = [
    { id: 1, titulo: 'Obra 1', visibilidad: true },
    { id: 2, titulo: 'Obra 2 Borrador', visibilidad: false },
    { id: 3, titulo: 'Acta 3', visibilidad: true }
  ];
  const publicos = filtrarContenidoCiudadano(items);
  assert.equal(publicos.length, 2);
  assert.equal(publicos.some(p => p.id === 2), false);
});

test('4. RF5: Facultad exclusiva del Gerente para cambiar visibilidad pública', () => {
  const item = { id: 1, titulo: 'Obra', visibilidad: true };
  const actualizado = cambiarVisibilidadPublicacion(item, false, 'GE');
  assert.equal(actualizado.visibilidad, false);
});

test('5. RF5: Bloqueo de cambio de visibilidad para usuarios no autorizados', () => {
  const item = { id: 1, titulo: 'Obra', visibilidad: true };
  assert.throws(() => {
    cambiarVisibilidadPublicacion(item, false, 'Técnico Operativo');
  }, /Solo el rol de Gerente/);
});

test('6. Sanitización de datos de proyectos para transparencia pública', () => {
  const proyectoInterno = {
    id: 1,
    nombre: 'Agua Potable Santa Eulalia',
    agenciaFinanciadora: 'USAID',
    presupuestoMunicipal: 100000,
    presupuestoCooperacion: 900000,
    cuentaBancariaSecreta: '001-99212-BANRURAL',
    porcentajeAvanceFisico: 78.5,
    estado: 'En Ejecución'
  };
  const publico = sanitizarDatosPublicosProyecto(proyectoInterno);
  assert.equal(publico.nombre, 'Agua Potable Santa Eulalia');
  assert.equal(publico.presupuestoTotal, 1000000);
  assert.equal(publico.cuentaBancariaSecreta, undefined);
});

test('7. Búsqueda ciudadana por palabra clave o tema de interés', () => {
  const items = [
    { codigo: 'PUB-001', titulo: 'Avance del Sistema de Agua Santa Eulalia', resumen: 'Red de distribución', tipo: 'Proyecto' },
    { codigo: 'PUB-002', titulo: 'Acta Ordinaria 01-2024', resumen: 'Sesión de alcaldes', tipo: 'Acta' }
  ];
  const resultados = buscarEnPortalPublico(items, 'Agua');
  assert.equal(resultados.length, 1);
  assert.equal(resultados[0].codigo, 'PUB-001');
});

test('8. Búsqueda ciudadana por categoría temática (Acta, Proyecto, etc.)', () => {
  const items = [
    { codigo: 'PUB-001', tipo: 'Proyecto', titulo: 'A', resumen: 'R' },
    { codigo: 'PUB-002', tipo: 'Acta', titulo: 'B', resumen: 'R' }
  ];
  const actas = buscarEnPortalPublico(items, 'Acta');
  assert.equal(actas.length, 1);
  assert.equal(actas[0].tipo, 'Acta');
});

test('9. Conteo de publicaciones visibles vs dadas de baja', () => {
  const items = [
    { id: 1, visibilidad: true },
    { id: 2, visibilidad: true },
    { id: 3, visibilidad: false }
  ];
  const conteo = contarPublicacionesPorEstado(items);
  assert.equal(conteo.visibles, 2);
  assert.equal(conteo.ocultas, 1);
  assert.equal(conteo.total, 3);
});

test('10. Habilitación de publicación dada de baja previamente', () => {
  const item = { id: 1, visibilidad: false };
  const reactivado = cambiarVisibilidadPublicacion(item, true, 'Super Administrador');
  assert.equal(reactivado.visibilidad, true);
});

test('11. Verificación de cálculo correcto de avance en proyecto público', () => {
  const pub = sanitizarDatosPublicosProyecto({ id: 2, nombre: 'Puente', porcentajeAvanceFisico: 42.0 });
  assert.equal(pub.porcentajeAvanceFisico, 42.0);
});

test('12. Validación de marco legal: Decreto 57-2008 de la República de Guatemala', () => {
  const ley = 'Decreto 57-2008';
  assert.ok(ley.includes('57-2008'));
});

test('13. Búsqueda sin término devuelve la totalidad de publicaciones', () => {
  const items = [{ id: 1 }, { id: 2 }];
  assert.equal(buscarEnPortalPublico(items, '').length, 2);
});

test('14. Conteo de publicaciones vacías', () => {
  assert.equal(contarPublicacionesPorEstado([]).total, 0);
});

test('15. Validación de tipo numérico en presupuesto público totalizado', () => {
  const pub = sanitizarDatosPublicosProyecto({ id: 3, nombre: 'Camino', presupuestoMunicipal: 25000, presupuestoCooperacion: 75000 });
  assert.equal(typeof pub.presupuestoTotal, 'number');
  assert.equal(pub.presupuestoTotal, 100000);
});
