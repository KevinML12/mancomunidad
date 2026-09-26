import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import apiClient from './apiClient';

// ── Dashboard ──────────────────────────────────────────────────────
export const useDashboard = () =>
  createQuery({ queryKey: ['dashboard'], queryFn: async () => (await apiClient.get('/dashboard')).data });

// ── Puestos ────────────────────────────────────────────────────────
export const usePuestos = () =>
  createQuery({ queryKey: ['puestos'], queryFn: async () => (await apiClient.get('/puestos')).data });

// ── Colaboradores ──────────────────────────────────────────────────
export const useColaboradores = () =>
  createQuery({ queryKey: ['colaboradores'], queryFn: async () => (await apiClient.get('/colaboradores')).data });

export const useColaborador = (id) =>
  createQuery({ queryKey: ['colaborador', id], queryFn: async () => (await apiClient.get(`/colaboradores/${id}`)).data, enabled: !!id });

// ── Convocatorias / Reclutamiento ──────────────────────────────────
export const useConvocatorias = () =>
  createQuery({ queryKey: ['convocatorias'], queryFn: async () => (await apiClient.get('/convocatorias')).data });

export const useCrearConvocatoria = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: (body) => apiClient.post('/convocatorias', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convocatorias'] }),
  });
};

export const useActualizarEstadoConvocatoria = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: ({ id, estado }) => apiClient.patch(`/convocatorias/${id}/estado`, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convocatorias'] }),
  });
};

export const useCrearCandidato = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: ({ convocatoriaId, ...body }) => apiClient.post(`/convocatorias/${convocatoriaId}/candidatos`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convocatorias'] }),
  });
};

export const useActualizarCandidato = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: ({ convocatoriaId, candidatoId, ...body }) =>
      apiClient.put(`/convocatorias/${convocatoriaId}/candidatos/${candidatoId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convocatorias'] }),
  });
};

// ── Evaluaciones ───────────────────────────────────────────────────
export const useEvaluaciones = (colaboradorId) =>
  createQuery({
    queryKey: ['evaluaciones', colaboradorId],
    queryFn: async () => (await apiClient.get('/evaluaciones', { params: colaboradorId ? { colaboradorId } : {} })).data,
  });

export const useFactoresEvaluacion = () =>
  createQuery({ queryKey: ['factores-evaluacion'], queryFn: async () => (await apiClient.get('/evaluaciones/factores')).data, staleTime: Infinity });

export const useCrearEvaluacion = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: (body) => apiClient.post('/evaluaciones', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluaciones'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ── Ausencias / Vacaciones ─────────────────────────────────────────
export const useAusencias = () =>
  createQuery({ queryKey: ['ausencias'], queryFn: async () => (await apiClient.get('/ausencias')).data });

export const useSaldoVacaciones = (colaboradorId) =>
  createQuery({
    queryKey: ['saldo-vacaciones', colaboradorId],
    queryFn: async () => (await apiClient.get(`/ausencias/saldo/${colaboradorId}`)).data,
    enabled: !!colaboradorId,
  });

export const useCrearAusencia = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: (body) => apiClient.post('/ausencias', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ausencias'] });
      qc.invalidateQueries({ queryKey: ['saldo-vacaciones'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useResolverAusencia = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: ({ id, estado }) => apiClient.put(`/ausencias/${id}`, { estado }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ausencias'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ── Disciplina ─────────────────────────────────────────────────────
export const useFaltas = () =>
  createQuery({ queryKey: ['faltas'], queryFn: async () => (await apiClient.get('/disciplina')).data });

export const useCrearFalta = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: (body) => apiClient.post('/disciplina', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faltas'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ── Capacitación ───────────────────────────────────────────────────
export const useCapacitaciones = () =>
  createQuery({ queryKey: ['capacitaciones'], queryFn: async () => (await apiClient.get('/capacitaciones')).data });

export const useCertificar = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: ({ capacitacionId, colaboradorId }) => apiClient.post(`/capacitaciones/${capacitacionId}/certificar`, { colaboradorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capacitaciones'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
