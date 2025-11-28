import express from 'express';
import cors from 'cors';
import { generatePdf } from './pdf-generator';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentar limite para HTMLs grandes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-service' });
});

// Rota principal para geração de PDF
app.post('/generate-pdf', async (req, res) => {
  try {
    const { html, css, logoUrl, logoPosition } = req.body;

    // Validar entrada
    if (!html) {
      return res.status(400).json({ error: 'HTML is required' });
    }

    console.log('[API] Recebida requisição para gerar PDF');

    // Gerar PDF usando Puppeteer
    const pdfBuffer = await generatePdf({
      html,
      css,
      format: 'A4',
      margin: {
        top: '2.12cm', // 60pt ≈ 2.12cm
        right: '1.5cm', // 42.5pt ≈ 1.5cm
        bottom: '2.12cm', // 60pt ≈ 2.12cm
        left: '1.5cm', // 42.5pt ≈ 1.5cm
      },
      logoUrl,
      logoPosition,
    });

    console.log('[API] PDF gerado com sucesso, enviando resposta');

    // Enviar PDF como resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[API] Erro ao gerar PDF:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Generate PDF: POST http://localhost:${PORT}/generate-pdf`);
});
