import { Service } from '@angular/core';
import { Quote } from '../models/quote.model';

const STORAGE_KEY = 'metalicas-hernandez.quotes';

// CRUD de cotizaciones sobre localStorage. No hay backend: este servicio
// es la unica fuente de verdad para persistir y recuperar cotizaciones.
@Service()
export class QuoteStorage {
  getAll(): Quote[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const quotes = JSON.parse(raw) as Quote[];
      return quotes.sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  }

  getById(id: string): Quote | undefined {
    return this.getAll().find((quote) => quote.id === id);
  }

  save(quote: Quote): void {
    const quotes = this.getAll();
    const index = quotes.findIndex((existing) => existing.id === quote.id);
    if (index >= 0) {
      quotes[index] = quote;
    } else {
      quotes.push(quote);
    }
    this.persist(quotes);
  }

  delete(id: string): void {
    const quotes = this.getAll().filter((quote) => quote.id !== id);
    this.persist(quotes);
  }

  // Genera el siguiente numero consecutivo (ej. COT-0001 -> COT-0002) basado
  // en el numero mas alto ya guardado, para que el formulario nunca repita uno.
  getNextQuoteNumber(): string {
    const quotes = this.getAll();
    const lastNumber = quotes.reduce((max, quote) => {
      const match = /(\d+)$/.exec(quote.quoteNumber);
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, value);
    }, 0);
    return `COT-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  private persist(quotes: Quote[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }
}
