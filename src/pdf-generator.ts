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
 * Gera um PDF a partir de HTML usando Puppeteer
 * O navegador é iniciado apenas quando necessário (on-demand)
 */
export async function generatePdf(options: PdfGenerationOptions): Promise<Buffer> {
  const {
    html,
    css,
    format = 'A4',
    margin = {
      top: '2.12cm', // 60pt ≈ 2.12cm
      right: '1.5cm', // 42.5pt ≈ 1.5cm
      bottom: '2.12cm', // 60pt ≈ 2.12cm
      left: '1.5cm', // 42.5pt ≈ 1.5cm
    },
    logoUrl,
    logoPosition = 'LEFT',
  } = options;

  let browser = null;

  try {
    // Iniciar o navegador apenas quando necessário
    console.log('[PDF Generator] Iniciando navegador Puppeteer...');
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

    console.log('[PDF Generator] Navegador iniciado com sucesso');

    // Criar nova página
    const page = await browser.newPage();

    // Carregar CSS do arquivo
    const cssFilePath = path.join(__dirname, 'styles.css');
    let defaultCss = '';
    if (fs.existsSync(cssFilePath)) {
      defaultCss = fs.readFileSync(cssFilePath, 'utf-8');
    }

    // Combinar CSS padrão com CSS customizado
    const finalCss = `${defaultCss}\n${css || ''}`;

    // Gerar HTML completo com logo se fornecida
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

    console.log('[PDF Generator] Configurando conteúdo da página...');

    // Definir conteúdo HTML
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
    });

    console.log('[PDF Generator] Gerando PDF...');

    // Gerar PDF
    const pdfBuffer = await page.pdf({
      format,
      margin: {
        top: logoUrl ? '4.23cm' : margin.top, // Margem maior se tiver logo (120pt ≈ 4.23cm)
        right: margin.right,
        bottom: margin.bottom,
        left: margin.left,
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>', // Header vazio (logo já está no HTML)
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666666; margin-top: 10px;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
    });

    console.log('[PDF Generator] PDF gerado com sucesso');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[PDF Generator] Erro ao gerar PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // IMPORTANTE: Fechar o navegador para liberar recursos
    if (browser) {
      console.log('[PDF Generator] Fechando navegador...');
      await browser.close();
      console.log('[PDF Generator] Navegador fechado - recursos liberados');
    }
  }
}

/**
 * Gera o HTML do logo baseado na posição
 */
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
