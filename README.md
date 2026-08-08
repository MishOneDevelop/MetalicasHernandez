# Metálicas Hernández e Hijos — Generador de cotizaciones

Aplicación web 100% frontend (sin backend) para generar cotizaciones de Metálicas Hernández e Hijos. Construida con Angular (standalone components, Signals, Reactive Forms) y TypeScript estricto. Toda la persistencia se hace en `localStorage` del navegador.

## Qué hace

- Formulario de cotización: datos del cliente, tabla de ítems (cantidad, descripción, precio unitario) con subtotal y total calculados en tiempo real.
- Imagen de referencia opcional (se guarda como base64).
- Vista previa tipo documento, lista para imprimir (`@media print`) o exportar.
- Exportar la cotización a PDF (jsPDF + html2canvas), tamaño carta.
- Historial de cotizaciones guardadas en `localStorage`: abrir/editar, duplicar o eliminar.
- Numeración consecutiva automática (`COT-0001`, `COT-0002`, ...).

## Logo de la empresa

El encabezado busca `public/assets/logo-metalicas-hernandez.png`. Si el archivo no existe, se muestra automáticamente un monograma "MH" en SVG/CSS (rojo, con el nombre en arco) como respaldo, así que la app funciona igual sin la imagen. Para usar la foto real del letrero, solo copia el PNG a esa ruta con ese nombre exacto.

## Desarrollo

```bash
npm install
ng serve
```

Abre `http://localhost:4200/`. No requiere backend ni variables de entorno.

## Build de producción

```bash
ng build
```

Los artefactos quedan en `dist/`.
