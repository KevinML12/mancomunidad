FROM node:20-slim
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate --schema prisma/schema.production.prisma
COPY src ./src
ENV NODE_ENV=production
EXPOSE 8080
# PostgreSQL debe migrarse por separado antes del arranque; nunca usar migraciones SQLite.
CMD ["node", "src/server.js"]
