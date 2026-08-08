import { Component, inject, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { QuoteStorage } from '../../services/quote-storage';
import { Quote } from '../../models/quote.model';

// Listado de cotizaciones guardadas en localStorage, ordenadas por fecha
// descendente. Permite abrir/editar, duplicar y eliminar cada una.
@Component({
  selector: 'app-quote-history',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './quote-history.html',
  styleUrl: './quote-history.scss',
})
export class QuoteHistory {
  private readonly storage = inject(QuoteStorage);

  readonly openQuote = output<Quote>();
  readonly duplicateQuote = output<Quote>();

  // Se lee al crear el componente; como el padre lo muestra/oculta con
  // @if, cada vez que vuelve a aparecer se reconstruye con datos frescos.
  protected readonly quotes = signal<Quote[]>(this.storage.getAll());

  protected open(quote: Quote): void {
    this.openQuote.emit(quote);
  }

  protected duplicate(quote: Quote): void {
    const duplicated: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      quoteNumber: this.storage.getNextQuoteNumber(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    this.duplicateQuote.emit(duplicated);
  }

  protected remove(quote: Quote): void {
    const confirmed = confirm(`¿Eliminar la cotización ${quote.quoteNumber}? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }
    this.storage.delete(quote.id);
    this.quotes.set(this.storage.getAll());
  }
}
