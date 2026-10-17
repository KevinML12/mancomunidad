import { MUNICIPIOS_MFN } from './municipios.js';

export function authorizedMunicipios(user) {
  if (user.permisos?.alcance?.territorio === 'global') return null;
  return (user.municipios || []).filter(municipio => MUNICIPIOS_MFN.includes(municipio));
}

export function canAccessMunicipio(user, municipio) {
  const authorized = authorizedMunicipios(user);
  return authorized === null || authorized.includes(municipio);
}

export function municipalityWhere(user, { includeRegional = false } = {}) {
  const authorized = authorizedMunicipios(user);
  if (authorized === null) return {};
  return { municipio: { in: includeRegional ? [...authorized, 'Regional'] : authorized } };
}
