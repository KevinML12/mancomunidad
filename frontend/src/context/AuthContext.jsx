import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../lib/apiClient';

const AuthContext = createContext(null);

// Catálogo de roles para la pantalla de login demo. La fuente de verdad de
// nombre y permisos es siempre el backend (tabla Rol) — esto solo alimenta
// el selector visual antes de que exista un usuario autenticado.
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

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sirh_token'));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('sirh_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onUnauthorized = () => { setToken(null); setUser(null); };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  // Login real contra POST /auth/login (Cap. V, RF de autenticación) —
  // el backend valida contra la tabla usuario (bcrypt) y firma un JWT.
  const login = async (correo, contrasena) => {
    const { data } = await apiClient.post('/auth/login', { correo, contrasena });
    localStorage.setItem('sirh_token', data.token);
    localStorage.setItem('sirh_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('sirh_token');
    localStorage.removeItem('sirh_user');
    setToken(null);
    setUser(null);
  };

  const permisos = user?.permisos || null;
  // Helpers de RBAC — leen el JSON de permisos que emite el backend
  // (Rol.permisos: { modulos, editar, aprobar }) en vez de comparar código de rol.
  const puedeVer = (modulo) => !!permisos?.modulos?.includes(modulo);
  const puedeEditar = (modulo) => !!permisos?.editar?.includes(modulo);
  const puedeAprobar = (modulo) => !!permisos?.aprobar?.includes(modulo);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      isAuthenticated: !!token,
      role: user?.rol || null,
      roleLabel: user?.rolNombre || null,
      permisos,
      puedeVer,
      puedeEditar,
      puedeAprobar,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
