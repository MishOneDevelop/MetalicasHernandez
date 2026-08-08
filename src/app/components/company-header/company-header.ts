import { Component, signal } from '@angular/core';

// Encabezado fijo de la empresa: logo + datos no editables. Se reutiliza
// tanto en el formulario como en la vista de impresion/PDF.
@Component({
  selector: 'app-company-header',
  imports: [],
  templateUrl: './company-header.html',
  styleUrl: './company-header.scss',
})
export class CompanyHeader {
  // Si src/assets/logo-metalicas-hernandez.png no existe, el <img> dispara
  // (error) y se muestra el monograma SVG de respaldo en su lugar, para que
  // el logo siempre aparezca aunque no se haya cargado la foto real.
  protected readonly logoImageFailed = signal(false);

  protected onLogoImageError(): void {
    this.logoImageFailed.set(true);
  }
}
