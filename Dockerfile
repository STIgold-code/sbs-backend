# Usar imagen con Playwright preinstalado
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código compilado
COPY dist ./dist

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/main.js"]
