import prisma from '../lib/prisma.js';
import { MUNICIPIOS_MFN } from '../lib/municipios.js';

export async function aggregateCensus() {
  const where = { municipio: { in: MUNICIPIOS_MFN } };
  const [groups, systems, quality] = await Promise.all([
    prisma.censoComunitarioASH.groupBy({
      by: ['municipio'], where,
      _sum: { viviendasTotales: true, viviendasConAgua: true, viviendasConSaneamiento: true },
      _count: { _all: true }
    }),
    prisma.censoComunitarioASH.count({ where: { ...where, sistemaCloracion: true } }),
    prisma.censoComunitarioASH.count({ where: { ...where, ppmCloroResidual: { gte: 0.5, lte: 1.5 } } })
  ]);
  const porMunicipio = {};
  let totalViviendas = 0;
  let conAgua = 0;
  let conSaneamiento = 0;
  let totalCensos = 0;
  for (const group of groups) {
    const viviendas = group._sum.viviendasTotales ?? 0;
    const agua = group._sum.viviendasConAgua ?? 0;
    const saneamiento = group._sum.viviendasConSaneamiento ?? 0;
    const censos = group._count._all;
    porMunicipio[group.municipio] = { viviendas, conAgua: agua, conSaneamiento: saneamiento, censos };
    totalViviendas += viviendas;
    conAgua += agua;
    conSaneamiento += saneamiento;
    totalCensos += censos;
  }
  return { totalViviendas, conAgua, conSaneamiento, totalCensos, sistemasClorados: systems, conCalidadAceptable: quality, porMunicipio };
}
