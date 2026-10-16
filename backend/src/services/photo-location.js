import ExifReader from 'exifreader';
import { locateMunicipality } from '../lib/municipality-geo.js';

export async function readExifLocation(buffer) {
  try {
    const tags = await ExifReader.load(buffer, { expanded: true });
    const lat = tags.gps?.Latitude;
    const lon = tags.gps?.Longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat, lon };
  } catch { return null; }
}

export function classifyPhotoLocation(projectMunicipality, exif, reported, source) {
  const exifPlace = exif ? locateMunicipality(exif.lat, exif.lon) : null;
  const reportedPlace = reported ? locateMunicipality(reported.lat, reported.lon) : null;
  const supplied = [exif, reported].filter(Boolean);
  const places = [exifPlace, reportedPlace].filter(Boolean);
  let validacionUbicacion = 'Sin coordenadas';
  if (supplied.length) {
    validacionUbicacion = places.length !== supplied.length || places.some(place => place.municipio !== projectMunicipality || place.cercaDelLimite)
      ? 'Revisar' : 'Coincide';
  }
  const primary = exif ?? reported;
  return {
    latitud: primary?.lat ?? null, longitud: primary?.lon ?? null,
    latitudExif: exif?.lat ?? null, longitudExif: exif?.lon ?? null,
    latitudDispositivo: source === 'dispositivo' ? reported?.lat ?? null : null,
    longitudDispositivo: source === 'dispositivo' ? reported?.lon ?? null : null,
    municipioExif: exifPlace?.municipio ?? null,
    municipioDispositivo: source === 'dispositivo' ? reportedPlace?.municipio ?? null : null,
    fuenteUbicacion: exif ? 'EXIF' : reported ? source === 'dispositivo' ? 'Dispositivo' : 'Declarada' : 'Sin GPS',
    validacionUbicacion,
  };
}
