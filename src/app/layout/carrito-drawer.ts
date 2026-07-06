// ============================================================
// PANEL LATERAL DEL CARRITO
// Se desliza desde la derecha. Muestra las cartas del carrito
// con su imagen, acabado, idioma, precio, y controles de
// cantidad (+/-) y quitar. Abajo el total y "Ir a pagar".
// Vive a nivel de app (sobre todo lo demas).
// ============================================================
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CarritoService } from '../core/carrito.service';

@Component({
  selector: 'app-carrito-drawer',
  template: `
    <!-- Fondo oscuro: al hacer clic cierra el panel -->
    @if (carrito.abierto()) {
      <div class="fondo" (click)="carrito.cerrar()"></div>
    }

    <aside class="panel" [class.abierto]="carrito.abierto()">
      <header class="panel-cabecera">
        <h2>🛒 Tu carrito</h2>
        <button class="cerrar" (click)="carrito.cerrar()" title="Cerrar">✕</button>
      </header>

      @if (carrito.items().length === 0) {
        <p class="vacio">Tu carrito está vacío.<br>Explora el catálogo y agrega cartas.</p>
      } @else {
        <div class="lista">
          @for (item of carrito.items(); track item.variantId) {
            <div class="item">
              @if (item.imageUrl) {
                <img [src]="item.imageUrl" [alt]="item.nombre" class="item-img">
              }
              <div class="item-datos">
                <span class="item-nombre">{{ item.nombre }}</span>
                <span class="item-meta">
                  {{ etiqueta(item) }}
                </span>
                <span class="item-precio">{{ formato(item.precio) }} c/u</span>
                <div class="item-controles">
                  <button (click)="carrito.cambiarCantidad(item.variantId, -1)">−</button>
                  <span class="cantidad">{{ item.cantidad }}</span>
                  <button (click)="carrito.cambiarCantidad(item.variantId, 1)"
                          [disabled]="item.cantidad >= item.stock">+</button>
                  <button class="quitar" (click)="carrito.quitar(item.variantId)"
                          title="Quitar">🗑</button>
                </div>
              </div>
              <span class="item-subtotal">{{ formato(item.precio * item.cantidad) }}</span>
            </div>
          }
        </div>

        <footer class="panel-pie">
          <div class="total-fila">
            <span>Total</span>
            <span class="total-monto">{{ formato(carrito.total()) }}</span>
          </div>
          <p class="nota-envio">El envío se calcula al finalizar la compra.</p>
          <button class="btn-dorado btn-pagar" (click)="irAPagar()">Ir a pagar</button>
          <button class="btn-fantasma btn-vaciar" (click)="carrito.vaciar()">Vaciar carrito</button>
        </footer>
      }
    </aside>
  `,
  styles: `
    .fondo {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 200;
      animation: aparecer 0.2s ease;
    }
    @keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      height: 100%;
      width: 400px;
      max-width: 92vw;
      background: var(--negro-suave);
      border-left: 1px solid var(--dorado-oscuro);
      z-index: 201;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);   /* escondido a la derecha */
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
    }
    .panel.abierto { transform: translateX(0); }   /* entra a la vista */

    .panel-cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.2rem;
      border-bottom: 1px solid var(--negro-borde);
    }
    .panel-cabecera h2 { font-size: 1.15rem; }
    .cerrar {
      background: transparent;
      border: none;
      color: var(--texto-suave);
      font-size: 1.1rem;
      cursor: pointer;
    }
    .cerrar:hover { color: var(--dorado); }

    .vacio {
      text-align: center;
      color: var(--texto-suave);
      padding: 3rem 1.5rem;
      line-height: 1.8;
    }

    .lista {
      flex: 1;
      overflow-y: auto;
      padding: 0.8rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }
    .item {
      display: grid;
      grid-template-columns: 46px 1fr auto;
      gap: 0.7rem;
      padding: 0.6rem;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
    }
    .item-img {
      width: 46px;
      border-radius: 4px;
    }
    .item-datos { display: flex; flex-direction: column; gap: 2px; }
    .item-nombre { font-weight: 600; font-size: 0.85rem; }
    .item-meta {
      font-size: 0.72rem;
      color: var(--texto-suave);
      text-transform: capitalize;
    }
    .item-precio { font-size: 0.72rem; color: var(--texto-suave); }
    .item-controles {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.3rem;
    }
    .item-controles button {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      border: 1px solid var(--negro-borde);
      background: var(--negro-suave);
      color: var(--texto);
      cursor: pointer;
      font-size: 0.85rem;
    }
    .item-controles button:hover:not([disabled]) { border-color: var(--dorado); }
    .item-controles button[disabled] { opacity: 0.35; cursor: default; }
    .cantidad { min-width: 20px; text-align: center; font-weight: 600; }
    .quitar { margin-left: auto; }
    .item-subtotal {
      font-weight: 700;
      color: var(--dorado);
      font-size: 0.85rem;
      white-space: nowrap;
    }

    .panel-pie {
      border-top: 1px solid var(--negro-borde);
      padding: 1rem 1.2rem;
    }
    .total-fila {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-family: var(--fuente-titulos);
      font-size: 1.1rem;
    }
    .total-monto { color: var(--dorado); font-weight: 700; }
    .nota-envio {
      font-size: 0.72rem;
      color: var(--texto-suave);
      margin: 0.3rem 0 0.9rem;
    }
    .btn-pagar { width: 100%; margin-bottom: 0.5rem; }
    .btn-vaciar { width: 100%; padding: 0.5rem; font-size: 0.8rem; }
  `
})
export class CarritoDrawer {
  carrito = inject(CarritoService);
  private router = inject(Router);

  etiqueta(item: { finish: string; language: string }): string {
    const acabado = item.finish === 'normal' ? 'Normal' : item.finish;
    return `${acabado} · ${item.language.toUpperCase()}`;
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }

  irAPagar() {
    this.carrito.cerrar();
    this.router.navigate(['/checkout']);
  }
}
