import { createHash } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

let tableReady;
async function ensureTable() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!tableReady) {
    tableReady = prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS public."RateLimitBucket" ("key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL, "untilMs" BIGINT NOT NULL)').catch(error => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

function clientAddress(req) {
  if (process.env.VERCEL === '1') return req.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.ip;
  return req.ip;
}

export function rateLimit(max, intervalMs = 15 * 60_000, { scope, keyFrom = clientAddress } = {}) {
  if (!Number.isInteger(max) || max < 1) throw new Error('Límite inválido');
  return async (req, res, next) => {
    try {
      await ensureTable();
      const identity = String(keyFrom(req) || clientAddress(req)).trim().toLowerCase();
      const namespace = scope || `${req.baseUrl}${req.path}`;
      const key = createHash('sha256').update(`${namespace}:${identity}`).digest('hex');
      const now = BigInt(Date.now());
      const until = now + BigInt(intervalMs);
      const table = process.env.NODE_ENV === 'production' ? Prisma.raw('public."RateLimitBucket"') : Prisma.raw('"RateLimitBucket"');
      const rows = await prisma.$queryRaw`
        INSERT INTO ${table} ("key", "count", "untilMs")
        VALUES (${key}, 1, ${until})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RateLimitBucket"."untilMs" <= ${now} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
          "untilMs" = CASE WHEN "RateLimitBucket"."untilMs" <= ${now} THEN ${until} ELSE "RateLimitBucket"."untilMs" END
        RETURNING "count", "untilMs"
      `;
      const bucket = rows[0];
      // Remove expired buckets gradually so the shared limiter does not grow
      // forever as new clients and account names appear.
      if (Math.random() < 0.02) {
        const threshold = now - 24n * 60n * 60n * 1000n;
        try { await prisma.$executeRaw`DELETE FROM ${table} WHERE "untilMs" < ${threshold}`; }
        catch (error) { console.warn('No se pudieron limpiar límites vencidos', error); }
      }
      if (bucket.count > max) {
        res.set('Retry-After', String(Math.max(1, Math.ceil(Number(bucket.untilMs - now) / 1000))));
        return res.status(429).json({ error: 'Demasiadas solicitudes. Intente más tarde' });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
