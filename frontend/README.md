# SIRH-MFN — Frontend

Panel del Sistema de Información para la Gestión de Recursos Humanos de la
Mancomunidad Frontera del Norte. React 19 + Vite + Tailwind, sobre el mismo
sistema de diseño "Liquid Glass" (panel claro estilo Apple) reutilizado del
proyecto Casa del Rey.

Todos los datos vienen del backend real (`../sirh-mfn-backend`) — no hay
datos hardcodeados; ver `src/lib/api.js`.

## Arranque local

```bash
npm install
npm run dev
```

Requiere el backend corriendo en `http://localhost:8080` (ver
`../sirh-mfn-backend/README.md`). Configurable en `.env.local`
(`VITE_API_URL`).

> Nota: en esta máquina los puertos 5173/5180 (default de Vite) estaban
> bloqueados por algo del sistema (EACCES persistente incluso sin nada
> escuchando ahí) — por eso `vite.config.js` fija el puerto 3000. Si eso
> cambia en otra máquina, se puede volver al puerto por defecto.

## Roles y RBAC

El sidebar (`src/components/layout/AppLayout.jsx`) muestra distintos módulos
según el rol de `useAuth()` — JD, GE, RRHH, JI, EMP (Cap. I, 1.9 Variables).
Login real contra `POST /auth/login`, JWT guardado en `localStorage`.

## Despliegue

`vercel.json` ya incluido (rewrite de SPA). Pasos:

1. Desplegar primero el backend (ver su README) y obtener su URL pública.
2. `vercel --prod` (o conectar el repo en vercel.com) desde esta carpeta.
3. Configurar la variable de entorno `VITE_API_URL` en Vercel apuntando al
   backend desplegado, ej. `https://sirh-mfn-backend.up.railway.app/api/v1`.

## Estructura

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Button, Input, StatCard, Glass (Icon/Halos)
│   │   └── layout/       # AppLayout (sidebar por rol), ProtectedRoute, PageHeader
│   ├── context/          # AuthContext (JWT real)
│   ├── lib/              # apiClient (axios) + api.js (hooks TanStack Query)
│   ├── pages/             # Login, Tablero, EstructuraOrganizacional,
│   │                       # Reclutamiento, Evaluaciones, Ausencias,
│   │                       # Disciplina, Capacitacion
│   └── router.jsx
└── vercel.json
```
