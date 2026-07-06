// ============================================================
// CHECKOUT (version inicial)
// Muestra el resumen del pedido (cartas + total). El paso de
// login, direccion de envio y pago con MercadoPago se conecta
// en la siguiente etapa. Por ahora confirma lo que se compra.
// ============================================================
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/carrito.service';

@Component({
  selector: 'app-checkout',
  imports: [RouterLink],
  template: `
    <section class="checkout">
      <h1>Finalizar compra</h1>

      @if (carrito.items().length === 0) {
        <p class="vacio">
          Tu carrito está vacío.<br>
          <a routerLink="/catalogo" class="btn-dorado">Ir al catálogo</a>
        </p>
      } @else {
        <div class="resumen panel">
          <h2>Resumen del pedido</h2>
          @for (item of carrito.items(); track item.variantId) {
            <div class="linea">
              <span>{{ item.cantidad }}× {{ item.nombre }}
                <em>({{ item.finish }} · {{ item.language.toUpperCase() }})</em>
              </span>
              <span class="linea-precio">{{ formato(item.precio * item.cantidad) }}</span>
            </div>
          }
          <hr class="separador-dorado">
          <div class="linea total">
            <span>Total ({{ carrito.cantidadTotal() }} cartas)</span>
            <span class="linea-precio">{{ formato(carrito.total()) }}</span>
          </div>
        </div>

        <div class="siguiente panel">
          <p>🔒 Para completar tu compra necesitas iniciar sesión.
             Ahí elegirás la dirección de envío y pagarás de forma segura con MercadoPago.</p>
          <p class="proximo">Este paso (login + envío + pago) se conecta a continuación.</p>
        </div>
      }
    </section>
  `,
  styles: `
    .checkout {
      max-width: 700px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    h1 { text-align: center; font-size: 1.6rem; margin-bottom: 1.6rem; }
    .vacio { text-align: center; color: var(--texto-suave); line-height: 3; }
    .resumen, .siguiente { padding: 1.3rem 1.5rem; margin-bottom: 1.2rem; }
    .resumen h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .linea {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.4rem 0;
      font-size: 0.92rem;
    }
    .linea em { color: var(--texto-suave); font-style: normal; font-size: 0.8rem; }
    .linea-precio { color: var(--dorado); font-weight: 600; white-space: nowrap; }
    .linea.total { font-family: var(--fuente-titulos); font-size: 1.1rem; }
    .siguiente p { color: var(--texto-suave); font-size: 0.9rem; line-height: 1.6; }
    .proximo { margin-top: 0.6rem; font-size: 0.82rem; opacity: 0.8; }
  `
})
export class Checkout {
  carrito = inject(CarritoService);

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
