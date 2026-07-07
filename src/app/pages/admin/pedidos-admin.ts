// ============================================================
// PANEL ADMIN — PEDIDOS (la lista)
// Solo filas compactas: numero + persona + ciudad + estado.
// Clic en un pedido -> SU PROPIA PAGINA con todo el detalle y
// las acciones (despachar, WhatsApp, entregar). Asi la bandeja
// no se satura cuando haya muchos pedidos.
// Maximo 10 pedidos por tanda, con paginacion para las demas.
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../core/admin.service';
import { Pedido } from '../../core/pedido.service';

// Insignias de estado (mismas de "Mis pedidos" del cliente)
export const ESTADOS_PEDIDO: Record<string, { texto: string; color: string }> = {
  AWAITING_PAYMENT: { texto: 'Esperando pago', color: '#d4af37' },
  PAID:             { texto: 'Por despachar',  color: '#52c98a' },
  SHIPPED:          { texto: 'Enviado',        color: '#5aa9e8' },
  DELIVERED:        { texto: 'Entregado',      color: '#00733e' },
  CANCELLED:        { texto: 'Cancelado',      color: '#d3202a' }
};

const POR_PAGINA = 10;

@Component({
  selector: 'app-admin-pedidos',
  imports: [RouterLink, RouterLinkActive],
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
        <a routerLink="/manacore-panel/ofertas" routerLinkActive="activo">Ofertas</a>
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
        <!-- Filas compactas: clic -> pagina del pedido -->
        @for (pedido of visibles(); track pedido.id) {
          <a class="panel fila" [routerLink]="['/manacore-panel/pedidos', pedido.id]">
            <div class="resumen-izq">
              <span class="numero">{{ pedido.orderNumber }}</span>
              <span class="quien">
                {{ pedido.user?.name ?? 'Cliente' }} · {{ pedido.shippingCity }}
              </span>
            </div>
            <div class="resumen-der">
              <span class="insignia" [style.--color-estado]="estado(pedido).color">
                {{ estado(pedido).texto }}
              </span>
              <span class="ir">▸</span>
            </div>
          </a>
        }

        <!-- Paginacion: 10 pedidos por tanda -->
        @if (totalPaginas() > 1) {
          <div class="paginacion">
            <button class="btn-fantasma btn-mini" [disabled]="pagina() === 0"
                    (click)="pagina.set(pagina() - 1)">← Anterior</button>
            <span>Página {{ pagina() + 1 }} de {{ totalPaginas() }} · {{ pedidos().length }} pedidos</span>
            <button class="btn-fantasma btn-mini" [disabled]="pagina() >= totalPaginas() - 1"
                    (click)="pagina.set(pagina() + 1)">Siguiente →</button>
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

    .tabs-panel { display: flex; gap: 0.6rem; margin-bottom: 1.2rem; }
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

    /* Fila compacta clickeable */
    .fila {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.2rem;
      margin-bottom: 0.7rem;
      transition: border-color 0.15s, background 0.12s;
    }
    .fila:hover {
      border-color: var(--dorado);
      background: rgba(212, 175, 55, 0.05);
    }
    .resumen-izq {
      display: flex;
      align-items: baseline;
      gap: 0.9rem;
      overflow: hidden;
    }
    .numero {
      font-family: var(--fuente-titulos);
      font-weight: 700;
      color: var(--dorado);
      white-space: nowrap;
    }
    .quien {
      color: var(--texto-suave);
      font-size: 0.88rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .resumen-der {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-shrink: 0;
    }
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.25rem 0.9rem;
      font-size: 0.76rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .ir { color: var(--texto-suave); }

    .paginacion {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.2rem;
      margin-top: 1.2rem;
      color: var(--texto-suave);
      font-size: 0.85rem;
    }
    .btn-mini { padding: 0.35rem 0.9rem; font-size: 0.78rem; }
    .btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }
  `
})
export class AdminPedidos {

  private admin = inject(AdminService);

  vista = signal<'pendientes' | 'todos'>('pendientes');
  pedidos = signal<Pedido[]>([]);
  cargando = signal(true);

  // Paginacion en el navegador: la lista completa ya llego del
  // backend, aqui solo se muestra de a 10
  pagina = signal(0);
  totalPaginas = computed(() =>
    Math.ceil(this.pedidos().length / POR_PAGINA));
  visibles = computed(() =>
    this.pedidos().slice(this.pagina() * POR_PAGINA, (this.pagina() + 1) * POR_PAGINA));

  constructor() {
    this.cargar();
  }

  cambiarVista(v: 'pendientes' | 'todos') {
    this.vista.set(v);
    this.pagina.set(0);
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

  estado(pedido: Pedido) {
    return ESTADOS_PEDIDO[pedido.status] ?? { texto: pedido.status, color: '#888' };
  }
}
