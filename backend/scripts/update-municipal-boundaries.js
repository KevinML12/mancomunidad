import { writeFile } from 'node:fs/promises';

const endpoint = 'https://portal.ric.gob.gt/geoserver/ows';
const params = new URLSearchParams({
  service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'RIC:SIG_LIMITE_MUNICIPAL_IGN',
  outputFormat: 'application/json', srsName: 'EPSG:4326', CQL_FILTER: 'CODIGO IN (1308,1314,1317)',
});
const names = new Map([[1308, 'San Pedro Soloma'], [1314, 'San Rafael la Independencia'], [1317, 'Santa Eulalia']]);
const response = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.timeout(20_000) });
if (!response.ok) throw new Error(`RIC respondió ${response.status}`);
const source = await response.json();
if (source.type !== 'FeatureCollection' || source.features?.length !== names.size ||
    new Set(source.features.map(feature => Number(feature.properties?.CODIGO))).size !== names.size) throw new Error('La respuesta no contiene los tres municipios esperados');

const features = source.features.map(feature => {
  const codigo = Number(feature.properties.CODIGO);
  if (!names.has(codigo) || !['Polygon','MultiPolygon'].includes(feature.geometry?.type)) throw new Error('Municipio o geometría inesperados');
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) for (const point of ring) {
    if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
        point[0] < -93 || point[0] > -88 || point[1] < 13 || point[1] > 18) throw new Error('Coordenadas fuera de Guatemala');
  }
  return { type: 'Feature', properties: { codigo, municipio: names.get(codigo) }, geometry: feature.geometry };
});
const snapshot = {
  type: 'FeatureCollection', source: 'Registro de Información Catastral (RIC), capa RIC:SIG_LIMITE_MUNICIPAL_IGN',
  sourceUrl: `${endpoint}?service=WFS&version=2.0.0&request=GetCapabilities`,
  retrievedAt: new Date().toISOString().slice(0, 10), crs: 'EPSG:4326', features,
};
await writeFile(new URL('../data/municipios-mfn-ric.geojson', import.meta.url), `${JSON.stringify(snapshot)}\n`);
console.log(`Cartografía RIC actualizada: ${features.map(feature => feature.properties.municipio).join(', ')}`);
