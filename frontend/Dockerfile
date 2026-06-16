# ============================================
# Frontend Dockerfile — Multi-stage build
# Stage 1: Node.js build
# Stage 2: Nginx serve + reverse proxy
# ============================================

# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем зависимости
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Копируем исходники
COPY . .
RUN npm run build

# Stage 2: Nginx serve
FROM nginx:alpine

# Удаляем дефолтный конфиг
RUN rm /etc/nginx/conf.d/default.conf

# Копируем nginx конфиг с reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранный frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
