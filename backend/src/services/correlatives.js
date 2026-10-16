import prisma from '../lib/prisma.js';

// The counter row is shared by all API instances. Existing codes seed it on first use.
// A failed business write may leave a gap, but it cannot reuse an issued number.
export async function createWithCorrelative(model, prefix, width, data) {
  for (let attempt = 0; attempt < 12; attempt++) {
    let phase = 'read';
    try {
      const latest = await prisma[model].findFirst({
        where: { codigo: { startsWith: prefix } },
        orderBy: { codigo: 'desc' },
        select: { codigo: true }
      });
      const suffix = latest?.codigo.slice(prefix.length);
      const previous = suffix && /^\d+$/.test(suffix) ? Number(suffix) : 0;
      phase = 'counter';
      const counter = await prisma.correlativoInstitucional.upsert({
        where: { clave: prefix },
        create: { clave: prefix, ultimo: previous + 1 },
        update: { ultimo: { increment: 1 } }
      });
      const codigo = `${prefix}${String(counter.ultimo).padStart(width, '0')}`;
      phase = 'create';
      return await prisma[model].create({ data: { ...data, codigo } });
    } catch (error) {
      const retryable = ['P2002', 'P2034'].includes(error.code) || (error.code === 'P1008' && phase !== 'create');
      if (!retryable || attempt === 11) throw error;
      await new Promise(resolve => setTimeout(resolve, 5 * (attempt + 1)));
    }
  }
}
