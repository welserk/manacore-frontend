// ============================================================
// PANEL ADMIN — PEDIDOS
// La bandeja de despacho de la tienda. Dos vistas:
//   - POR DESPACHAR: pedidos PAGADOS esperando envio (el trabajo
//     del dia). Cada uno tiene el formulario de despacho:
//     transportadora + numero de guia + foto/PDF de la guia.
//     Al despachar, el backend envia el CORREO al cliente y
//     devuelve un link de WhatsApp con el mensaje ya escrito.
//   - TODOS: el historial completo de pedidos de la tienda.
// Los pedidos ENVIADOS se pueden marcar como ENTREGADOS.
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { Pedido } from '../../core/pedido.service';
import { API_URL } from '../../core/catalogo.service';

// Insignias de estado (mismas de "Mis pedidos" del cliente)
const ESTADOS: Record<string, { texto: string; color: string }> = {
  AWAITING_PAYMENT: { texto: 'Esperando pago', color: '#d4af37' },
  PAID:             { texto: 'Pagado — por despachar', color: '#52c98a' },
  SHIPPED:          { texto: 'Enviado',        color: '#5aa9e8' },
  DELIVERED:        { texto: 'Entregado',      color: '#00733e' },
  CANCELLED:        { texto: 'Cancelado',      color: '#d3202a' }
};

// Las unicas transportadoras que el backend acepta
const TRANSPORTADORAS = ['Envia', 'Servientrega', 'Interrapidisimo'];

@Component({
  selector: 'app-admin-pedidos',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="pedidos-admin fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Pedidos</h1>

      <!-- Navegacion del panel -->
      <nav class="tabs-panel">
        <a routerLink="/manacore-panel" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Inventario</a>
        <a routerLink="/manacore-panel/pedidos" routerLinkActive="activo">Pedidos</a>
      </nav>

      <!-- Vista: por despachar / todos -->
      <div class="vistas">
        <button [class.activo]="vista() === 'pendientes'" (click)="cambiarVista('pendientes')">
          📦 Por despachar
        </button>
        <button [class.activo]="vista() === 'todos'" (click)="cambiarVista('todos')">
          Todos los pedidos
        </button>
      </div>

      @if (cargando()) {
        <p class="vacio">Cargando pedidos…</p>
      } @else if (pedidos().length === 0) {
        <p class="vacio">
          {{ vista() === 'pendientes'
              ? '🎉 Nada por despachar: estás al día.'
              : 'Todavía no hay pedidos en la tienda.' }}
        </p>
      } @else {
        @for (pedido of pedidos(); track pedido.id) {
          <div class="panel pedido">

            <!-- Encabezado: numero + fecha + estado -->
            <div class="cabecera">
              <div>
                <span class="numero">{{ pedido.orderNumber }}</span>
                <span class="fecha">{{ fecha(pedido.createdAt) }}</span>
              </div>
              <span class="insignia" [style.--color-estado]="estado(pedido).color">
                {{ estado(pedido).texto }}
              </span>
            </div>

            <!-- El cliente y a donde va -->
            @if (pedido.user) {
              <p class="cliente">
                👤 <strong>{{ pedido.user.name }}</strong>
                · {{ pedido.user.email }}
                @if (pedido.user.phone) { · 📱 {{ pedido.user.phone }} }
              </p>
            }
            <p class="direccion">📍 {{ pedido.shippingAddress }} — {{ pedido.shippingCity }}</p>
            @if (pedido.notes) { <p class="notas">📝 {{ pedido.notes }}</p> }

            <!-- Las cartas -->
            @for (item of pedido.items; track item.id) {
              <div class="linea">
                <span>{{ item.quantity }}× {{ item.variant.card.name }}
                  <em>({{ item.variant.finish }} · {{ item.variant.language.toUpperCase() }})</em>
                </span>
                <span class="precio">{{ formato(item.subtotal) }}</span>
              </div>
            }
            <div class="linea total">
              <span>Total (envío {{ pedido.shippingCost > 0 ? formato(pedido.shippingCost) : 'gratis' }})</span>
              <span class="precio">{{ formato(pedido.totalCop) }}</span>
            </div>

            <!-- Rastreo si ya fue despachado -->
            @if (pedido.trackingNumber) {
              <p class="rastreo">🚚 {{ pedido.shippingCarrier }} — guía {{ pedido.trackingNumber }}
                @if (pedido.guideFilePath) {
                  · <a [href]="urlGuia(pedido)" target="_blank">Ver guía</a>
                }
              </p>
            }

            @if (errorAccion() && accionEn() === pedido.orderNumber) {
              <p class="error">{{ errorAccion() }}</p>
            }

            <!-- ============ DESPACHAR (solo pedidos PAGADOS) ============ -->
            @if (pedido.status === 'PAID') {
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
                <button class="btn-dorado btn-despachar"
                        [disabled]="accionEn() === pedido.orderNumber || !transportadora() || !guia().trim()"
                        (click)="despachar(pedido)">
                  {{ accionEn() === pedido.orderNumber ? 'Despachando…' : '🚚 Despachar' }}
                </button>
              </div>
            }

            <!-- WhatsApp listo tras despachar -->
            @if (whatsappDe() === pedido.orderNumber && whatsappLink()) {
              <div class="post-despacho">
                <p class="aviso">Despachado ✔ — el correo al cliente ya salió.</p>
                <a [href]="whatsappLink()" target="_blank" class="btn-dorado btn-whatsapp">
                  📱 Avisar por WhatsApp
                </a>
              </div>
            }

            <!-- ============ ENTREGAR (solo pedidos ENVIADOS) ============ -->
            @if (pedido.status === 'SHIPPED') {
              <button class="btn-fantasma btn-entregar"
                      [disabled]="accionEn() === pedido.orderNumber"
                      (click)="entregar(pedido)">
                {{ accionEn() === pedido.orderNumber ? '…' : '✔ Marcar como entregado' }}
              </button>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .pedidos-admin {
      max-width: 780px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .miga {
      color: var(--dorado);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.25em;
    }
    h1 { font-size: 1.7rem; margin: 0.2rem 0 1rem; }

    .tabs-panel {
      display: flex;
      gap: 0.6rem;
      margin-bottom: 1.2rem;
    }
    .tabs-panel a {
      padding: 0.45rem 1.2rem;
      border: 1px solid var(--negro-borde);
      border-radius: 20px;
      color: var(--texto-suave);
      font-size: 0.88rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .tabs-panel a.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    .vistas { display: flex; gap: 0.6rem; margin-bottom: 1.4rem; }
    .vistas button {
      padding: 0.5rem 1.1rem;
      background: transparent;
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto-suave);
      font-family: var(--fuente-cuerpo);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .vistas button.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    .vacio { color: var(--texto-suave); padding: 2rem 0; text-align: center; }

    .pedido { padding: 1.2rem 1.4rem; margin-bottom: 1.1rem; }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.7rem;
    }
    .numero {
      font-family: var(--fuente-titulos);
      font-weight: 700;
      color: var(--dorado);
      margin-right: 0.8rem;
    }
    .fecha { color: var(--texto-suave); font-size: 0.82rem; }
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.25rem 0.9rem;
      font-size: 0.76rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .cliente, .direccion, .notas {
      font-size: 0.86rem;
      color: var(--texto-suave);
      margin-bottom: 0.3rem;
    }
    .cliente strong { color: var(--texto); }

    .linea {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.3rem 0;
      font-size: 0.88rem;
    }
    .linea em { color: var(--texto-suave); font-style: normal; font-size: 0.76rem; }
    .precio { color: var(--dorado); font-weight: 600; white-space: nowrap; }
    .linea.total {
      font-family: var(--fuente-titulos);
      border-top: 1px solid var(--negro-borde);
      margin-top: 0.4rem;
      padding-top: 0.6rem;
    }

    .rastreo { font-size: 0.85rem; color: var(--texto-suave); margin-top: 0.5rem; }

    /* Formulario de despacho */
    .despacho {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
      margin-top: 0.9rem;
      padding-top: 0.9rem;
      border-top: 1px dashed var(--negro-borde);
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
    .btn-despachar { padding: 0.5rem 1.2rem; font-size: 0.85rem; }
    .btn-despachar:disabled { opacity: 0.5; cursor: not-allowed; }

    .post-despacho { margin-top: 0.9rem; }
    .btn-whatsapp { padding: 0.5rem 1.2rem; font-size: 0.85rem; }
    .btn-entregar { margin-top: 0.9rem; padding: 0.5rem 1.2rem; font-size: 0.85rem; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.84rem;
      margin-bottom: 0.7rem;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.84rem;
      margin-top: 0.7rem;
    }
  `
})
export class AdminPedidos {

  private admin = inject(AdminService);

  transportadoras = TRANSPORTADORAS;

  vista = signal<'pendientes' | 'todos'>('pendientes');
  pedidos = signal<Pedido[]>([]);
  cargando = signal(true);

  // Formulario de despacho (uno a la vez: el del pedido que se este llenando)
  transportadora = signal('');
  guia = signal('');
  archivoGuia = signal<File | null>(null);

  // Que pedido tiene una accion en curso + resultado del despacho
  accionEn = signal('');
  errorAccion = signal('');
  whatsappDe = signal('');       // orderNumber recien despachado
  whatsappLink = signal('');

  constructor() {
    this.cargar();
  }

  cambiarVista(v: 'pendientes' | 'todos') {
    this.vista.set(v);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    const consulta = this.vista() === 'pendientes'
      ? this.admin.pedidosPendientes()
      : this.admin.todosPedidos();
    consulta.subscribe({
      next: (lista) => {
        // Mas recientes primero
        this.pedidos.set([...lista].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  elegirArchivoGuia(evento: Event) {
    this.archivoGuia.set((evento.target as HTMLInputElement).files?.[0] ?? null);
  }

  // Despacha: guia + transportadora (+archivo). El backend valida la
  // transportadora, envia el correo al cliente y devuelve el link de
  // WhatsApp con el mensaje pre-escrito.
  despachar(pedido: Pedido) {
    this.errorAccion.set('');
    this.accionEn.set(pedido.orderNumber);
    this.admin.enviarPedido(pedido.orderNumber, this.guia().trim(),
        this.transportadora(), this.archivoGuia()).subscribe({
      next: (r) => {
        this.accionEn.set('');
        this.whatsappDe.set(pedido.orderNumber);
        this.whatsappLink.set(r.whatsappLink);
        // Refresca el pedido en la lista (ya quedo SHIPPED)
        this.pedidos.update(lista =>
          lista.map(p => p.id === r.pedido.id ? r.pedido : p));
        // Limpia el formulario para el siguiente despacho
        this.transportadora.set('');
        this.guia.set('');
        this.archivoGuia.set(null);
      },
      error: (e) => {
        this.accionEn.set('');
        this.errorAccion.set(e.error?.error ?? 'No se pudo despachar el pedido.');
      }
    });
  }

  entregar(pedido: Pedido) {
    this.errorAccion.set('');
    this.accionEn.set(pedido.orderNumber);
    this.admin.entregarPedido(pedido.orderNumber).subscribe({
      next: (actualizado) => {
        this.accionEn.set('');
        this.pedidos.update(lista =>
          lista.map(p => p.id === actualizado.id ? actualizado : p));
      },
      error: (e) => {
        this.accionEn.set('');
        this.errorAccion.set(e.error?.error ?? 'No se pudo marcar como entregado.');
      }
    });
  }

  estado(pedido: Pedido) {
    return ESTADOS[pedido.status] ?? { texto: pedido.status, color: '#888' };
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
