# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies)
RUN npm ci

# Copiar código TypeScript
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
# Usando Debian slim ao invés de Alpine porque wkhtmltopdf foi removido do Alpine
FROM node:20-slim

# ============================================================================
# WKHTMLTOPDF (VERSÃO ATUAL - LEVE)
# ============================================================================
# Instalar wkhtmltopdf e dependências necessárias
# Muito mais leve que Chromium (~50MB vs ~300MB)
RUN apt-get update && apt-get install -y \
    wkhtmltopdf \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto \
    fonts-roboto \
    fontconfig \
    libxrender1 \
    libxext6 \
    libfontconfig1 \
    ca-certificates \
    --no-install-recommends \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# PUPPETEER/CHROMIUM (VERSÃO ANTERIOR - COMENTADA)
# ============================================================================
# Essa versão funciona mas consome muito mais recursos:
# - ~300MB de espaço em disco
# - ~500MB de RAM por PDF
# - Aumenta 30% dos recursos ao gerar 1 PDF
#
# RUN apk add --no-cache \
#     chromium \
#     nss \
#     freetype \
#     harfbuzz \
#     ca-certificates \
#     ttf-freefont \
#     font-noto-emoji
#
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# ============================================================================

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production

# Copiar arquivos compilados do build stage
COPY --from=builder /app/dist ./dist

# Copiar templates Handlebars (document.hbs e header.hbs)
COPY --from=builder /app/src/templates ./dist/templates

EXPOSE 3001

CMD ["npm", "start"]
