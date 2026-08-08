// Un item de la tabla de la cotizacion (una fila de producto/servicio).
export interface QuoteItem {
  quantity: number;
  description: string;
  unitPrice: number;
  total: number; // quantity * unitPrice, calculado en el formulario
}

// Cotizacion completa, tal como se persiste en localStorage.
export interface Quote {
  id: string;
  quoteNumber: string;
  date: string; // ISO (yyyy-MM-dd)
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  items: QuoteItem[];
  subtotal: number;
  totalToPay: number;
  images?: string[];
  createdAt: string; // ISO datetime, fecha de creacion del registro
}
