# MFN Digital · Plataforma de Gestión y Coordinación Intermunicipal
### Mancomunidad de Municipios de la Frontera del Norte de Huehuetenango · República de Guatemala
*Proyecto de Graduación — Licenciatura en Ingeniería en Sistemas de Información y Ciencias de la Computación*

---

## 🏛️ Definición e Identidad Institucional

> **MFN Digital** es una plataforma de gestión y coordinación intermunicipal que centraliza proyectos de inversión pública territorial, plan de mejoras institucionales (ARC), ejecución presupuestaria y tesorería (CGC), gobernanza asamblearia, convenios de cooperación internacional, censos de agua y saneamiento (ASH), transparencia ciudadana y talento humano (SIRH) de la Mancomunidad Frontera del Norte, facilitando la toma de decisiones gerenciales, la optimización operativa y la rendición de cuentas irrefutable.

La Mancomunidad Frontera del Norte (MFN) está integrada legal y territorialmente por **seis municipios canónicos** del departamento de Huehuetenango:
1. **Santa Eulalia** (Sede administrativa institucional)
2. **San Pedro Soloma**
3. **San Mateo Ixtatán**
4. **San Rafael la Independencia**
5. **Santa Cruz Barillas**
6. **San Juan Ixcoy**

---

## 🧩 Arquitectura Modular del Sistema

El ecosistema integra 8 módulos estratégicos interconectados en una base de datos relacional PostgreSQL con bitácora inmutable:

| Módulo | Denominación | Funcionalidad Clave y Base Normativa |
|---|---|---|
| **01** | **Proyectos Intermunicipales** | Formulación, ejecución física y financiera de obras territoriales, geolocalización satelital y cadena de evidencias fotográficas. |
| **02** | **Plan de Mejoras (ARC)** | Matriz de Desempeño Institucional y seguimiento de hallazgos de consultoría (2023-2024) mediante tablero Kanban interactivo drag & drop. |
| **03** | **Finanzas y Tesorería** | Registro de cuotas ordinarias municipales, fondos de cooperación, emisión oficial del **Recibo Forma 63-A2 (CGC)** con conversión de cifras a letras y dictamen de rendición de cuentas para la Asamblea. |
| **04** | **Gobernanza Asamblearia** | Archivo digital de actas ordinarias y extraordinarias, foliatura autorizada por la CGC y seguimiento vinculante de acuerdos suscritos por los alcaldes. |
| **05** | **Convenios y Cooperación** | Matriz de compromisos y plazos con agencias internacionales (USAID, HELVETAS, BID) y ministerios de Estado con semáforo de vencimientos. |
| **06** | **Agua y Saneamiento (ASH)** | Censos comunitarios, monitoreo microbiológico y cloro residual (PPM) en acueductos rurales en articulación con las OMAS municipales. |
| **07** | **Transparencia Ciudadana** | Portal público conforme al Decreto 57-2008 (Ley de Acceso a la Información Pública), publicación de informes de gestión y buzón de peticiones comunitarias. |
| **08** | **Inteligencia Territorial** | **Algoritmo IPIM** (Priorización de Inversión Intermunicipal Multicriterio) para asignación de fondos sin sesgo político y **Certificación Forense SHA-256 (Merkle Root)** verificada contra la bitácora histórica. |
| **SIRH** | **Talento Humano (Submódulo)** | Directorio laboral, cálculo de antigüedad de servicio, control de balance de vacaciones (Art. 38 RIT, 20 días hábiles), catálogo jerárquico de puestos (A, B, C, D) y régimen disciplinario. |

---

## 💻 Pila Tecnológica Implementada

La arquitectura actual corresponde a una solución desacoplada de alto rendimiento y bajo acoplamiento:

- **Frontend SPA**: SvelteKit 5 (arquitectura de reactividad basada en *Runes*: `$state`, `$derived`, `$props`), Vite 6, Tailwind CSS, Heroicons / Lucide.
- **Backend API REST**: Node.js v20 LTS, Express v4, Prisma ORM v5, autenticación JWT criptográfica (`HS256`) con caducidad estricta y control de acceso basado en roles y permisos (RBAC).
- **Base de Datos**: PostgreSQL v16 serverless alojado en **Neon DB** con esquema relacional normalizado y bitácora de auditoría transaccional (`BitacoraAuditoria`).
- **Seguridad Forense**: Motor de sellado criptográfico mediante árbol de Merkle SHA-256 que contrasta el estado actual contra puntos de control históricos asentados en el libro mayor de auditoría.
- **Despliegue Cloud**: Vercel Serverless Platform con pipelines de integración y entrega continua (CI/CD).

*(Nota metodológica: La arquitectura actual satisface plenamente las métricas de concurrencia y latencia del estudio pre-experimental. Los servicios de procesamiento asíncrono pesado quedan documentados para una eventual fase de migración a Go conforme evolucione el volumen transaccional de los municipios).*

---

## 🔒 Modelo de Seguridad y Auditoría

1. **Autenticación Estricta**: Tokens JWT firmados con secreto criptográfico de 256 bits; se eliminó cualquier vía de acceso bypass o token fijo de prueba en entornos productivos.
2. **RBAC Granular**: Middleware `requirePermission` aplicado a todas las operaciones mutantes (`POST`, `PUT`, `DELETE`), verificando roles institucionales:
   - `ADMIN`: Control total de configuración y seguridad.
   - `GERENCIA`: Aprobación gerencial, dictámenes de asamblea y supervisión global.
   - `TECNICO`: Formulación y actualización de proyectos, tareas ARC y censos ASH.
   - `AUDITOR`: Acceso de fiscalización, consulta forense e inspección CGC.
   - `COMUNICACION`: Publicación en el portal de transparencia ciudadana.
3. **Trazabilidad Total**: Cada mutación ejecuta `logAction(usuarioId, accion, entidad, entidadId)` en `BitacoraAuditoria`, registrando marca temporal ISO inmutable.
4. **Recuperación de Credenciales**: Flujo seguro de dos pasos mediante `POST /api/v1/auth/recuperar` y `POST /api/v1/auth/restablecer` con tokens criptográficos de expiración de 15 minutos.

---

## 🌐 URLs de Producción

- **Frontend Web Institucional**: [https://frontend-svelte-vert.vercel.app](https://frontend-svelte-vert.vercel.app)
- **Backend API REST**: [https://backend-eosin-omega-81.vercel.app](https://backend-eosin-omega-81.vercel.app)
- **Endpoint de Integridad Forense**: `https://backend-eosin-omega-81.vercel.app/api/v1/inteligencia/sello-forense`

---

## 🛠️ Instalación y Ejecución Local

### Prerrequisitos
- Node.js >= 20.0.0
- npm >= 10.0.0
- Instancia de PostgreSQL (local o cadena de conexión a Neon DB en `.env`)

### 1. Backend API
```bash
cd backend
npm install
npx prisma generate
npm run prisma:seed
npm run dev
```
> Servidor disponible en: `http://localhost:8080/api/v1`

### 2. Frontend SvelteKit
```bash
cd frontend-svelte
npm install
npm run dev
```
> Aplicación disponible en: `http://localhost:5173`

### 3. Ejecución de Pruebas Unitarias
```bash
cd backend
npm test
```
> Ejecuta la suite completa de **120 pruebas unitarias** que certifican las reglas de negocio de los 8 módulos institucionales.

---

## 📋 Cuentas de Acceso Institucional (Credenciales Reales en Neon DB)

| Rol Institucional | Correo Electrónico | Contraseña | Atribuciones Principales |
|---|---|---|---|
| **Gerencia Ejecutiva** | `gerencia@mfn.gob.gt` | `mfn2026` | Aprobación de planes, dictamen de asamblea, priorización IPIM y sello CGC |
| **Dirección Administrativa Financiera (DAF)** | `daf@mfn.gob.gt` | `mfn2026` | Emisión de Recibo 63-A2, ejecución presupuestaria y tesorería |
| **Coordinación Técnica (DMP)** | `proyectos@mfn.gob.gt` | `mfn2026` | Registro de obras intermunicipales, carga de evidencias y geolocalización |
| **Oficial de Monitoreo (ARC)** | `monitoreo@mfn.gob.gt` | `mfn2026` | Gestión del tablero Kanban de mejoras institucionales |
| **Especialista de Agua y Saneamiento** | `ash@mfn.gob.gt` | `mfn2026` | Censos rurales, medición de cloro residual y alertas OMAS |
| **Auditoría Interna / CGC** | `auditoria@mfn.gob.gt` | `mfn2026` | Verificación de actas, libro foliado y cadena de custodia criptográfica |

---

## ⚖️ Marco Normativo y Fuentes Institucionales

- **Código Municipal de Guatemala** (Decreto Número 12-2002 del Congreso de la República).
- **Ley Orgánica de la Contraloría General de Cuentas** (Decreto Número 31-2002).
- **Ley de Acceso a la Información Pública** (Decreto Número 57-2008).
- **Estatutos de Constitución de la Mancomunidad Frontera del Norte**.
- **Reglamento Interno de Trabajo (RIT)** de la Mancomunidad Frontera del Norte.
- **Manual de Evaluación del Desempeño por Competencias** (Consultoría MFN 2023).
- **Plan de Mejoras Institucionales ARC** (Trimestre 3, Versión Final 2024).
