import apiClient from '../apiClient';

export const ROLES = {
  JD:       { key: 'JD',       label: 'Junta Directiva' },
  GE:       { key: 'GE',       label: 'Gerencia Ejecutiva' },
  DIRADMIN: { key: 'DIRADMIN', label: 'Dirección Administrativa y Financiera' },
  RRHH:     { key: 'RRHH',     label: 'Recursos Humanos' },
  AUD:      { key: 'AUD',      label: 'Auditoría Interna' },
  DIRPROY:  { key: 'DIRPROY',  label: 'Dirección de Proyectos' },
  JI:       { key: 'JI',       label: 'Jefe Inmediato' },
  EMP:      { key: 'EMP',      label: 'Empleado' },
};

let token = $state(
  typeof localStorage !== 'undefined' && localStorage.getItem('mfn_token')
    ? localStorage.getItem('mfn_token')
    : 'demo-token-mfn'
);
let user = $state(
  typeof localStorage !== 'undefined' && localStorage.getItem('mfn_user')
    ? JSON.parse(localStorage.getItem('mfn_user'))
    : {
        nombre: 'Ing. Carlos Méndez',
        correo: 'gerencia@mfn.gob.gt',
        rol: 'GE',
        rolNombre: 'Gerencia Ejecutiva'
      }
);
let loading = $state(false);

if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    token = null;
    user = null;
  });
}

export const auth = {
  get token() { return token; },
  get user() { return user; },
  get loading() { return loading; },
  get isAuthenticated() { return !!token; },
  get role() { return user?.rol || null; },
  get roleLabel() { return user?.rolNombre || null; },
  get permisos() { return user?.permisos || null; },
  
  puedeVer(modulo) { return !!this.permisos?.modulos?.includes(modulo); },
  puedeEditar(modulo) { return !!this.permisos?.editar?.includes(modulo); },
  puedeAprobar(modulo) { return !!this.permisos?.aprobar?.includes(modulo); },

  async login(correo, contrasena) {
    loading = true;
    try {
      const { data } = await apiClient.post('/auth/login', { correo, contrasena });
      localStorage.setItem('sirh_token', data.token);
      localStorage.setItem('sirh_user', JSON.stringify(data.user));
      token = data.token;
      user = data.user;
      return data.user;
    } finally {
      loading = false;
    }
  },

  logout() {
    localStorage.removeItem('sirh_token');
    localStorage.removeItem('sirh_user');
    token = null;
    user = null;
  }
};
