import test from 'node:test';
import assert from 'node:assert/strict';
import { locateMunicipality } from '../../src/lib/municipality-geo.js';
import { readExifLocation, classifyPhotoLocation } from '../../src/services/photo-location.js';

import { gpsJpeg } from '../helpers/gps-jpeg.js';

test('GPS EXIF interpreta latitud norte y longitud oeste sin confiar en coordenadas declaradas', async () => {
  const exif = await readExifLocation(gpsJpeg());
  assert.ok(Math.abs(exif.lat - 15.672222) < 0.00001);
  assert.ok(Math.abs(exif.lon + 91.213889) < 0.00001);
  assert.equal(locateMunicipality(exif.lat, exif.lon)?.municipio, 'Santa Eulalia');
  const result = classifyPhotoLocation('Santa Eulalia', exif, { lat: 15.66264734, lon: -91.43159310 }, 'dispositivo');
  assert.equal(result.municipioExif, 'Santa Eulalia');
  assert.equal(result.municipioDispositivo, 'San Pedro Soloma');
  assert.equal(result.validacionUbicacion, 'Revisar');
  assert.equal(result.fuenteUbicacion, 'EXIF');
});

test('foto sin GPS no recibe municipio sugerido', async () => {
  assert.equal(await readExifLocation(Buffer.from([255,216,255,217])), null);
  const result = classifyPhotoLocation('Santa Eulalia', null, null, 'declarada');
  assert.equal(result.validacionUbicacion, 'Sin coordenadas');
  assert.equal(result.municipioExif, null);
});

test('punto dentro del municipio pero cerca del límite queda para revisión', () => {
  const point = { lat: 15.7381, lon: -91.4648 };
  assert.equal(locateMunicipality(point.lat, point.lon)?.municipio, 'Santa Eulalia');
  assert.equal(locateMunicipality(point.lat, point.lon)?.cercaDelLimite, true);
  assert.equal(classifyPhotoLocation('Santa Eulalia', null, point, 'dispositivo').validacionUbicacion, 'Revisar');
});
