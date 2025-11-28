FROM node:20-alpine

# Instalar dependências do Chrome para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Configurar Puppeteer para usar o Chromium instalado
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código TypeScript
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Limpar arquivos de desenvolvimento
RUN rm -rf src tsconfig.json

EXPOSE 3001

CMD ["npm", "start"]
