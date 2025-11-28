# Como Rodar o Sistema Completo

## Arquitetura

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│  NestJS API │────────▶│ PDF Service │
│   (Next.js) │         │  (Port 3000)│         │ (Port 3001) │
└─────────────┘         └─────────────┘         └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  PostgreSQL │
                        └─────────────┘
```

## Modo Desenvolvimento

### 1. Iniciar o PDF Service

```bash
cd C:\dev\juriai\pdf-service
npm run dev
```

O serviço estará em `http://localhost:3001`

### 2. Iniciar a API NestJS

```bash
cd C:\dev\juriai\api-juriai
npm run start:dev
```

A API estará em `http://localhost:3000`

### 3. Iniciar o Frontend

```bash
cd C:\dev\juriai\client-juriai
npm run dev
```

O frontend estará em `http://localhost:3002` (ou outra porta)

### 4. Testar a Geração de PDF

1. Abra o frontend
2. Vá para "Documentos Gerados"
3. Clique em um documento
4. Clique em "Publicar"

O sistema irá:
1. Frontend → Chama API NestJS (`/generated-docs/:id/publish`)
2. API NestJS → Converte TipTap JSON para HTML
3. API NestJS → Chama PDF Service (`POST /generate-pdf`)
4. PDF Service → Gera PDF com Puppeteer
5. PDF Service → Retorna buffer do PDF
6. API NestJS → Faz upload do PDF
7. API NestJS → Retorna URL do PDF
8. Frontend → Exibe PDF publicado

## Modo Produção (Docker)

### Opção 1: Docker Compose (Recomendado)

Crie/atualize o arquivo `C:\dev\juriai\docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Banco de dados
  postgres:
    image: postgres:15
    container_name: juriai-postgres
    environment:
      POSTGRES_USER: juriai
      POSTGRES_PASSWORD: senha_segura
      POSTGRES_DB: juriai
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  # PDF Service
  pdf-service:
    build: ./pdf-service
    container_name: juriai-pdf-service
    environment:
      - NODE_ENV=production
      - PORT=3001
    ports:
      - "3001:3001"
    restart: unless-stopped

  # API NestJS
  api:
    build: ./api-juriai
    container_name: juriai-api
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://juriai:senha_segura@postgres:5432/juriai
      - PDF_SERVICE_URL=http://pdf-service:3001
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - pdf-service
    restart: unless-stopped

  # Frontend Next.js (opcional - se quiser servir com Docker)
  frontend:
    build: ./client-juriai
    container_name: juriai-frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    ports:
      - "3002:3000"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

Rodar tudo:

```bash
cd C:\dev\juriai
docker-compose up -d
```

Verificar logs:

```bash
docker-compose logs -f pdf-service
docker-compose logs -f api
```

Parar tudo:

```bash
docker-compose down
```

### Opção 2: Containers Individuais

```bash
# Rede
docker network create juriai-network

# PostgreSQL
docker run -d \
  --name juriai-postgres \
  --network juriai-network \
  -e POSTGRES_USER=juriai \
  -e POSTGRES_PASSWORD=senha \
  -e POSTGRES_DB=juriai \
  -p 5432:5432 \
  postgres:15

# PDF Service
cd C:\dev\juriai\pdf-service
docker build -t juriai-pdf-service .
docker run -d \
  --name juriai-pdf-service \
  --network juriai-network \
  -p 3001:3001 \
  juriai-pdf-service

# API
cd C:\dev\juriai\api-juriai
docker build -t juriai-api .
docker run -d \
  --name juriai-api \
  --network juriai-network \
  -e DATABASE_URL=postgresql://juriai:senha@juriai-postgres:5432/juriai \
  -e PDF_SERVICE_URL=http://juriai-pdf-service:3001 \
  -p 3000:3000 \
  juriai-api
```

## Variáveis de Ambiente

### PDF Service

```env
PORT=3001
NODE_ENV=production
```

### API NestJS

```env
DATABASE_URL=postgresql://user:password@localhost:5432/juriai
PDF_SERVICE_URL=http://localhost:3001
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Testes

### Teste isolado do PDF Service

```bash
# Health check
curl http://localhost:3001/health

# Gerar PDF de teste
curl -X POST http://localhost:3001/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Teste</h1><p>Este é um teste.</p>"
  }' \
  --output test.pdf

# Abrir PDF gerado
start test.pdf
```

### Teste da integração completa

1. Crie um documento no frontend
2. Edite o conteúdo
3. Clique em "Publicar"
4. Verifique o console do PDF Service:
   ```
   [API] Recebida requisição para gerar PDF
   [PDF Generator] Iniciando navegador Puppeteer...
   [PDF Generator] PDF gerado com sucesso
   [PDF Generator] Navegador fechado - recursos liberados
   ```
5. Abra o PDF publicado e compare com o editor

## Troubleshooting

### PDF Service não inicia

```bash
# Verificar se porta 3001 está livre
netstat -ano | findstr :3001

# Matar processo na porta 3001
taskkill /PID <PID> /F

# Verificar logs
cd C:\dev\juriai\pdf-service
npm run dev
```

### API não consegue conectar ao PDF Service

```bash
# Verificar conectividade
curl http://localhost:3001/health

# Verificar variável de ambiente
echo $PDF_SERVICE_URL  # Linux/Mac
echo %PDF_SERVICE_URL%  # Windows CMD
$env:PDF_SERVICE_URL   # Windows PowerShell

# Configurar variável
export PDF_SERVICE_URL=http://localhost:3001  # Linux/Mac
set PDF_SERVICE_URL=http://localhost:3001     # Windows CMD
$env:PDF_SERVICE_URL="http://localhost:3001"  # Windows PowerShell
```

### PDF gerado está em branco

1. Verifique se o HTML está sendo gerado corretamente:
   - Adicione logs no `convertTipTapToHtml`
   - Verifique se o conteúdo TipTap está válido

2. Teste com HTML simples:
   ```bash
   curl -X POST http://localhost:3001/generate-pdf \
     -H "Content-Type: application/json" \
     -d '{"html":"<h1>Teste</h1>"}' \
     --output test.pdf
   ```

### Erro "Failed to launch chrome" (Docker)

Certifique-se que o Dockerfile está correto:

```dockerfile
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### PDF não fica idêntico ao editor

1. Verifique se os estilos estão corretos em `pdf-service/src/styles.css`
2. Compare com `client-juriai/src/app/globals.css` (linhas 104-248)
3. Teste localmente antes de publicar

## Monitoramento

### Verificar recursos do PDF Service

```bash
# Docker
docker stats juriai-pdf-service

# Logs em tempo real
docker logs -f juriai-pdf-service

# Últimas 100 linhas
docker logs --tail 100 juriai-pdf-service
```

### Métricas esperadas

- **Espera**: ~50MB RAM, 0% CPU
- **Gerando PDF**: ~250-350MB RAM, 50-100% CPU (1-3 segundos)
- **Após geração**: Volta para ~50MB RAM

## Backup

### Backup do banco de dados

```bash
docker exec juriai-postgres pg_dump -U juriai juriai > backup.sql
```

### Restaurar backup

```bash
docker exec -i juriai-postgres psql -U juriai juriai < backup.sql
```

## Performance

Para melhorar a performance em produção:

1. **Use cache de navegador** (futuro):
   - Manter instância do Puppeteer em memória
   - Reutilizar entre requisições

2. **Use múltiplas instâncias** (scale horizontal):
   ```yaml
   pdf-service:
     deploy:
       replicas: 3
   ```

3. **Use load balancer**:
   - Nginx ou Traefik na frente do PDF Service

## Próximos Passos

- [ ] Configurar monitoramento (PM2, Prometheus)
- [ ] Configurar logging centralizado (Winston, Loki)
- [ ] Adicionar testes automatizados
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Adicionar métricas de performance
- [ ] Implementar cache de PDFs gerados
