# SIRH-MFN · Sistema de Información de Recursos Humanos
### Mancomunidad Frontera del Norte — Proyecto de Graduación

Este repositorio contiene la solución integral para el **Sistema de Información para la Gestión de Recursos Humanos (SIRH-MFN)** de la Mancomunidad Frontera del Norte, compuesto por su Frontend SPA y su API Backend REST.

---

## 📁 Estructura del Repositorio

```
mancomunidad/
├── frontend/             # Panel SPA en React 19 + Vite + Tailwind CSS + Liquid Glass
│   ├── src/
│   │   ├── components/   # Componentes UI (Glass, Buttons, StatCards, Layout)
│   │   ├── context/      # Autenticación y RBAC por roles
│   │   ├── pages/        # Evaluaciones, Solicitudes, Reclutamiento, Login, Tablero, etc.
│   │   └── lib/          # Cliente API y Hooks de TanStack Query
│   └── vercel.json
│
├── backend/              # API REST en Node.js + Express + Prisma ORM
│   ├── prisma/           # Schema entidad-relación (SQLite / PostgreSQL) y Seed
│   ├── src/              # Rutas, Middleware de autenticación JWT y Auditoría
│   ├── api/              # Serverless entrypoint para Vercel
│   └── Dockerfile
│
├── requerimientos/       # Documentación oficial de la MFN (Reglamento, Manuales, Códigos)
└── referencias/          # Documentos del Proyecto de Graduación
```

---

## 🚀 Arranque Local Rápido

### 1. Backend
```bash
cd backend
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```
> API disponible en: `http://localhost:8080`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
> Aplicación disponible en: `http://localhost:3000`

---

## 🔐 Cuentas de Demostración (Contraseña: `mfn2026`)

| Rol | Correo | Módulos Clave |
|---|---|---|
| Recursos Humanos | `rrhh@mfn.gob.gt` | Reclutamiento, Evaluaciones, Catálogo de Puestos |
| Jefe Inmediato | `jefatura@mfn.gob.gt` | Aprobación de Ausencias, Calificación de Colaboradores |
| Empleado | `empleado@mfn.gob.gt` | Solicitud de Vacaciones con Saldo en Vivo |
| Gerencia Ejecutiva | `gerencia@mfn.gob.gt` | Tablero de KPIs, Alertas y Plazos |
