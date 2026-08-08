import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { map } from 'rxjs';
import { CompanyHeader } from '../company-header/company-header';
import { QuotePreview } from '../quote-preview/quote-preview';
import { QuoteStorage } from '../../services/quote-storage';
import { PdfExport } from '../../services/pdf-export';
import { Quote, QuoteItem } from '../../models/quote.model';

interface QuoteItemControls {
  quantity: FormControl<number>;
  description: FormControl<string>;
  unitPrice: FormControl<number>;
}

interface QuoteFormControls {
  quoteNumber: FormControl<string>;
  date: FormControl<string>;
  clientName: FormControl<string>;
  clientPhone: FormControl<string>;
  clientAddress: FormControl<string>;
  items: FormArray<FormGroup<QuoteItemControls>>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Formulario principal: datos de cliente, tabla de items (FormArray) e
// imagen opcional. Calcula totales en vivo con signals y delega el guardado
// y la exportacion a PDF en los servicios correspondientes.
@Component({
  selector: 'app-quote-form',
  imports: [ReactiveFormsModule, CurrencyPipe, CompanyHeader, QuotePreview],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.scss',
})
export class QuoteForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly storage = inject(QuoteStorage);
  private readonly pdfExport = inject(PdfExport);

  // Cuando el historial pide editar o duplicar una cotizacion, la pasa aca.
  readonly editingQuote = input<Quote | null>(null);
  readonly quoteSaved = output<Quote>();

  protected readonly quoteId = signal<string>(crypto.randomUUID());
  protected readonly images = signal<string[]>([]);
  protected readonly saveMessage = signal<string | null>(null);
  protected readonly isExporting = signal(false);

  protected readonly form: FormGroup<QuoteFormControls> = this.fb.group<QuoteFormControls>({
    quoteNumber: this.fb.control(this.storage.getNextQuoteNumber(), { validators: Validators.required }),
    date: this.fb.control(todayIso(), { validators: Validators.required }),
    clientName: this.fb.control('', { validators: Validators.required }),
    clientPhone: this.fb.control(''),
    clientAddress: this.fb.control(''),
    items: this.fb.array<FormGroup<QuoteItemControls>>([this.createItem()]),
  });

  // valueChanges tipa cada campo como opcional (por los controles
  // deshabilitados); getRawValue() da la forma completa y no-nula que
  // realmente necesitamos para calcular totales y armar la cotizacion.
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly itemTotals = computed(() =>
    this.formValue().items.map((item) => (item.quantity || 0) * (item.unitPrice || 0)),
  );

  protected readonly subtotal = computed(() => this.itemTotals().reduce((sum, total) => sum + total, 0));

  // Cotizacion "en vivo": se recalcula en cada cambio del formulario y es lo
  // que alimenta la vista previa/PDF y lo que se persiste al guardar.
  protected readonly previewQuote = computed<Quote>(() => {
    const value = this.formValue();
    const totals = this.itemTotals();
    const items: QuoteItem[] = value.items.map((item, index) => ({
      quantity: item.quantity,
      description: item.description,
      unitPrice: item.unitPrice,
      total: totals[index],
    }));
    const total = this.subtotal();
    return {
      id: this.quoteId(),
      quoteNumber: value.quoteNumber,
      date: value.date,
      clientName: value.clientName,
      clientPhone: value.clientPhone || undefined,
      clientAddress: value.clientAddress || undefined,
      items,
      subtotal: total,
      totalToPay: total,
      images: this.images(),
      createdAt: new Date().toISOString(),
    };
  });

  constructor() {
    effect(() => {
      const quote = this.editingQuote();
      if (quote) {
        this.loadQuote(quote);
      }
    });
  }

  protected get items(): FormArray<FormGroup<QuoteItemControls>> {
    return this.form.controls.items;
  }

  protected addItem(): void {
    this.items.push(this.createItem());
  }

  protected removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  protected onImagesSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const files = inputElement.files;
    if (!files || files.length === 0) {
      return;
    }
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => this.images.update((current) => [...current, reader.result as string]);
      reader.readAsDataURL(file);
    });
    // Limpia el input para poder volver a elegir el mismo archivo si se
    // quita de la lista y se quiere agregar de nuevo.
    inputElement.value = '';
  }

  protected removeImage(index: number): void {
    this.images.update((current) => current.filter((_, i) => i !== index));
  }

  // Formatea con puntos de miles/millones (es-CO) mientras se digita el
  // precio unitario, sin usar type="number" (que no admite texto con puntos).
  protected formatThousands(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value || 0);
  }

  protected onUnitPriceInput(event: Event, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const digits = inputElement.value.replace(/\D/g, '');
    const numericValue = digits ? Number(digits) : 0;
    this.items.at(index).controls.unitPrice.setValue(numericValue);
    inputElement.value = this.formatThousands(numericValue);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.saveMessage.set('Revisa los campos obligatorios antes de guardar.');
      return;
    }
    const quote = this.previewQuote();
    this.storage.save(quote);
    this.saveMessage.set('Cotización guardada en el historial.');
    this.quoteSaved.emit(quote);
  }

  protected startNew(): void {
    this.quoteId.set(crypto.randomUUID());
    this.form.reset({
      quoteNumber: this.storage.getNextQuoteNumber(),
      date: todayIso(),
      clientName: '',
      clientPhone: '',
      clientAddress: '',
    });
    this.items.clear();
    this.items.push(this.createItem());
    this.images.set([]);
    this.saveMessage.set(null);
  }

  protected async downloadPdf(): Promise<void> {
    this.isExporting.set(true);
    try {
      await this.pdfExport.downloadQuoteAsPdf(this.previewQuote());
    } finally {
      this.isExporting.set(false);
    }
  }

  private loadQuote(quote: Quote): void {
    this.quoteId.set(quote.id);
    // Se reconstruye el FormArray antes de patchValue: setValue exige que la
    // cantidad de controles coincida exactamente con el arreglo de valores.
    this.items.clear();
    quote.items.forEach((item) => this.items.push(this.createItem(item)));
    this.form.patchValue({
      quoteNumber: quote.quoteNumber,
      date: quote.date,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone ?? '',
      clientAddress: quote.clientAddress ?? '',
    });
    this.images.set(quote.images ?? []);
    this.saveMessage.set(null);
  }

  private createItem(item?: QuoteItem): FormGroup<QuoteItemControls> {
    return this.fb.group<QuoteItemControls>({
      quantity: this.fb.control(item?.quantity ?? 1, { validators: [Validators.required, Validators.min(1)] }),
      description: this.fb.control(item?.description ?? '', { validators: Validators.required }),
      unitPrice: this.fb.control(item?.unitPrice ?? 0, { validators: [Validators.required, Validators.min(0)] }),
    });
  }
}
