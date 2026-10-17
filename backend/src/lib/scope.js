import prisma from './prisma.js';

// RF-27 (Cap. IV) / CU-12-13 (Cap. V): el expediente disciplinario, las
// ausencias y las evaluaciones solo son visibles para RRHH, Gerencia y
// Junta Directiva sin restricción — se suma Auditoría Interna por su
// función de fiscalización, no contemplada en el RF original. Un jefe de
// equipo (Jefe Inmediato, Dirección de Proyectos, Dirección Administrativa
// y Financiera) solo ve su propio expediente y el de sus subordinados
// directos (Puesto.jefeInmediatoId). Un Empleado solo ve lo propio.

// Devuelve null cuando no debe filtrarse (ve todo); un arreglo de
// colaboradorId cuando sí — vacío si el usuario no tiene expediente propio.
export async function colaboradoresVisiblesPara(user) {
  if (user.permisos?.alcance?.personal === 'global') return null;
  if (!user.colaboradorId) return [];

  if (user.permisos?.alcance?.personal === 'equipo') {
    const propio = await prisma.colaborador.findUnique({
      where: { id: user.colaboradorId },
      select: { puestoId: true },
    });
    if (!propio) return [user.colaboradorId];
    const subordinados = await prisma.colaborador.findMany({
      where: { puesto: { jefeInmediatoId: propio.puestoId } },
      select: { id: true },
    });
    return [user.colaboradorId, ...subordinados.map((s) => s.id)];
  }

  return [user.colaboradorId];
}
