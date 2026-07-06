// ============================================================
// RESULTADO DEL PAGO
// MercadoPago devuelve al cliente a una de estas tres URLs
// (backUrls configuradas en el backend):
//   /pago/exitoso   -> pago aprobado
//   /pago/pendiente -> pago en proceso (ej: PSE tarda en acreditar)
//   /pago/fallido   -> pago rechazado o cancelado
// MercadoPago agrega ?external_reference=MNC-... (nuestro numero
// de pedido) y datos del pago en la URL; los usamos para mostrar
// el numero y, si fallo, para REINTENTAR el pago del mismo pedido.
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PedidoService } from '../../core/pedido.service';

type Resultado = 'exitoso' | 'pendiente' | 'fallido';

// Texto e icono de cada resultado, en un solo lugar
const CONTENIDO: Record<Resultado, { icono: string; titulo: string; mensaje: string }> = {
  exitoso: {
    icono: '🎉',
    titulo: '¡Pago exitoso!',
    mensaje: 'Tu pago fue aprobado. En cuanto se confirme, prepararemos tu pedido y te avisaremos por correo cuando sea despachado.'
  },
  pendiente: {
    icono: '⏳',
    titulo: 'Pago en proceso',
    mensaje: 'Tu pago está siendo procesado (algunos medios como PSE tardan unos minutos). Te confirmaremos por correo apenas se acredite. No pagues de nuevo.'
  },
  fallido: {
    icono: '😕',
    titulo: 'El pago no se completó',
    mensaje: 'Tu pago fue rechazado o cancelado. Tranquilo: tu pedido quedó guardado y puedes intentar pagarlo de nuevo.'
  }
};

@Component({
  selector: 'app-pago-resultado',
  imports: [RouterLink],
  template: `
    <section class="resultado">
      <div class="panel tarjeta">
        <span class="icono">{{ contenido().icono }}</span>
        <h1>{{ contenido().titulo }}</h1>
        @if (orderNumber()) {
          <p class="pedido">Pedido <strong>{{ orderNumber() }}</strong></p>
        }
        <p class="mensaje">{{ contenido().mensaje }}</p>

        @if (errorReintento()) { <p class="error">{{ errorReintento() }}</p> }

        <div class="botones">
          @if (resultado() === 'fallido' && orderNumber()) {
            <button class="btn-dorado" (click)="reintentar()" [disabled]="reintentando()">
              {{ reintentando() ? 'Preparando el pago…' : 'Reintentar el pago' }}
            </button>
          }
          <a routerLink="/catalogo" class="btn-fantasma">Seguir explorando</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .resultado {
      max-width: 560px;
      margin: 0 auto;
      padding: 4rem 2rem;
    }
    .tarjeta {
      text-align: center;
      padding: 2.5rem 2rem;
    }
    .icono { font-size: 3rem; }
    h1 { font-size: 1.5rem; margin: 0.8rem 0 0.4rem; }
    .pedido {
      color: var(--dorado);
      font-size: 0.95rem;
      margin-bottom: 0.8rem;
    }
    .mensaje {
      color: var(--texto-suave);
      font-size: 0.92rem;
      line-height: 1.7;
      margin-bottom: 1.6rem;
    }
    .botones {
      display: flex;
      justify-content: center;
      gap: 0.9rem;
      flex-wrap: wrap;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
  `
})
export class PagoResultado {

  private ruta = inject(ActivatedRoute);
  private pedidos = inject(PedidoService);

  reintentando = signal(false);
  errorReintento = signal('');

  // El resultado viene en la URL (/pago/exitoso -> "exitoso").
  // Cualquier valor raro se trata como pendiente (mensaje neutro).
  resultado = computed<Resultado>(() => {
    const r = this.ruta.snapshot.paramMap.get('resultado');
    return (r === 'exitoso' || r === 'fallido') ? r : 'pendiente';
  });

  contenido = computed(() => CONTENIDO[this.resultado()]);

  // Nuestro numero de pedido, que MercadoPago devuelve como
  // external_reference (lo pusimos al crear la preferencia)
  orderNumber = computed(() =>
    this.ruta.snapshot.queryParamMap.get('external_reference'));

  // El pedido sigue AWAITING_PAYMENT en el backend: se puede pedir
  // un checkout nuevo del MISMO pedido y volver a MercadoPago
  reintentar() {
    const numero = this.orderNumber();
    if (!numero || this.reintentando()) return;
    this.errorReintento.set('');
    this.reintentando.set(true);
    this.pedidos.crearCheckout(numero).subscribe({
      next: (checkout) => window.location.href = checkout.initPoint,
      error: (e) => {
        this.reintentando.set(false);
        this.errorReintento.set(e.error?.error
          ?? 'No se pudo iniciar el pago. Intenta de nuevo o contáctanos.');
      }
    });
  }
}
