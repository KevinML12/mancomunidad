# Referencias de Stitch

Proyecto: https://stitch.withgoogle.com/projects/5614449109535199409

## Propuestas anteriores

Pantalla: **MFN · Tablero corporativo azul marino** (`cba3482cadba4d3ab6346668b9868222`).

Sistema: **MFN Corporativo · Azul Marino** (`assets/17710126613641341750`).

`tablero-azul-marino.html` es la referencia vigente: azul marino, blanco y texto negro; iconos funcionales sin emojis decorativos. Se limpiaron los restos de tokens y fondos verdes del HTML exportado. Datos de ejemplo; controles visuales sin conexión real a la API. No está integrada ni desplegada.

## Referencia anterior

`tablero-territorial.html` conserva la primera propuesta verde como antecedente, sustituida por la versión azul marino. `correcciones.json` contiene las operaciones DOM devueltas por Stitch para esa propuesta.

Antes de integrar: conectar datos y permisos, adaptar a móvil, verificar contraste y sustituir recursos CDN por dependencias locales cuando corresponda.

## Propuesta vigente · Liquid Glass blanco

Pantalla Stitch: **MFN · Liquid Glass blanco y azul marino** (`e26ae051fc554bb59dfe5bb78160bc0a`).

Sistema: **MFN · Liquid Glass Blanco y Azul Marino** (`assets/17710126613641341750`).

Referencia vigente: `tablero-liquid-glass.html`. Material de referencia en `liquid-glass.css`, adaptado de la documentación del panel claro de Casa del Rey. Stitch exportó las clases sin sus definiciones de material; estas se añadieron localmente junto al brillo al cursor y fallbacks de accesibilidad. `vista-liquid-glass.jpg` muestra la vista previa local revisada.

Mantiene azul marino, blanco y texto negro, sin emojis decorativos. Los datos son ejemplos; la aplicación de producción aún no utiliza esta maqueta.

Refinamiento vigente: marino profundo `#071D49`, sin contornos decorativos ni iconos repetidos en navegación. Transparencia 0.34/0.18/0.08 en paneles; 0.24/0.10/0.04 en capas interiores. Reglas finales en `liquid-glass-refinado.css`; aplicadas al HTML de referencia.
