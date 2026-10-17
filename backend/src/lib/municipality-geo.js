import { readFileSync } from 'node:fs';

const boundaries = JSON.parse(readFileSync(new URL('../../data/municipios-mfn-ric.geojson', import.meta.url), 'utf8'));
const BORDER_REVIEW_METERS = 500;

function rings(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
}

function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToSegmentMeters(lon, lat, a, b) {
  const metresPerLon = 111_320 * Math.cos(lat * Math.PI / 180);
  const ax = (a[0] - lon) * metresPerLon, ay = (a[1] - lat) * 111_320;
  const bx = (b[0] - lon) * metresPerLon, by = (b[1] - lat) * 111_320;
  const dx = bx - ax, dy = by - ay;
  const t = dx * dx + dy * dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function locateMunicipality(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  for (const feature of boundaries.features) {
    for (const polygon of rings(feature.geometry)) {
      if (!inRing(lon, lat, polygon[0]) || polygon.slice(1).some(ring => inRing(lon, lat, ring))) continue;
      let borderDistance = Infinity;
      for (const ring of polygon) for (let i = 0; i < ring.length - 1; i++) {
        borderDistance = Math.min(borderDistance, distanceToSegmentMeters(lon, lat, ring[i], ring[i + 1]));
      }
      return { municipio: feature.properties.municipio, cercaDelLimite: borderDistance < BORDER_REVIEW_METERS, cartografia: boundaries.source };
    }
  }
  return null;
}
