# PDF Service - HTML to PDF with Puppeteer

A lightweight Node.js/Express microservice for generating PDFs from HTML using Puppeteer (headless Chrome).

## Why this service?

Traditional PDF generation libraries like pdfMake have fundamental limitations:
- PDFs look different from the original HTML/CSS design
- Inconsistent font sizes and spacing
- Limited HTML/CSS rendering capabilities

**Solution:** This microservice uses Puppeteer to render HTML exactly like a Chrome browser, ensuring 90%+ visual fidelity with your original design.

## On-Demand Architecture

The service is designed to **consume resources only when needed**:

1. The Express server runs in idle mode (minimal RAM usage)
2. When it receives a POST request to `/generate-pdf`:
   - Starts the Puppeteer browser
   - Renders the HTML
   - Generates the PDF
   - **CLOSES the browser** (releases resources)
3. Returns to idle state

This means the service doesn't consume CPU/RAM when not generating PDFs.

## Features

✅ High-fidelity PDF generation (90%+ visual accuracy)
✅ On-demand resource consumption (browser closes after each generation)
✅ Optional logo in header (4 positions: LEFT, CENTER, RIGHT, FULL_WIDTH)
✅ Automatic pagination footer
✅ A4 format with 1.5cm margins
✅ Support for highlights and formatting
✅ Customizable CSS
✅ Docker ready

## Project Structure

```
pdf-service/
├── src/
│   ├── index.ts           # Express server
│   ├── pdf-generator.ts   # Puppeteer PDF generation logic
│   └── styles.css         # Default CSS styles
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

## Performance Metrics

- **Average time**: 1-3 seconds per PDF
- **Memory**: ~100MB idle, ~300MB during generation
- **CPU**: Spike only during rendering

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
