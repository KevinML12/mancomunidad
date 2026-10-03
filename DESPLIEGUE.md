# Estado del despliegue

3 de octubre de 2026. Destinos solicitados: Supabase para PostgreSQL y Vercel para interfaz y API.

El proyecto Vercel `mancomunidad` se configuró para compilar `frontend-svelte` con SvelteKit. La interfaz actual cuenta con un despliegue provisional listo, sin promoverlo al dominio principal hasta verificar la conexión del backend. Conserva los tres municipios activos: San Pedro Soloma, Santa Eulalia y San Rafael la Independencia.

Despliegue provisional: https://mancomunidad-hrqa35nlw-kevinml12s-projects.vercel.app

La variable DATABASE_URL del proyecto Vercel `backend` apunta a una base que contiene cursos, usuarios y marcajes de otra aplicación. La migración intentada se revirtió completamente al no encontrar las tablas de MFN. Se guardó un respaldo cifrado fuera del repositorio. El despliegue temporal de mantenimiento fue eliminado y sus rutas no forman parte del código final.

En la sesión de Supabase se encontraron `moda-organica` y dos proyectos llamados `KevinML12's Project`. Uno está pausado en la organización `modaorganica` (referencia ehbdabbzussrjgxgegov). Es necesario identificar cuál corresponde a MFN o autorizar el uso de una base nueva antes de aplicar el esquema.

## Secuencia pendiente

1. Identificar la base MFN y disponer de su conexión mediante la configuración privada de Vercel.
2. Respaldar esa base y aplicar production-additions.sql si ya contiene el esquema MFN, o production-bootstrap.sql si es una base nueva. Ambos habilitan RLS sobre las tablas privadas; la API utiliza la conexión propietaria.
3. Actualizar permisos sin ejecutar el seed ficticio. Confirmar cuentas de acceso; una base nueva no contiene usuarios.
4. Publicar la API, comprobar autenticación, permisos, consultas y escritura auditada.
5. Verificar VITE_API_URL y los orígenes CLIENT_URL; promover la interfaz al dominio público y repetir la comprobación desde ese dominio.
6. Configurar el servicio HTTPS de recuperación por correo. Mientras no exista, la recuperación responde 503 y no expone códigos.

No se ha completado el despliegue funcional de extremo a extremo. No hay cambios de datos en la base ajena.
