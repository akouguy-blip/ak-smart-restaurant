# ============================================================
# Build stage — compile la PWA Vue
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ============================================================
# Runtime stage — Nginx sert les fichiers statiques + proxy /api
# ============================================================
FROM nginx:1.27-alpine AS runtime

# Config Nginx custom (reverse proxy vers le backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Assets compilés
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
