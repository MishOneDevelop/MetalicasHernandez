import { Service } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Tamano carta en puntos (jsPDF usa "pt" por defecto con format: 'letter').
const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;
const PAGE_MARGIN_PT = 24;

// Renderiza un nodo del DOM (la vista de cotizacion imprimible) a un PDF
// tamano carta usando html2canvas + jsPDF, sin depender del dialogo de impresion.
@Service()
export class PdfExport {
  async downloadElementAsPdf(element: HTMLElement, fileName: string): Promise<void> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

    const usableWidth = LETTER_WIDTH_PT - PAGE_MARGIN_PT * 2;
    const usableHeight = LETTER_HEIGHT_PT - PAGE_MARGIN_PT * 2;
    const imageHeight = (canvas.height * usableWidth) / canvas.width;

    const imageData = canvas.toDataURL('image/png');

    // Si el contenido cabe en una pagina, se agrega tal cual. Si no, se
    // reparte en varias paginas cortando el canvas por franjas verticales.
    if (imageHeight <= usableHeight) {
      pdf.addImage(imageData, 'PNG', PAGE_MARGIN_PT, PAGE_MARGIN_PT, usableWidth, imageHeight);
    } else {
      let remainingHeightPx = canvas.height;
      const pageHeightPx = (usableHeight * canvas.width) / usableWidth;
      let sourceY = 0;
      let isFirstPage = true;

      while (remainingHeightPx > 0) {
        const sliceHeightPx = Math.min(pageHeightPx, remainingHeightPx);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;

        const context = sliceCanvas.getContext('2d');
        context?.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        if (!isFirstPage) {
          pdf.addPage();
        }
        const sliceImageHeightPt = (sliceHeightPx * usableWidth) / canvas.width;
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', PAGE_MARGIN_PT, PAGE_MARGIN_PT, usableWidth, sliceImageHeightPt);

        sourceY += sliceHeightPx;
        remainingHeightPx -= sliceHeightPx;
        isFirstPage = false;
      }
    }

    pdf.save(fileName);
  }
}
