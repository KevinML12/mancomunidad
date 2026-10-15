# Diseño MFN Digital en Pen

Archivo editable: `mfn-liquid-glass.pen`.

La dirección elegida usa tarjetas rectas con esquinas de 2–4 px, motivos de recorrido, una libreta de seguimiento y un dock inferior. Conserva azul marino `#071D49`, blanco y los tonos claros ya definidos en Pen. La tipografía es Inter: peso 400 para lectura, 500 para controles y etiquetas, y 600 solo para títulos principales y cifras destacadas. Las capas son editables; no hay fotografías ni imágenes pegadas. Liquid Glass se reserva para superficies puntuales. Los indicadores circulares mantienen su forma para distinguirlos de las tarjetas.

## Pantallas conservadas

- Sistema visual, ocho módulos institucionales, transparencia, acceso y portal ciudadano.
- Inicios de Gerencia Ejecutiva, Junta Directiva y Talento Humano en escritorio y móvil.
- Proyectos en escritorio y móvil.

Las vistas elegidas están exportadas en `previews/final/`. `Y9QpS.png` y `c7iAsk.png` son Gerencia; `d8RMqw.png` y `dNbjQ.png`, Junta Directiva; `h0obCB.png` y `seT88.png`, Talento Humano; `jrCsk.png` y `bqPxC.png`, Proyectos. El dock móvil muestra dos áreas directas, Inicio y «Más áreas»; las demás áreas autorizadas siguen disponibles sin reducir las etiquetas a tamaños ilegibles.

`previews/modules/` contiene la guía visual y las ocho áreas institucionales con la misma geometría de tarjetas.

El inicio prioriza los módulos del rol. Los accesos complementarios se agrupan en «Más áreas», según `navigationFor(role, permissions)` del frontend. Los registros y cifras de las láminas son ejemplos visuales.

## Conexión desde la terminal

Con Pen abierto, desde la raíz del proyecto:

```sh
pen status
pen interactive --app desktop
```

El archivo `.pen` se abre y edita desde Pen; su estructura interna no se modifica como texto.
