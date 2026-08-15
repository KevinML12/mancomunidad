import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth, ROLES } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Halos, Icon } from '../components/ui/Glass';
import useGlassSpecular from '../hooks/useGlassSpecular';

const DEMO_GROUPS = [
  {
    titulo: 'Gobierno & Dirección',
    cuentas: [
      { rol: 'JD', correo: 'juntadirectiva@mfn.gob.gt' },
      { rol: 'GE', correo: 'gerencia@mfn.gob.gt' },
    ],
  },
  {
    titulo: 'Administración & Control',
    cuentas: [
      { rol: 'RRHH', correo: 'rrhh@mfn.gob.gt' },
      { rol: 'DIRADMIN', correo: 'diradmin@mfn.gob.gt' },
      { rol: 'AUD', correo: 'auditoria@mfn.gob.gt' },
      { rol: 'DIRPROY', correo: 'dirproyectos@mfn.gob.gt' },
    ],
  },
  {
    titulo: 'Jefaturas & Personal',
    cuentas: [
      { rol: 'JI', correo: 'jefatura@mfn.gob.gt' },
      { rol: 'EMP', correo: 'empleado@mfn.gob.gt' },
    ],
  },
];

export default function Login() {
  useGlassSpecular();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async (email, pass) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(email, pass);
      toast.success(`Bienvenido/a, ${user.nombre}`);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión. Verifique que el backend esté corriendo en el puerto 8080.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    doLogin(correo, contrasena);
  };

  return (
    <div className="admin-light min-h-screen bg-paper relative flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <Halos variant="section" />
      <div className="relative z-10 w-full max-w-lg">
        <div className="glass-light rounded-[32px] p-8 md:p-10 shadow-card-lg animate-rise">
          {/* Logo y Encabezado */}
          <div className="flex flex-col items-center mb-7">
            <div className="relative mb-3">
              <span className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-bg to-bg-soft shadow-card border border-white/20">
                <span className="text-white font-black text-20 tracking-wider">MFN</span>
              </span>
            </div>
            <h1 className="text-22 font-black tracking-tightish text-bg text-center">
              SIRH · Mancomunidad Frontera del Norte
            </h1>
            <p className="text-13 text-bg/60 mt-1 text-center max-w-sm">
              Sistema de Información para la Gestión de Recursos Humanos (Capítulo V)
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Correo institucional"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@mfn.gob.gt"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && (
              <div className="p-3 rounded-xl bg-rose/10 border border-rose/20 text-13 font-semibold text-rose flex items-center gap-2">
                <Icon name="error" className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" variant="filled" size="lg" className="w-full font-bold" disabled={loading}>
              {loading ? 'Validando credenciales…' : 'Ingresar al Sistema'}
            </Button>
          </form>

          {/* Selector de Cuentas Demo por Roles */}
          <div className="mt-8 pt-6 border-t border-bg/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-11 font-extrabold uppercase tracking-widest text-bg/40">
                Acceso Rápido · Cuentas de Demostración
              </p>
              <span className="text-11 font-mono text-celeste-hov bg-celeste/10 px-2 py-0.5 rounded-md font-bold">
                clave: mfn2026
              </span>
            </div>

            <div className="space-y-3">
              {DEMO_GROUPS.map((g) => (
                <div key={g.titulo}>
                  <span className="text-10 font-bold uppercase tracking-wider text-bg/30 block mb-1.5 ml-1">
                    {g.titulo}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {g.cuentas.map((d) => (
                      <button
                        key={d.rol}
                        type="button"
                        onClick={() => {
                          setCorreo(d.correo);
                          setContrasena('mfn2026');
                          doLogin(d.correo, 'mfn2026');
                        }}
                        disabled={loading}
                        className="flex flex-col items-start px-3 py-2 rounded-xl text-left text-bg/75 bg-bg/[0.03] hover:bg-bg/8 hover:text-bg transition-all border border-bg/5 hover:border-bg/10 disabled:opacity-50 group"
                      >
                        <span className="text-12 font-bold leading-tight group-hover:text-celeste-hov transition-colors">
                          {ROLES[d.rol]?.label || d.rol}
                        </span>
                        <span className="text-bg/35 font-mono text-10 mt-0.5 truncate w-full">
                          {d.correo}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
