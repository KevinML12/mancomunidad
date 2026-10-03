# MFN Digital · Liquid Glass blanco y azul marino

Propuesta en Stitch para la Mancomunidad Frontera del Norte.

- Proyecto: https://stitch.withgoogle.com/projects/5614449109535199409
- Sistema de diseño: MFN · Liquid Glass Blanco y Azul Marino (`assets/17710126613641341750`).
- Municipios activos: San Pedro Soloma, Santa Eulalia y San Rafael la Independencia.

## Tokens

| Uso | Valor |
| --- | --- |
| Navegación y botones primarios | #071D49 |
| Hover primario | #04122F |
| Enlaces y foco | #1248AA |
| Selección y cabeceras de tabla | #EDF4FF |
| Fondo y paneles | #FFFFFF |
| Divisores | #D8E5FA |
| Texto principal y secundario | #111111 |
| Texto sobre azul marino | #FFFFFF |
| Completado | #176B3A |
| Urgencia o error | #B42318 |

## Material Liquid Glass claro

Referencia autorizada por el usuario: [guía del panel de Casa del Rey](/Users/kevv/Documents/proyectos/casadelreyhue/docs/DISENO_LIQUID_GLASS_ADMIN.md).

Inter para texto y títulos. Texto negro sobre vidrio blanco, blanco sobre botones azul marino. Sidebar flotante y paneles de vidrio claro, navegación activa y botón primario azul marino. Sin emojis decorativos; SVG simples para navegación y acciones.

- Panel `.glass-light`: blanco translúcido con gradiente de opacidad 0.34 / 0.18 / 0.08, desenfoque 22 px, saturación 145%, reflejos blancos suaves sin contornos.
- Capa interior `.glass-light-nested`: opacidades 0.24 / 0.10 / 0.04 y desenfoque 12 px, solo dentro de otro panel.
- Fondo blanco con halos azules muy tenues que permitan percibir el material; sin fotografías ni superficies grises.
- Radios: 22–24 px paneles, 28 px sidebar, 12 px campos.
- Reflejo especular discreto al cursor; sin loops ni inclinación 3D de tablas.
- Una tabla dentro de un solo panel, sin cristal por fila. Formularios y datos densos con base blanca suficiente para mantener contraste.
- Controles táctiles de al menos 44 px, foco visible; respetar reducción de transparencia y movimiento. Fallback blanco opaco cuando no hay soporte para desenfoque.

Sin dorado, terracota ni verde decorativo. Verde y rojo solo para estados con texto. El pedido de Liquid Glass sustituye la restricción anterior de no usar vidrio y radios de 4–6 px; mantiene la paleta azul marino, blanco y negro.

## Criterios funcionales

Tablero centrado en pendientes, responsables, fechas y avance por municipio. Separar el portal ciudadano de las herramientas internas. Respetar permisos al mostrar acciones y obtener datos. Diferenciar carga, error, ausencia de datos y cero real. Las maquetas deben señalar sus datos de ejemplo.

El avance físico no equivale al devengado financiero. No inventar cuotas, saldos, fechas ni certificaciones. El control de integridad es una verificación interna SHA-256; no certificación CGC. La validación EXIF no está implementada. Fotografías y coordenadas exactas son de uso interno. La búsqueda pública de solicitudes solo muestra estado y fechas.

## Implementación

Esta propuesta es una referencia para Svelte 5, SvelteKit 2 y Tailwind. La configuración y las credenciales de Stitch se guardan fuera del repositorio. La creación de la propuesta no modifica ni despliega la aplicación de producción.

## Refinamiento aprobado

Sin contornos decorativos; separadores de tabla discretos. Navegación centrada en texto, sin icono por opción. Marino intenso #071D49. El vidrio debe dejar percibir el fondo, con reflejo suave y sin aspecto lechoso. Los datos y controles siguen siendo de maqueta.
