import apiClient from '../apiClient';
import { stopOfflineService } from '../offline-field.js';

export const ROLES = {
  JD: { key: 'JD', label: 'Junta Directiva' },
  GE: { key: 'GE', label: 'Gerencia Ejecutiva' },
  DIRADMIN: { key: 'DIRADMIN', label: 'Dirección Administrativa y Financiera' },
  RRHH: { key: 'RRHH', label: 'Recursos Humanos' },
  AUD: { key: 'AUD', label: 'Auditoría Interna' },
  DIRPROY: { key: 'DIRPROY', label: 'Dirección de Proyectos' },
  JI: { key: 'JI', label: 'Jefe Inmediato' },
  EMP: { key: 'EMP', label: 'Empleado' },
};

// Las sesiones anteriores usaban localStorage. Se borran al cargar la nueva versión.
if (typeof localStorage !== 'undefined') {
  for (const key of ['sirh_token', 'sirh_user', 'mfn_token', 'mfn_user']) localStorage.removeItem(key);
}

let user = $state(null);
let ready = $state(false);
let loading = $state(false);
let refreshPromise;

if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    stopOfflineService().catch(() => {});
    user = null;
  });
}

export const auth = {
  get user() { return user; },
  get ready() { return ready; },
  get loading() { return loading; },
  get isAuthenticated() { return !!user; },
  get role() { return user?.rol || null; },
  get roleLabel() { return user?.rolNombre || null; },
  get permisos() { return user?.permisos || null; },

  puedeVer(modulo) { return !!this.permisos?.modulos?.includes(modulo); },
  puedeEditar(modulo) { return !!this.permisos?.editar?.includes(modulo); },
  puedeAprobar(modulo) { return !!this.permisos?.aprobar?.includes(modulo); },

  async refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const { data } = await apiClient.get('/auth/me');
        user = data;
        return data;
      } catch {
        user = null;
        return null;
      } finally {
        ready = true;
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  },

  async login(correo, contrasena) {
    loading = true;
    try {
      const { data } = await apiClient.post('/auth/login', { correo, contrasena });
      user = data.user;
      ready = true;
      return user;
    } finally {
      loading = false;
    }
  },

  async logout() {
    await apiClient.post('/auth/logout');
    user = null;
    ready = true;
  },
};
