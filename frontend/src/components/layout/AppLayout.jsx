import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Icon, Halos } from '../ui/Glass';
import useGlassSpecular from '../../hooks/useGlassSpecular';

// Ítems del sidebar con el módulo de permisos que controla su visibilidad
// (Rol.permisos.modulos) — refleja el diagrama de casos de uso del
// Capítulo V (5.1) y RF-04 (control de acceso basado en roles).
const NAV_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Tablero', exact: true, modulo: 'dashboard' },
  { to: '/estructura', icon: 'badge', label: 'Estructura Organizacional', modulo: 'estructura' },
  { to: '/reclutamiento', icon: 'person_search', label: 'Reclutamiento y Selección', modulo: 'reclutamiento' },
  { to: '/evaluaciones', icon: 'task_alt', label: 'Evaluación de Desempeño', modulo: 'evaluaciones' },
  { to: '/ausencias', icon: 'calendar_month', label: 'Vacaciones y Permisos', modulo: 'ausencias' },
  { to: '/disciplina', icon: 'warning', label: 'Régimen Disciplinario', modulo: 'disciplina' },
  { to: '/capacitacion', icon: 'school', label: 'Capacitación Institucional', modulo: 'capacitacion' },
];

function SidebarContent({ onClose }) {
  const { logout, user, puedeVer } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS.filter((i) => puedeVer(i.modulo));

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full glass-light rounded-[28px] overflow-hidden">
      <div className="px-5 py-6 border-b border-bg/10">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
          <span className="grid place-items-center w-10 h-10 rounded-2xl bg-bg shadow-card">
            <span className="text-white font-black text-15">MFN</span>
          </span>
          <div className="min-w-0">
            <p className="text-15 font-extrabold tracking-tightish text-bg leading-tight">SIRH · MFN</p>
            <p className="text-10 font-extrabold uppercase tracking-widest text-bg/55 mt-0.5">Gestión de RRHH</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {items.map(({ to, icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-14 font-semibold tracking-tightish transition-all duration-300 ${
                isActive ? 'bg-bg text-white shadow-card' : 'text-bg/60 hover:text-bg hover:bg-bg/6'
              }`
            }
          >
            <Icon name={icon} className="w-[18px] h-[18px] shrink-0" stroke={1.8} />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-bg/10 space-y-0.5">
        <div className="px-3 py-2.5 flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-bg text-white text-13 font-extrabold shadow-card shrink-0">
            {(user?.nombre || '?')[0].toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-13 font-bold text-bg truncate">{user?.nombre}</p>
            <p className="text-12 text-bg/45 truncate">{user?.correo}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-14 font-semibold text-bg/60 hover:text-rose hover:bg-rose/8 transition-colors"
        >
          <Icon name="logout" className="w-[18px] h-[18px] shrink-0" stroke={1.8} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { roleLabel } = useAuth();
  useGlassSpecular();

  return (
    <div className="admin-light relative flex h-screen bg-paper overflow-hidden text-bg">
      <Halos variant="section" />

      <aside className="hidden md:flex w-72 shrink-0 flex-col p-3 relative z-10">
        <SidebarContent />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        <div className="md:hidden h-14 border-b border-bg/10 glass-light rounded-none flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="text-bg/60 hover:text-bg transition-colors" aria-label="Abrir menú">
            <Icon name="menu" className="w-[22px] h-[22px]" stroke={1.8} />
          </button>
          <span className="text-15 text-bg font-extrabold tracking-tightish">SIRH · MFN</span>
        </div>

        {/* Barra de rol activo — visible siempre, para dejar claro en la
            demo qué perfil de acceso se está viendo (RF-03/RF-04). */}
        <div className="hidden md:flex items-center gap-2 px-6 py-3 border-b border-bg/8">
          <span className="w-2 h-2 rounded-full bg-celeste" />
          <span className="text-12 font-bold uppercase tracking-widest text-bg/50">
            Sesión activa: {roleLabel}
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-bg/40 backdrop-blur-md z-40 md:hidden animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden p-3 animate-slide-up">
            <div className="absolute top-6 right-6 z-10">
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-bg/10 text-bg/70 hover:text-bg flex items-center justify-center transition-colors" aria-label="Cerrar menú">
                <Icon name="close" className="w-4 h-4" stroke={2} />
              </button>
            </div>
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
