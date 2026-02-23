# Usar imagen con Playwright preinstalado
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo dev para compilar)
RUN npm ci

# Copiar código fuente
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY src ./src

# Compilar
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/main.js"]
