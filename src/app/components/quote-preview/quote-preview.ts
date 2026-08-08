import { Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CompanyHeader } from '../company-header/company-header';
import { Quote } from '../../models/quote.model';

// Vista de solo lectura de una cotizacion, con el formato final de
// documento. Se usa tanto para @media print como para la captura que
// PdfExport convierte en PDF (siempre debe verse igual en ambos casos).
@Component({
  selector: 'app-quote-preview',
  imports: [CompanyHeader, CurrencyPipe, DatePipe],
  templateUrl: './quote-preview.html',
  styleUrl: './quote-preview.scss',
})
export class QuotePreview {
  readonly quote = input.required<Quote>();
}
