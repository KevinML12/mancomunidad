# Estado y Guía de Despliegue de MFN Digital

**Fecha de actualización:** 3 de octubre de 2026.  
**Estado:** ✅ Despliegue funcional de extremo a extremo completado y verificado en producción.

---

## 🔍 Diagnóstico y Resolución del Esquema de Base de Datos

En la base de datos PostgreSQL en la nube conviven dos esquemas independientes:
- **`public`**: Utilizado por otra aplicación (`cursos`, `marcajes`, `matriculas`, etc.).
- **`mancomunidad`**: Esquema institucional exclusivo de la Mancomunidad Frontera del Norte que contiene las 27 tablas oficiales del sistema.

### Acciones ejecutadas en producción:
1. Se aplicaron las migraciones DDL directamente sobre el esquema `mancomunidad`:
   - `Usuario.sessionVersion` (soporte de revocación de sesiones concurrentes al restablecer contraseña).
   - `BitacoraAuditoria.antesHash` y `BitacoraAuditoria.despuesHash` (auditoría forense de mutaciones con hashes pre y post-escritura).
   - `Proyecto.municipio` (asignación explícita a la jurisdicción canónica).
   - `EvidenciaProyecto.contenido`, `sha256`, `tipoMime` (carga binaria de evidencias en Base64 con verificación de huella digital SHA-256).
   - Tabla `RecuperacionClave` (tokens criptográficos expirables de un solo uso).
   - Tabla `PuntoControlIntegridad` (libro mayor de checkpoints de Merkle Root).
2. Se actualizaron los permisos institucionales en la tabla `Rol` según el catálogo RBAC `ROLE_PERMISSIONS`.
3. Se generó y selló el primer punto de control criptográfico en `PuntoControlIntegridad`.

---

## 🌐 URLs Oficiales de Producción

| Componente | URL de Producción | Estado |
|---|---|---|
| **Frontend Web** (SvelteKit 5) | [https://frontend-svelte-vert.vercel.app](https://frontend-svelte-vert.vercel.app) | En línea (200 OK) |
| **Backend API** (Node.js/Express) | [https://backend-eosin-omega-81.vercel.app](https://backend-eosin-omega-81.vercel.app) | En línea (200 OK) |
| **Integridad Criptográfica** | `GET https://backend-eosin-omega-81.vercel.app/api/v1/inteligencia/sello-forense` | COINCIDE CON PUNTO DE CONTROL |
| **Portal Ciudadano Público** | `GET https://backend-eosin-omega-81.vercel.app/api/v1/transparencia/publico` | En línea (200 OK) |

---

## 🚀 Instrucciones para Desplegar Tú Mismo

Si en el futuro deseas desplegar tú mismo los cambios realizados en el frontend o backend, sigue estos pasos:

### 1. Despliegue del Frontend (SvelteKit)
Desde la terminal en tu máquina:
```bash
cd /Users/kevv/Documents/proyectos/mancomunidad/frontend-svelte
# Verificar compilación local
npm run build

# Desplegar directamente a producción en Vercel
CI=1 npx vercel --prod --yes
```

### 2. Despliegue del Backend (API REST)
Desde la terminal en tu máquina:
```bash
cd /Users/kevv/Documents/proyectos/mancomunidad/backend
# Generar cliente de Prisma para producción
npm run build

# Ejecutar pruebas unitarias de validación
npm test

# Desplegar directamente a producción en Vercel
CI=1 npx vercel --prod --yes
```

> **Nota:** El prefijo `CI=1` evita que la interfaz de línea de comandos de Vercel se bloquee solicitando confirmaciones interactivas de actualización.

### 3. Ejecución de Pruebas de Integración Locales
```bash
cd /Users/kevv/Documents/proyectos/mancomunidad/backend
npm run test:integration
```
> Ejecuta la batería de pruebas de integración con SQLite aislado que valida login, RBAC estricto, integridad de hashes y flujos de recuperación.

---

## 🔐 Credenciales Institucionales de Acceso

| Rol Institucional | Correo | Contraseña |
|---|---|---|
| **Gerencia Ejecutiva** | `gerencia@mfn.gob.gt` | `mfn2026` |
| **Dirección Financiera (DAF)** | `daf@mfn.gob.gt` | `mfn2026` |
| **Coordinación Técnica** | `proyectos@mfn.gob.gt` | `mfn2026` |
| **Oficial de Monitoreo ARC** | `monitoreo@mfn.gob.gt` | `mfn2026` |
| **Especialista ASH** | `ash@mfn.gob.gt` | `mfn2026` |
| **Auditoría Interna** | `auditoria@mfn.gob.gt` | `mfn2026` |
