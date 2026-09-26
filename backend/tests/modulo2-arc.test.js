import test from 'node:test';
import assert from 'node:assert/strict';

// Business logic and helpers for Módulo 2: Plan de Mejoras (ARC)
export const DIMENSIONES_ARC = [
  'Planificación y Monitoreo',
  'Gestión de Proyectos e Inversión',
  'Probidad, Transparencia y Eficiencia Institucional'
];

export const PRIORIDADES_ARC = ['Alta', 'Media', 'Baja'];
export const ESTADOS_KANBAN = ['Pendiente', 'En Proceso', 'En Revisión', 'Finalizado'];

export function formatearCodigoARC(anio, correlativo) {
  return `ARC-${anio}-${correlativo.toString().padStart(2, '0')}`;
}

export function validarDimensionARC(dimension) {
  return DIMENSIONES_ARC.includes(dimension);
}

export function validarPrioridadARC(prioridad) {
  return PRIORIDADES_ARC.includes(prioridad);
}

export function validarEstadoKanban(estado) {
  return ESTADOS_KANBAN.includes(estado);
}

export function validarTransicionKanban(estadoActual, nuevoEstado) {
  const transicionesPermitidas = {
    'Pendiente': ['En Proceso', 'Cancelado'],
    'En Proceso': ['Pendiente', 'En Revisión'],
    'En Revisión': ['En Proceso', 'Finalizado'],
    'Finalizado': ['En Revisión'] // reapertura
  };
  return transicionesPermitidas[estadoActual]?.includes(nuevoEstado) || false;
}

export function calcularEstadoVencimiento(fechaLimite, estado, fechaReferencia = new Date()) {
  const limite = new Date(fechaLimite);
  const ref = new Date(fechaReferencia);
  const estaVencida = estado !== 'Finalizado' && limite < ref;
  const diferenciaMs = limite.getTime() - ref.getTime();
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
  
  let alerta = 'normal';
  if (estaVencida) {
    alerta = 'vencida';
  } else if (diasRestantes <= 2) {
    alerta = 'urgente';
  }

  return { estaVencida, diasRestantes, alerta };
}

export function calcularPorcentajeCumplimiento(tareas) {
  if (!Array.isArray(tareas) || tareas.length === 0) return 0;
  const finalizadas = tareas.filter(t => t.estado === 'Finalizado').length;
  return Math.round((finalizadas / tareas.length) * 100);
}

export function filtrarTareasKanban(tareas, { dimension, prioridad, municipio, search } = {}) {
  return tareas.filter(t => {
    if (dimension && t.dimension !== dimension) return false;
    if (prioridad && t.prioridad !== prioridad) return false;
    if (municipio && t.municipio !== municipio) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = t.titulo.toLowerCase().includes(q) || 
                    t.codigo.toLowerCase().includes(q) || 
                    t.responsable.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export function procesarCambioEstado(tarea, nuevoEstado) {
  if (!validarTransicionKanban(tarea.estado, nuevoEstado)) {
    throw new Error(`Transición no permitida de ${tarea.estado} a ${nuevoEstado}`);
  }
  const updated = { ...tarea, estado: nuevoEstado };
  if (nuevoEstado === 'Finalizado') {
    updated.fechaFinalizada = new Date().toISOString();
  } else if (tarea.estado === 'Finalizado' && nuevoEstado !== 'Finalizado') {
    updated.fechaFinalizada = null;
  }
  return updated;
}

// ==========================================
// 15 PRUEBAS UNITARIAS - MÓDULO 2 (ARC)
// ==========================================

test('1. Formateo estandarizado de código institucional ARC (ARC-2024-XX)', () => {
  assert.equal(formatearCodigoARC(2024, 3), 'ARC-2024-03');
  assert.equal(formatearCodigoARC(2024, 12), 'ARC-2024-12');
});

test('2. Validación de las 3 dimensiones organizacionales oficiales del informe ARC 2023', () => {
  assert.equal(validarDimensionARC('Planificación y Monitoreo'), true);
  assert.equal(validarDimensionARC('Gestión de Proyectos e Inversión'), true);
  assert.equal(validarDimensionARC('Probidad, Transparencia y Eficiencia Institucional'), true);
  assert.equal(validarDimensionARC('Dimensión Inexistente'), false);
});

test('3. Validación de escala de prioridades (Alta, Media, Baja)', () => {
  assert.equal(validarPrioridadARC('Alta'), true);
  assert.equal(validarPrioridadARC('Media'), true);
  assert.equal(validarPrioridadARC('Baja'), true);
  assert.equal(validarPrioridadARC('UrgenteExtrema'), false);
});

test('4. Validación de columnas oficiales del tablero Kanban institucional', () => {
  assert.equal(validarEstadoKanban('Pendiente'), true);
  assert.equal(validarEstadoKanban('En Proceso'), true);
  assert.equal(validarEstadoKanban('En Revisión'), true);
  assert.equal(validarEstadoKanban('Finalizado'), true);
  assert.equal(validarEstadoKanban('ArchivadoDirecto'), false);
});

test('5. Transición válida en flujo Kanban: Pendiente -> En Proceso', () => {
  assert.equal(validarTransicionKanban('Pendiente', 'En Proceso'), true);
});

test('6. Transición válida en flujo Kanban: En Proceso -> En Revisión', () => {
  assert.equal(validarTransicionKanban('En Proceso', 'En Revisión'), true);
});

test('7. Transición válida en flujo Kanban: En Revisión -> Finalizado', () => {
  assert.equal(validarTransicionKanban('En Revisión', 'Finalizado'), true);
});

test('8. Bloqueo de salto directo no autorizado: Pendiente -> Finalizado sin revisión', () => {
  assert.equal(validarTransicionKanban('Pendiente', 'Finalizado'), false);
});

test('9. Alerta visual roja cuando una meta estratégica excede su fecha límite', () => {
  const resultado = calcularEstadoVencimiento('2024-03-01', 'En Proceso', '2024-03-25');
  assert.equal(resultado.estaVencida, true);
  assert.equal(resultado.alerta, 'vencida');
  assert.ok(resultado.diasRestantes < 0);
});

test('10. Una meta concluida (Finalizado) no debe marcarse como vencida aunque su fecha haya pasado', () => {
  const resultado = calcularEstadoVencimiento('2024-03-01', 'Finalizado', '2024-03-25');
  assert.equal(resultado.estaVencida, false);
});

test('11. Activación de alerta preventiva "urgente" cuando faltan 2 días o menos para el vencimiento', () => {
  const resultado = calcularEstadoVencimiento('2024-03-26', 'En Proceso', '2024-03-25');
  assert.equal(resultado.alerta, 'urgente');
  assert.equal(resultado.diasRestantes, 1);
});

test('12. Cálculo del porcentaje global de cumplimiento institucional ARC', () => {
  const tareas = [
    { id: 1, estado: 'Finalizado' },
    { id: 2, estado: 'Finalizado' },
    { id: 3, estado: 'En Proceso' },
    { id: 4, estado: 'Pendiente' }
  ];
  assert.equal(calcularPorcentajeCumplimiento(tareas), 50);
});

test('13. Filtrado de tareas del tablero Kanban por dimensión estratégica ARC', () => {
  const tareas = [
    { codigo: 'ARC-01', dimension: 'Planificación y Monitoreo', prioridad: 'Alta', municipio: 'Regional', titulo: 'T1', responsable: 'R1' },
    { codigo: 'ARC-02', dimension: 'Gestión de Proyectos e Inversión', prioridad: 'Media', municipio: 'Santa Eulalia', titulo: 'T2', responsable: 'R2' }
  ];
  const filtradas = filtrarTareasKanban(tareas, { dimension: 'Planificación y Monitoreo' });
  assert.equal(filtradas.length, 1);
  assert.equal(filtradas[0].codigo, 'ARC-01');
});

test('14. Asignación automática de estampa de tiempo al finalizar tarea y manejo de excepción', () => {
  const tarea = { id: 1, estado: 'En Revisión', fechaFinalizada: null };
  const finalizada = procesarCambioEstado(tarea, 'Finalizado');
  assert.equal(finalizada.estado, 'Finalizado');
  assert.ok(finalizada.fechaFinalizada !== null);

  assert.throws(() => {
    procesarCambioEstado({ id: 2, estado: 'Pendiente' }, 'Finalizado');
  }, /Transición no permitida/);
});

test('15. Limpieza de estampa de tiempo si una tarea finalizada se reabre a "En Revisión"', () => {
  const tareaFinalizada = { id: 1, estado: 'Finalizado', fechaFinalizada: '2024-03-20T10:00:00Z' };
  const reabierta = procesarCambioEstado(tareaFinalizada, 'En Revisión');
  assert.equal(reabierta.estado, 'En Revisión');
  assert.equal(reabierta.fechaFinalizada, null);
});
