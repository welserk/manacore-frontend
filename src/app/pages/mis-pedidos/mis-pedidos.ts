// ============================================================
// MIS PEDIDOS — el historial de compras del cliente.
// Cada pedido muestra: numero, fecha, ESTADO (insignia de color),
// las cartas compradas (con el precio historico al que se pagaron),
// envio + total, y segun el estado:
//   - AWAITING_PAYMENT -> boton "Pagar ahora" (checkout del mismo pedido)
//   - SHIPPED/DELIVERED -> transportadora + numero de guia + archivo
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PedidoService, Pedido } from '../../core/pedido.service';
import { API_URL } from '../../core/catalogo.service';

// Como se ve cada estado: texto en espanol + color de la insignia
const ESTADOS: Record<string, { texto: string; color: string }> = {
  AWAITING_PAYMENT: { texto: 'Esperando pago', color: '#d4af37' },
  PAID:             { texto: 'Pagado',         color: '#52c98a' },
  SHIPPED:          { texto: 'Enviado',        color: '#5aa9e8' },
  DELIVERED:        { texto: 'Entregado',      color: '#00733e' },
  CANCELLED:        { texto: 'Cancelado',      color: '#d3202a' }
};

@Component({
  selector: 'app-mis-pedidos',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <section class="pedidos">
      <h1>Mis pedidos</h1>

      <nav class="tabs-cuenta">
        <a routerLink="/cuenta" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Mi perfil</a>
        <a routerLink="/cuenta/pedidos" routerLinkActive="activo">Mis pedidos</a>
      </nav>

      @if (cargando()) {
        <p class="vacio">Cargando tus pedidos…</p>
      } @else if (pedidos().length === 0) {
        <p class="vacio">
          Aún no tienes pedidos.<br>
          <a routerLink="/catalogo" class="btn-dorado">Ir al catálogo</a>
        </p>
      } @else {
        @for (pedido of pedidos(); track pedido.id) {
          <div class="panel pedido">

            <!-- Encabezado: numero + fecha + insignia de estado -->
            <div class="cabecera">
              <div>
                <span class="numero">{{ pedido.orderNumber }}</span>
                <span class="fecha">{{ fecha(pedido.createdAt) }}</span>
              </div>
              <span class="insignia" [style.--color-estado]="estado(pedido).color">
                {{ estado(pedido).texto }}
              </span>
            </div>

            <!-- Las cartas del pedido -->
            @for (item of pedido.items; track item.id) {
              <div class="linea">
                <span>{{ item.quantity }}× {{ item.variant.card.name }}
                  <em>({{ item.variant.finish }} · {{ item.variant.language.toUpperCase() }})</em>
                </span>
                <span class="precio">{{ formato(item.subtotal) }}</span>
              </div>
            }

            <hr class="separador-dorado">
            <div class="linea">
              <span>Envío a {{ pedido.shippingCity }}</span>
              <span class="precio">{{ pedido.shippingCost > 0 ? formato(pedido.shippingCost) : 'Gratis' }}</span>
            </div>
            <div class="linea total">
              <span>Total</span>
              <span class="precio">{{ formato(pedido.totalCop) }}</span>
            </div>

            @if (pedido.notes) {
              <p class="notas">📝 {{ pedido.notes }}</p>
            }

            <!-- Rastreo: aparece cuando la tienda despacha el paquete -->
            @if (pedido.trackingNumber) {
              <div class="rastreo">
                <span>📦 <strong>{{ pedido.shippingCarrier }}</strong> —
                  guía <strong>{{ pedido.trackingNumber }}</strong></span>
                @if (pedido.guideFilePath) {
                  <a [href]="urlGuia(pedido)" target="_blank" class="ver-guia">Ver guía</a>
                }
              </div>
            }

            <!-- Pedido sin pagar: se puede retomar el pago -->
            @if (pedido.status === 'AWAITING_PAYMENT') {
              @if (errorPago() && pagandoNumero() === pedido.orderNumber) {
                <p class="error">{{ errorPago() }}</p>
              }
              <button class="btn-dorado pagar"
                      [disabled]="pagandoNumero() === pedido.orderNumber"
                      (click)="pagarAhora(pedido)">
                {{ pagandoNumero() === pedido.orderNumber ? 'Preparando el pago…' : 'Pagar ahora' }}
              </button>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .pedidos {
      max-width: 720px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    h1 { text-align: center; font-size: 1.6rem; margin-bottom: 1.2rem; }
    .vacio { text-align: center; color: var(--texto-suave); line-height: 3; padding: 1rem 0; }

    .tabs-cuenta {
      display: flex;
      justify-content: center;
      gap: 0.6rem;
      margin-bottom: 1.6rem;
    }
    .tabs-cuenta a {
      padding: 0.5rem 1.3rem;
      border: 1px solid var(--negro-borde);
      border-radius: 20px;
      color: var(--texto-suave);
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .tabs-cuenta a.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    .pedido { padding: 1.3rem 1.5rem; margin-bottom: 1.2rem; }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.9rem;
    }
    .numero {
      font-family: var(--fuente-titulos);
      font-weight: 700;
      color: var(--dorado);
      margin-right: 0.8rem;
    }
    .fecha { color: var(--texto-suave); font-size: 0.82rem; }
    /* La insignia toma su color del estado via variable CSS */
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.25rem 0.9rem;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .linea {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.35rem 0;
      font-size: 0.9rem;
    }
    .linea em { color: var(--texto-suave); font-style: normal; font-size: 0.78rem; }
    .precio { color: var(--dorado); font-weight: 600; white-space: nowrap; }
    .linea.total { font-family: var(--fuente-titulos); font-size: 1.05rem; }

    .notas {
      color: var(--texto-suave);
      font-size: 0.82rem;
      margin-top: 0.5rem;
      line-height: 1.5;
    }
    .rastreo {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-top: 0.8rem;
      padding: 0.7rem 1rem;
      background: rgba(90, 169, 232, 0.08);
      border: 1px solid rgba(90, 169, 232, 0.35);
      border-radius: 8px;
      font-size: 0.85rem;
    }
    .ver-guia {
      color: var(--dorado);
      font-weight: 600;
      white-space: nowrap;
    }
    .pagar { margin-top: 0.9rem; }
    .pagar:disabled { opacity: 0.55; cursor: not-allowed; }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      margin-top: 0.9rem;
    }
  `
})
export class MisPedidos {

  private servicio = inject(PedidoService);

  pedidos = signal<Pedido[]>([]);
  cargando = signal(true);
  // orderNumber del pedido que se esta pagando (para el boton correcto)
  pagandoNumero = signal('');
  errorPago = signal('');

  constructor() {
    this.servicio.misPedidos().subscribe({
      next: (lista) => {
        // Mas recientes primero
        this.pedidos.set([...lista].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  estado(pedido: Pedido) {
    return ESTADOS[pedido.status] ?? { texto: pedido.status, color: '#888' };
  }

  // La guia (foto/PDF) la sirve el backend en /uploads/**
  urlGuia(pedido: Pedido): string {
    return `${API_URL}${pedido.guideFilePath}`;
  }

  // Retomar el pago de un pedido que quedo esperando: se pide un
  // checkout nuevo del MISMO pedido y se va a MercadoPago
  pagarAhora(pedido: Pedido) {
    this.errorPago.set('');
    this.pagandoNumero.set(pedido.orderNumber);
    this.servicio.crearCheckout(pedido.orderNumber).subscribe({
      next: (checkout) => window.location.href = checkout.initPoint,
      error: (e) => {
        this.pagandoNumero.set('');
        this.errorPago.set(e.error?.error ?? 'No se pudo iniciar el pago.');
      }
    });
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
