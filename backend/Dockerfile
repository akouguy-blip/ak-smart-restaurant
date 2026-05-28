# ============================================================
# Build stage — installe toutes les deps et compile
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ============================================================
# Runtime stage — image légère avec uniquement prod deps + dist
# ============================================================
FROM node:20-alpine AS runtime
WORKDIR /app

# Installer les deps de production uniquement
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copier les fichiers compilés et le SQL d'initialisation
COPY --from=build /app/dist ./dist
COPY db ./db

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
