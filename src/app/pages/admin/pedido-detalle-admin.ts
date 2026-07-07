// ============================================================
// PANEL ADMIN — DETALLE DE UN PEDIDO
// La pagina propia de cada pedido (se llega desde la lista).
// Muestra todo: cliente, direccion, notas, las cartas CON SU
// IMAGEN (para que quien empaca las encuentre facil), total y
// rastreo. Y las acciones segun el estado:
//   - PAGADO: despachar (transportadora + guia + archivo) ->
//     correo automatico al cliente + boton de WhatsApp
//   - ENVIADO: marcar como entregado
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { Pedido } from '../../core/pedido.service';
import { API_URL } from '../../core/catalogo.service';
import { ESTADOS_PEDIDO } from './pedidos-admin';

// Las unicas transportadoras que el backend acepta
const TRANSPORTADORAS = ['Envia', 'Servientrega', 'Interrapidisimo'];

@Component({
  selector: 'app-admin-pedido-detalle',
  imports: [RouterLink, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="detalle-pedido fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <a routerLink="/manacore-panel/pedidos" class="volver">← Volver a pedidos</a>

      @if (cargando()) {
        <p class="vacio">Cargando pedido…</p>
      } @else if (!pedido()) {
        <p class="vacio">No se encontró el pedido.</p>
      } @else {
        @if (pedido(); as p) {
          <div class="cabecera">
            <h1>{{ p.orderNumber }}</h1>
            <span class="insignia" [style.--color-estado]="estado(p).color">
              {{ estado(p).texto }}
            </span>
          </div>

          <div class="panel tarjeta">
            <p class="dato">🗓 {{ fecha(p.createdAt) }}</p>
            @if (p.user) {
              <p class="dato">👤 <strong>{{ p.user.name }}</strong>
                · {{ p.user.email }}
                @if (p.user.phone) { · 📱 {{ p.user.phone }} }
              </p>
            }
            <p class="dato">📍 {{ p.shippingAddress }} — {{ p.shippingCity }}</p>
            @if (p.notes) { <p class="dato">📝 {{ p.notes }}</p> }
          </div>

          <!-- Las cartas, con imagen para encontrarlas facil -->
          <div class="panel tarjeta">
            <h2>Cartas del pedido</h2>
            @for (item of p.items; track item.id) {
              <div class="item">
                @if (item.variant.card.imageUrl) {
                  <img [src]="item.variant.card.imageUrl" alt=""
                       class="item-img" loading="lazy">
                }
                <div class="item-info">
                  <span class="item-nombre">{{ item.quantity }}× {{ item.variant.card.name }}</span>
                  <em>{{ item.variant.card.mtgSet.name }} (#{{ item.variant.card.collectorNumber }})
                    · {{ item.variant.finish }}
                    · {{ item.variant.language.toUpperCase() }}</em>
                </div>
                <span class="precio">{{ formato(item.subtotal) }}</span>
              </div>
            }
            <div class="linea total">
              <span>Total (envío {{ p.shippingCost > 0 ? formato(p.shippingCost) : 'gratis' }})</span>
              <span class="precio">{{ formato(p.totalCop) }}</span>
            </div>
          </div>

          <!-- Rastreo si ya fue despachado -->
          @if (p.trackingNumber) {
            <div class="panel tarjeta">
              <p class="dato">🚚 <strong>{{ p.shippingCarrier }}</strong> —
                guía <strong>{{ p.trackingNumber }}</strong>
                @if (p.guideFilePath) {
                  · <a [href]="urlGuia(p)" target="_blank">Ver guía</a>
                }
              </p>
            </div>
          }

          @if (error()) { <p class="error">{{ error() }}</p> }

          <!-- ====== DESPACHAR (solo PAGADO) ====== -->
          @if (p.status === 'PAID') {
            <div class="panel tarjeta">
              <h2>Despachar</h2>
              <div class="despacho">
                <select [ngModel]="transportadora()" (ngModelChange)="transportadora.set($event)"
                        [ngModelOptions]="{ standalone: true }">
                  <option value="" disabled>Transportadora…</option>
                  @for (t of transportadoras; track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
                <input type="text" class="campo-guia" placeholder="Número de guía"
                       [ngModel]="guia()" (ngModelChange)="guia.set($event)"
                       [ngModelOptions]="{ standalone: true }">
                <input type="file" accept="image/*,.pdf"
                       (change)="elegirArchivoGuia($event)">
                <button class="btn-dorado"
                        [disabled]="trabajando() || !transportadora() || !guia().trim()"
                        (click)="despachar(p)">
                  {{ trabajando() ? 'Despachando…' : '🚚 Despachar' }}
                </button>
              </div>
            </div>
          }

          <!-- WhatsApp listo tras despachar -->
          @if (whatsappLink()) {
            <div class="panel tarjeta">
              <p class="aviso">Despachado ✔ — el correo al cliente ya salió.</p>
              <a [href]="whatsappLink()" target="_blank" class="btn-dorado">
                📱 Avisar por WhatsApp
              </a>
            </div>
          }

          <!-- ====== ENTREGAR (solo ENVIADO) ====== -->
          @if (p.status === 'SHIPPED') {
            <button class="btn-fantasma btn-entregar"
                    [disabled]="trabajando()"
                    (click)="entregar(p)">
              {{ trabajando() ? '…' : '✔ Marcar como entregado' }}
            </button>
          }
        }
      }
    </section>
  `,
  styles: `
    .detalle-pedido {
      max-width: 720px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .volver {
      display: inline-block;
      color: var(--texto-suave);
      font-size: 0.88rem;
      margin-bottom: 1rem;
    }
    .volver:hover { color: var(--dorado); }
    .vacio { color: var(--texto-suave); padding: 2rem 0; text-align: center; }

    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.02rem; margin-bottom: 0.8rem; }
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.3rem 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .tarjeta { padding: 1.1rem 1.3rem; margin-bottom: 1rem; }
    .dato {
      font-size: 0.88rem;
      color: var(--texto-suave);
      margin-bottom: 0.3rem;
    }
    .dato strong { color: var(--texto); }

    .item {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--negro-borde);
    }
    .item-img { width: 64px; border-radius: 5px; flex-shrink: 0; }
    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .item-nombre { font-size: 0.92rem; font-weight: 600; color: var(--texto); }
    .item-info em {
      color: var(--texto-suave);
      font-style: normal;
      font-size: 0.78rem;
    }
    .precio { color: var(--dorado); font-weight: 600; white-space: nowrap; }

    .linea {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.92rem;
    }
    .linea.total {
      font-family: var(--fuente-titulos);
      margin-top: 0.6rem;
      padding-top: 0.6rem;
    }

    .despacho {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
    }
    .despacho select, .campo-guia, .despacho input[type="file"] {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.85rem;
      padding: 0.45rem 0.6rem;
      outline: none;
      box-sizing: border-box;
    }
    .campo-guia { width: 160px; }
    .despacho input[type="file"]::file-selector-button {
      background: transparent;
      border: 1px solid var(--dorado-oscuro);
      border-radius: 6px;
      color: var(--dorado);
      padding: 0.25rem 0.7rem;
      margin-right: 0.6rem;
      cursor: pointer;
      font-family: var(--fuente-cuerpo);
    }
    .btn-dorado:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-entregar { padding: 0.55rem 1.3rem; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.86rem;
      margin-bottom: 0.9rem;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.86rem;
      margin-bottom: 1rem;
    }
  `
})
export class AdminPedidoDetalle {

  private admin = inject(AdminService);
  private ruta = inject(ActivatedRoute);

  transportadoras = TRANSPORTADORAS;

  pedido = signal<Pedido | null>(null);
  cargando = signal(true);

  // Formulario de despacho
  transportadora = signal('');
  guia = signal('');
  archivoGuia = signal<File | null>(null);

  trabajando = signal(false);
  error = signal('');
  whatsappLink = signal('');

  constructor() {
    // El id del pedido viene en la URL (/manacore-panel/pedidos/7).
    // No hay endpoint de "un pedido" en el backend: se trae la lista
    // y se busca (los pedidos de la tienda caben de sobra en memoria)
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.admin.todosPedidos().subscribe({
      next: (lista) => {
        this.pedido.set(lista.find(p => p.id === id) ?? null);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  elegirArchivoGuia(evento: Event) {
    this.archivoGuia.set((evento.target as HTMLInputElement).files?.[0] ?? null);
  }

  despachar(pedido: Pedido) {
    this.error.set('');
    this.trabajando.set(true);
    this.admin.enviarPedido(pedido.orderNumber, this.guia().trim(),
        this.transportadora(), this.archivoGuia()).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.pedido.set(r.pedido);          // ya quedo SHIPPED
        this.whatsappLink.set(r.whatsappLink);
      },
      error: (e) => {
        this.trabajando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo despachar el pedido.');
      }
    });
  }

  entregar(pedido: Pedido) {
    this.error.set('');
    this.trabajando.set(true);
    this.admin.entregarPedido(pedido.orderNumber).subscribe({
      next: (actualizado) => {
        this.trabajando.set(false);
        this.pedido.set(actualizado);
      },
      error: (e) => {
        this.trabajando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo marcar como entregado.');
      }
    });
  }

  estado(pedido: Pedido) {
    return ESTADOS_PEDIDO[pedido.status] ?? { texto: pedido.status, color: '#888' };
  }

  urlGuia(pedido: Pedido): string {
    return `${API_URL}${pedido.guideFilePath}`;
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
