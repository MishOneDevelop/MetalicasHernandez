import { Component, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { QuoteForm } from './components/quote-form/quote-form';
import { QuoteHistory } from './components/quote-history/quote-history';
import { Quote } from './models/quote.model';

// Registrado aqui (y no solo en app.config.ts) para que los pipes de
// moneda/fecha en es-CO tengan datos de locale disponibles tambien en los
// tests, que instancian App directamente sin pasar por bootstrapApplication.
registerLocaleData(localeEsCo);

type View = 'form' | 'history';

// Orquesta la pantalla principal: alterna entre el formulario de cotizacion
// y el historial, y les pasa la cotizacion a editar/duplicar entre ambos.
@Component({
  selector: 'app-root',
  imports: [QuoteForm, QuoteHistory],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly view = signal<View>('form');
  protected readonly quoteToLoad = signal<Quote | null>(null);

  protected showForm(): void {
    this.view.set('form');
  }

  protected showHistory(): void {
    this.view.set('history');
  }

  protected onQuoteSaved(): void {
    this.view.set('history');
  }

  protected onOpenQuote(quote: Quote): void {
    this.quoteToLoad.set(quote);
    this.view.set('form');
  }

  protected onDuplicateQuote(quote: Quote): void {
    this.quoteToLoad.set(quote);
    this.view.set('form');
  }
}
