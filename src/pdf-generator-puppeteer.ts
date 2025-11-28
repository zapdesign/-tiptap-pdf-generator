import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export interface PdfGenerationOptions {
  html: string;
  css?: string;
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  logoUrl?: string;
  logoPosition?: 'LEFT' | 'CENTER' | 'RIGHT' | 'FULL_WIDTH';
}

/**
 * Gera um PDF a partir de HTML usando Puppeteer (headless Chrome)
 *
 * VANTAGENS:
 * - Renderização 100% fiel ao Chrome/navegador
 * - Suporte completo a CSS moderno, Flexbox, Grid
 * - Renderização perfeita de fontes customizadas
 * - JavaScript support (se necessário)
 *
 * DESVANTAGENS:
 * - ~300MB de espaço em disco (Chromium)
 * - ~500MB de RAM por PDF gerado
 * - Maior tempo de inicialização
 * - Aumenta significativamente o consumo de recursos
 */
export async function generatePdfWithPuppeteer(options: PdfGenerationOptions): Promise<Buffer> {
  const {
    html,
    css,
    format = 'A4',
    margin = {
      top: '2.12cm',
      right: '1.5cm',
      bottom: '2.12cm',
      left: '1.5cm',
    },
    logoUrl,
    logoPosition = 'LEFT',
  } = options;

  let browser = null;

  try {
    console.log('[PDF Generator - Puppeteer] Iniciando navegador Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    console.log('[PDF Generator - Puppeteer] Navegador iniciado com sucesso');

    const page = await browser.newPage();

    // Carregar CSS do arquivo
    const cssFilePath = path.join(__dirname, 'styles.css');
    let defaultCss = '';
    if (fs.existsSync(cssFilePath)) {
      defaultCss = fs.readFileSync(cssFilePath, 'utf-8');
    }

    const finalCss = `${defaultCss}\n${css || ''}`;

    const logoHtml = logoUrl ? generateLogoHtml(logoUrl, logoPosition) : '';

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${finalCss}
  </style>
</head>
<body>
  ${logoHtml}
  <main>
    ${html}
  </main>
</body>
</html>
    `;

    console.log('[PDF Generator - Puppeteer] Configurando conteúdo da página...');

    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
    });

    console.log('[PDF Generator - Puppeteer] Gerando PDF...');

    const pdfBuffer = await page.pdf({
      format,
      margin: {
        top: logoUrl ? '4.23cm' : margin.top,
        right: margin.right,
        bottom: margin.bottom,
        left: margin.left,
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666666; margin-top: 10px;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
    });

    console.log('[PDF Generator - Puppeteer] PDF gerado com sucesso');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[PDF Generator - Puppeteer] Erro ao gerar PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      console.log('[PDF Generator - Puppeteer] Fechando navegador...');
      await browser.close();
      console.log('[PDF Generator - Puppeteer] Navegador fechado - recursos liberados');
    }
  }
}

function generateLogoHtml(logoUrl: string, position: 'LEFT' | 'CENTER' | 'RIGHT' | 'FULL_WIDTH'): string {
  let alignStyle = '';
  let logoWidth = '120px';

  switch (position) {
    case 'LEFT':
      alignStyle = 'text-align: left;';
      break;
    case 'CENTER':
      alignStyle = 'text-align: center;';
      break;
    case 'RIGHT':
      alignStyle = 'text-align: right;';
      break;
    case 'FULL_WIDTH':
      alignStyle = 'text-align: center;';
      logoWidth = '100%';
      break;
  }

  return `
    <header style="margin-bottom: 32px; padding-bottom: 24px; ${alignStyle}">
      <img src="${logoUrl}" alt="Logo" style="width: ${logoWidth}; max-height: ${position === 'FULL_WIDTH' ? '80px' : '60px'}; object-fit: contain;" />
    </header>
  `;
}
