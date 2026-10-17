# Límites municipales usados para sugerir ubicación

`municipios-mfn-ric.geojson` es una copia local de tres polígonos de la capa
`RIC:SIG_LIMITE_MUNICIPAL_IGN` publicada por el [Registro de Información
Catastral](https://portal.ric.gob.gt/geoserver/gwc/demo). Se descargó mediante
WFS en EPSG:4326. Los códigos son 1308 (Soloma), 1314 (San Rafael
Independencia) y 1317 (Santa Eulalia). Los nombres se normalizan al catálogo
interno. `npm run geo:refresh` renueva el archivo y valida códigos y rangos.

El backend usa esta copia al registrar una fotografía. No necesita consultar el
servidor del RIC por cada carga. La intersección es una **sugerencia de
municipio**, no una prueba de visita: una foto puede carecer de GPS, el EXIF
puede modificarse y la geometría puede diferir del límite oficial vigente.
Los puntos a menos de 500 m del límite y las diferencias de municipio sugerido
entre la foto, el dispositivo y el proyecto quedan marcados para revisión.
Una distancia máxima permitida entre coordenadas EXIF y del dispositivo aún
requiere una regla institucional; por ahora no se rechaza una foto por esa distancia.
