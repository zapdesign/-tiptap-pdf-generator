# PDF Service - HTML to PDF Generator

A Node.js/Express microservice for generating PDFs from HTML with **two rendering engines** to choose from.

## Two PDF Generation Options

This service offers **two different PDF generators**, each with its own trade-offs:

### 1. **Handlebars + wkhtmltopdf** (Default - Lightweight)

**Best for:** Production environments with resource constraints, simple documents

✅ **Advantages:**
- Very lightweight (~50MB disk space)
- Low RAM consumption (~100MB per PDF)
- Fast startup time
- Good HTML/CSS basic rendering

⚠️ **Limitations:**
- Limited support for modern CSS (Flexbox/Grid advanced features)
- No JavaScript execution
- May have minor rendering differences

### 2. **Puppeteer** (High Fidelity)

**Best for:** Complex documents requiring pixel-perfect rendering

✅ **Advantages:**
- 100% browser-accurate rendering (Chromium)
- Full support for modern CSS (Flexbox, Grid, animations)
- Perfect font rendering
- JavaScript support

⚠️ **Limitations:**
- Heavy (~300MB disk space for Chromium)
- High RAM usage (~500MB per PDF)
- Slower startup time
- Increases server resource consumption by ~30%

## Which One to Choose?

**Use Handlebars/wkhtmltopdf if:**
- You have simple documents with basic formatting
- You need to minimize server resources
- You're generating many PDFs concurrently
- Minor rendering differences are acceptable

**Use Puppeteer if:**
- You need pixel-perfect rendering
- Your documents use complex CSS layouts
- You have sufficient server resources
- Visual fidelity is critical

## On-Demand Architecture

The service is designed to **consume resources only when needed**:

1. The Express server runs in idle mode (minimal RAM usage)
2. When it receives a POST request to `/generate-pdf`:
   - Uses the selected rendering engine (Handlebars or Puppeteer)
   - Renders the HTML
   - Generates the PDF
   - **Releases resources** (closes browser in Puppeteer mode)
3. Returns to idle state

## Features

✅ **Two rendering engines** (Handlebars/wkhtmltopdf or Puppeteer)
✅ On-demand resource consumption
✅ Optional logo in header (4 positions: LEFT, CENTER, RIGHT, FULL_WIDTH)
✅ Automatic pagination footer
✅ A4 format with customizable margins
✅ Support for highlights and formatting
✅ Customizable CSS
✅ Docker ready

## Project Structure

```
pdf-service/
├── src/
│   ├── index.ts                      # Express server
│   ├── pdf-generator.ts              # Handlebars/wkhtmltopdf (default, lightweight)
│   ├── pdf-generator-puppeteer.ts    # Puppeteer (high fidelity)
│   ├── templates/
│   │   └── document.hbs              # Handlebars template
│   └── styles.css                    # Default CSS styles
├── Dockerfile
├── package.json
└── README.md
```

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

The service will be available at `http://localhost:3001`

### Docker

```bash
# Build image
docker build -t pdf-service .

# Run container
docker run -p 3001:3001 pdf-service
```

### Docker Compose

```yaml
services:
  pdf-service:
    build: ./pdf-service
    container_name: pdf-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
```

## API Endpoints

### Health Check

```bash
GET /health

Response:
{
  "status": "ok",
  "service": "pdf-service"
}
```

### Generate PDF

**Default (Handlebars/wkhtmltopdf):**
```bash
POST /generate-pdf

Content-Type: application/json

Body:
{
  "html": "<h1>Title</h1><p>Content</p>",
  "css": "h1 { color: red; }",    // Optional
  "logoUrl": "https://...",        // Optional
  "logoPosition": "CENTER"         // LEFT, CENTER, RIGHT, FULL_WIDTH
}

Response: PDF binary (application/pdf)
```

**Using Puppeteer (High Fidelity):**

To use Puppeteer instead, you'll need to modify the import in `src/index.ts`:

```typescript
// Change from:
import { generatePdf } from './pdf-generator';

// To:
import { generatePdfWithPuppeteer as generatePdf } from './pdf-generator-puppeteer';
```

Both generators use the same API interface, so no changes to your API calls are needed.

### Example with curl

```bash
curl -X POST http://localhost:3001/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Test</h1><p>Paragraph</p>",
    "css": "body { font-size: 15px; }"
  }' \
  --output output.pdf
```

## Integration Example

```typescript
// Convert your content to HTML
const html = '<h1>My Document</h1><p>Content here</p>';

// Optional custom CSS
const css = 'body { font-family: Arial; }';

// Call the PDF service
const response = await fetch('http://localhost:3001/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html, css }),
});

const pdfBuffer = await response.arrayBuffer();
```

## CSS Styling

The default styles in `src/styles.css` provide a clean, professional look:

- Font: ui-sans-serif, system-ui, Segoe UI, Roboto
- Font size: 15px
- Line height: 1.8
- Headings: h1 (28px), h2 (22px), h3 (19px)
- Support for lists, blockquotes, horizontal rules
- Text alignment (left, center, right, justify)
- Highlights support

You can override these styles by passing custom CSS in the request.

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `PUPPETEER_EXECUTABLE_PATH` - Chromium path (Docker)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` - Skip download (Docker)

## Performance Comparison

### Handlebars/wkhtmltopdf (Default)
- **Disk space**: ~50MB
- **RAM usage**: ~100MB per PDF
- **Average time**: 0.5-2 seconds per PDF
- **Memory idle**: ~50MB

### Puppeteer
- **Disk space**: ~300MB (Chromium)
- **RAM usage**: ~500MB per PDF
- **Average time**: 1-3 seconds per PDF
- **Memory idle**: ~100MB
- **CPU**: Higher spike during rendering

## Troubleshooting

### Error: "Failed to launch chrome"

In Docker, make sure Chromium is installed:

```dockerfile
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Error: "Failed to parse parameter value: 60pt"

Use CSS units accepted by Puppeteer: `cm`, `mm`, `in`, `px`

❌ `margin: { top: '60pt' }`
✅ `margin: { top: '2.12cm' }`

### Blank PDFs

Make sure `printBackground: true` is enabled in the PDF generation options.

## Logs

The service outputs detailed logs:

```
[API] Recebida requisição para gerar PDF
[PDF Generator] Iniciando navegador Puppeteer...
[PDF Generator] Navegador iniciado com sucesso
[PDF Generator] Configurando conteúdo da página...
[PDF Generator] Gerando PDF...
[PDF Generator] PDF gerado com sucesso
[PDF Generator] Fechando navegador...
[PDF Generator] Navegador fechado - recursos liberados
[API] PDF gerado com sucesso, enviando resposta
```

## Development

This project was built using **VibeCoding** - AI-assisted development to accelerate the implementation process while maintaining code quality and best practices.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

---

**Note**: This is a production-ready microservice designed to be lightweight, efficient, and easy to integrate into any stack that needs high-quality PDF generation from HTML.
