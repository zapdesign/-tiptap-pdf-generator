import Handlebars from 'handlebars';
import wkhtmltopdf from 'wkhtmltopdf';
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
 * Gera um PDF a partir de HTML usando wkhtmltopdf + Handlebars
 *
 * VANTAGENS:
 * - Muito mais leve que Puppeteer (~50MB vs ~300MB)
 * - Menor consumo de RAM (~100MB vs ~500MB)
 * - Mais rápido para iniciar
 * - Mesma qualidade visual de renderização HTML/CSS básico
 *
 * LIMITAÇÕES:
 * - Suporte limitado a CSS moderno (sem Flexbox/Grid avançado)
 * - Pode haver pequenas diferenças de renderização
 * - Não executa JavaScript
 */
export async function generatePdf(options: PdfGenerationOptions): Promise<Buffer> {
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

  try {
    console.log('[PDF Generator - wkhtmltopdf] Iniciando geração...');

    // Carregar template Handlebars
    const templatePath = path.join(__dirname, 'templates', 'document.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);

    // Carregar CSS do arquivo
    const cssFilePath = path.join(__dirname, 'styles.css');
    let defaultCss = '';
    if (fs.existsSync(cssFilePath)) {
      defaultCss = fs.readFileSync(cssFilePath, 'utf-8');
    }

    // Combinar CSS padrão com CSS customizado
    const finalCss = `${defaultCss}\n${css || ''}`;

    // Mapear posição do logo para CSS text-align
    const logoPositionMap: Record<string, string> = {
      LEFT: 'left',
      CENTER: 'center',
      RIGHT: 'right',
      FULL_WIDTH: 'center',
    };

    // Renderizar HTML usando template Handlebars
    const fullHtml = template({
      content: html,
      css: finalCss,
      logoUrl: logoUrl || null,
      logoPosition: logoPositionMap[logoPosition] || 'left',
    });

    console.log('[PDF Generator - wkhtmltopdf] Template renderizado, gerando PDF...');

    // Configurar opções do wkhtmltopdf
    const wkhtmlOptions: any = {
      pageSize: format,
      marginTop: logoUrl ? '3cm' : margin.top,
      marginRight: margin.right,
      marginBottom: margin.bottom,
      marginLeft: margin.left,
      encoding: 'UTF-8',
      printMediaType: true,
      enableLocalFileAccess: true,
      footerCenter: 'Página [page] de [toPage]',
      footerFontSize: 10,
      footerSpacing: 5,
    };

    // Se tiver logo, adicionar header HTML em todas as páginas
    if (logoUrl) {
      const headerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 10px 15px; }
            .header-logo { text-align: ${logoPositionMap[logoPosition] || 'left'}; margin: 0; }
            .header-logo img { width: 120px; max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="header-logo">
            <img src="${logoUrl}" alt="Logo">
          </div>
        </body>
        </html>
      `;

      // Salvar header temporariamente
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const headerPath = path.join(tempDir, `header-${Date.now()}.html`);
      fs.writeFileSync(headerPath, headerHtml, 'utf-8');

      wkhtmlOptions.headerHtml = `file:///${headerPath.replace(/\\/g, '/')}`;
      wkhtmlOptions.headerSpacing = 5;

      // Limpar arquivo após 10 segundos
      setTimeout(() => {
        if (fs.existsSync(headerPath)) {
          fs.unlinkSync(headerPath);
        }
      }, 10000);
    }

    // Gerar PDF
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];

      const stream = wkhtmltopdf(fullHtml, wkhtmlOptions);

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log('[PDF Generator - wkhtmltopdf] PDF gerado com sucesso');
        resolve(buffer);
      });

      stream.on('error', (error: Error) => {
        console.error('[PDF Generator - wkhtmltopdf] Erro ao gerar PDF:', error);
        reject(error);
      });
    });

    return pdfBuffer;
  } catch (error) {
    console.error('[PDF Generator - wkhtmltopdf] Erro ao gerar PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
