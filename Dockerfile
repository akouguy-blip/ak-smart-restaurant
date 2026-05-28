# ============================================================
# AK Smart Restaurant — Dockerfile UNIFIÉ (cloud + Electron)
#
# Backend NestJS (SQLite via better-sqlite3) + Frontend Vue
# en une seule image. Le backend sert le frontend statiquement.
#
# Image Debian Slim car better-sqlite3 a besoin de glibc.
# ============================================================

# ----------------------------------------------------------------
# Stage 1 : Build du frontend Vue (Vite)
# ----------------------------------------------------------------
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ----------------------------------------------------------------
# Stage 2 : Build du backend NestJS
# better-sqlite3 a un binaire précompilé pour Node 20 + glibc/Debian.
# ----------------------------------------------------------------
FROM node:20-slim AS backend-build
WORKDIR /app

# Outils nécessaires si better-sqlite3 doit compiler (sécurité)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json ./
RUN npm install --no-audit --no-fund
COPY backend/tsconfig.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build

# ----------------------------------------------------------------
# Stage 3 : Runtime — image légère qui sert tout
# ----------------------------------------------------------------
FROM node:20-slim AS runtime
WORKDIR /app

# Outils minimal pour compiler better-sqlite3 si binaire absent
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Backend compilé + script SQLite d'initialisation
COPY --from=backend-build /app/dist ./dist
COPY backend/db ./db

# Frontend compilé → servi par NestJS via ServeStaticModule
COPY --from=frontend-build /app/dist ./public

# Volume pour la base SQLite persistante
VOLUME /app/data
ENV SQLITE_PATH=/app/data/akresto.db

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
