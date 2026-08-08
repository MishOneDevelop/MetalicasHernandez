import { Service } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Quote } from '../models/quote.model';

// Tamano carta en puntos y margenes del documento.
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;
const MARGIN_PT = 40;
const CONTENT_WIDTH_PT = PAGE_WIDTH_PT - MARGIN_PT * 2;

const RED = [193, 18, 31] as const;
const DARK = [26, 26, 26] as const;
const GRAY_LABEL = [102, 102, 102] as const;
const GRAY_BG = [246, 246, 246] as const;
const GRAY_BORDER = [204, 204, 204] as const;

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Columnas de la tabla de items, en puntos. Suman CONTENT_WIDTH_PT.
const COL_DESC_PT = 250;
const COL_QTY_PT = 50;
const COL_PRICE_PT = 110;
const COL_TOTAL_PT = CONTENT_WIDTH_PT - COL_DESC_PT - COL_QTY_PT - COL_PRICE_PT;

// Genera el PDF de la cotizacion dibujando directamente con la API de jsPDF
// (texto, lineas, rectangulos) en vez de rasterizar el HTML de la vista
// previa con html2canvas. Esto evita que el resultado dependa del ancho de
// pantalla del dispositivo que genera el PDF (antes, en movil, el PDF salia
// angosto igual que la vista apilada del telefono); aca el documento es
// siempre el mismo layout de escritorio sin importar donde se genere.
@Service()
export class PdfExport {
  async downloadQuoteAsPdf(quote: Quote): Promise<void> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    let y = MARGIN_PT;

    y = await this.drawHeader(pdf, y);
    y = this.drawMeta(pdf, quote, y);
    y = this.drawClientBox(pdf, quote, y);
    y = this.drawItemsTable(pdf, quote, y);
    y = this.drawTotals(pdf, quote, y);
    y = this.drawPaymentBox(pdf, y);
    await this.drawImages(pdf, quote, y);

    pdf.save(`${quote.quoteNumber}.pdf`);
  }

  private async drawHeader(pdf: jsPDF, y: number): Promise<number> {
    const logoSize = 60;
    let textX = MARGIN_PT;

    // Si el logo no carga (falta el archivo), se sigue solo con el texto;
    // el respaldo visual "MH" del encabezado en pantalla no se replica aca
    // por simplicidad, ya que el nombre de la empresa ya identifica el
    // documento igual de bien en un PDF.
    try {
      const logoDataUrl = await this.loadImageAsDataUrl('assets/logo-metalicas-hernandez.png');
      pdf.addImage(logoDataUrl, 'PNG', MARGIN_PT, y, logoSize, logoSize);
      textX = MARGIN_PT + logoSize + 15;
    } catch {
      /* sin logo, el texto arranca en el margen izquierdo */
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...DARK);
    pdf.text('Metálicas Hernández e Hijos', textX, y + 24);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text('NIT: 80767880-1 · Régimen Simplificado', textX, y + 40);

    y += logoSize + 20;
    pdf.setDrawColor(...RED);
    pdf.setLineWidth(2);
    pdf.line(MARGIN_PT, y, PAGE_WIDTH_PT - MARGIN_PT, y);
    return y + 28;
  }

  private drawMeta(pdf: jsPDF, quote: Quote, y: number): number {
    const [year, month, day] = quote.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    this.drawLabelValue(pdf, 'COTIZACIÓN N.º', quote.quoteNumber, MARGIN_PT, y, 'left');
    this.drawLabelValue(pdf, 'FECHA', formattedDate, PAGE_WIDTH_PT - MARGIN_PT, y, 'right');
    return y + 40;
  }

  private drawClientBox(pdf: jsPDF, quote: Quote, y: number): number {
    const lines = ['CLIENTE', quote.clientName || '—'];
    if (quote.clientPhone) lines.push(`Tel: ${quote.clientPhone}`);
    if (quote.clientAddress) lines.push(`Dirección: ${quote.clientAddress}`);

    const boxHeight = 20 + (lines.length - 1) * 16;
    pdf.setFillColor(...GRAY_BG);
    pdf.roundedRect(MARGIN_PT, y, CONTENT_WIDTH_PT, boxHeight, 3, 3, 'F');

    let lineY = y + 18;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text(lines[0], MARGIN_PT + 12, lineY);
    lineY += 16;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...DARK);
    for (const line of lines.slice(1)) {
      pdf.text(line, MARGIN_PT + 12, lineY);
      lineY += 16;
    }

    return y + boxHeight + 25;
  }

  private drawItemsTable(pdf: jsPDF, quote: Quote, y: number): number {
    const headerHeight = 24;
    const colX = {
      desc: MARGIN_PT,
      qty: MARGIN_PT + COL_DESC_PT,
      price: MARGIN_PT + COL_DESC_PT + COL_QTY_PT,
      total: MARGIN_PT + COL_DESC_PT + COL_QTY_PT + COL_PRICE_PT,
    };

    y = this.ensureSpace(pdf, y, headerHeight);
    this.drawTableHeader(pdf, y, colX, headerHeight);
    y += headerHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    for (const item of quote.items) {
      const descLines = pdf.splitTextToSize(item.description || '—', COL_DESC_PT - 16);
      const rowHeight = Math.max(descLines.length * 12 + 14, 30);

      if (y + rowHeight > PAGE_HEIGHT_PT - MARGIN_PT) {
        pdf.addPage();
        y = MARGIN_PT;
        this.drawTableHeader(pdf, y, colX, headerHeight);
        y += headerHeight;
      }

      pdf.setDrawColor(...GRAY_BORDER);
      pdf.rect(MARGIN_PT, y, CONTENT_WIDTH_PT, rowHeight);
      pdf.line(colX.qty, y, colX.qty, y + rowHeight);
      pdf.line(colX.price, y, colX.price, y + rowHeight);
      pdf.line(colX.total, y, colX.total, y + rowHeight);

      pdf.setTextColor(...DARK);
      pdf.text(descLines, colX.desc + 8, y + 14);
      pdf.text(String(item.quantity), colX.qty + COL_QTY_PT / 2, y + 18, { align: 'center' });
      pdf.text(currencyFormatter.format(item.unitPrice), colX.price + COL_PRICE_PT - 8, y + 18, { align: 'right' });
      pdf.setFont('helvetica', 'bold');
      pdf.text(currencyFormatter.format(item.total), colX.total + COL_TOTAL_PT - 8, y + 18, { align: 'right' });
      pdf.setFont('helvetica', 'normal');

      y += rowHeight;
    }

    return y + 20;
  }

  private drawTableHeader(pdf: jsPDF, y: number, colX: Record<'desc' | 'qty' | 'price' | 'total', number>, height: number): void {
    pdf.setFillColor(...DARK);
    pdf.rect(MARGIN_PT, y, CONTENT_WIDTH_PT, height, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Descripción', colX.desc + 8, y + 16);
    pdf.text('Cant.', colX.qty + COL_QTY_PT / 2, y + 16, { align: 'center' });
    pdf.text('Precio unit.', colX.price + COL_PRICE_PT - 8, y + 16, { align: 'right' });
    pdf.text('Total', colX.total + COL_TOTAL_PT - 8, y + 16, { align: 'right' });
  }

  private drawTotals(pdf: jsPDF, quote: Quote, y: number): number {
    y = this.ensureSpace(pdf, y, 50);
    const labelX = PAGE_WIDTH_PT - MARGIN_PT - 180;
    const valueX = PAGE_WIDTH_PT - MARGIN_PT;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text('Subtotal', labelX, y);
    pdf.setTextColor(...DARK);
    pdf.text(currencyFormatter.format(quote.subtotal), valueX, y, { align: 'right' });
    y += 18;

    pdf.setDrawColor(...RED);
    pdf.setLineWidth(1.5);
    pdf.line(labelX, y - 12, valueX, y - 12);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text('Total a pagar', labelX, y + 6);
    pdf.setTextColor(...DARK);
    pdf.text(currencyFormatter.format(quote.totalToPay), valueX, y + 6, { align: 'right' });

    return y + 35;
  }

  private drawPaymentBox(pdf: jsPDF, y: number): number {
    const lines = [
      'DATOS DE PAGO',
      'Edgar Giovanny Hernández Flores',
      'C.C. 80.767.880',
      'Celular: 314 431 3828',
      'Nequi / Daviplata: 314 431 3828',
    ];
    const boxHeight = 18 + (lines.length - 1) * 15 + 10;
    y = this.ensureSpace(pdf, y, boxHeight);

    pdf.setFillColor(...GRAY_BG);
    pdf.rect(MARGIN_PT, y, CONTENT_WIDTH_PT, boxHeight, 'F');
    pdf.setFillColor(...RED);
    pdf.rect(MARGIN_PT, y, 3, boxHeight, 'F');

    let lineY = y + 18;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text(lines[0], MARGIN_PT + 14, lineY);
    lineY += 15;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...DARK);
    for (const line of lines.slice(1)) {
      pdf.text(line, MARGIN_PT + 14, lineY);
      lineY += 15;
    }

    return y + boxHeight + 25;
  }

  private async drawImages(pdf: jsPDF, quote: Quote, y: number): Promise<void> {
    if (!quote.images?.length) return;

    y = this.ensureSpace(pdf, y, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text('REFERENCIA', MARGIN_PT, y);
    y += 12;

    const maxImageHeight = 200;
    for (const image of quote.images) {
      const format = image.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      const size = await this.getImageSize(image);
      const scale = Math.min(CONTENT_WIDTH_PT / size.width, maxImageHeight / size.height, 1);
      const width = size.width * scale;
      const height = size.height * scale;

      y = this.ensureSpace(pdf, y, height);
      pdf.addImage(image, format, MARGIN_PT, y, width, height);
      y += height + 12;
    }
  }

  private drawLabelValue(pdf: jsPDF, label: string, value: string, x: number, y: number, align: 'left' | 'right'): void {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text(label, x, y, { align });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...DARK);
    pdf.text(value, x, y + 16, { align });
  }

  // Si lo que sigue no cabe en el espacio restante de la pagina, arranca
  // una pagina nueva y devuelve el cursor Y reiniciado en el margen.
  private ensureSpace(pdf: jsPDF, y: number, neededHeight: number): number {
    if (y + neededHeight <= PAGE_HEIGHT_PT - MARGIN_PT) {
      return y;
    }
    pdf.addPage();
    return MARGIN_PT;
  }

  private async loadImageAsDataUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No se pudo cargar la imagen: ${url}`);
    }
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('No se pudo leer el tamaño de la imagen'));
      image.src = dataUrl;
    });
  }
}
