# SIRH-MFN backend — Node.js/Express + Prisma (Capítulo V).
# IMPORTANTE: antes de construir esta imagen para producción, cambiar
# prisma/schema.prisma → provider = "postgresql" y setear DATABASE_URL
# a un Postgres real (Neon/Supabase) — ver README.md. SQLite es solo
# para desarrollo local (no sirve en un contenedor efímero).

FROM node:20-slim AS base
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

# prisma migrate deploy aplica migraciones pendientes sin pedir confirmación
# (a diferencia de "migrate dev", apto para arranque de contenedor).
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
