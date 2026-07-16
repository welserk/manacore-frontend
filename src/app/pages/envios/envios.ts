// ============================================================
// PANEL DE ENVIOS (rol SHIPPER)
// La UNICA pagina del empleado de envios: los pedidos pagados
// que hay que empacar y despachar. Clic en un pedido lo abre
// con las cartas CON IMAGEN (para encontrarlas facil al
// empacar), la direccion y el formulario de despacho:
// transportadora + numero de guia + foto/PDF de la guia.
// Al despachar: el backend envia el correo al cliente y
// devuelve el link de WhatsApp con el mensaje ya escrito.
//
// El ADMIN tambien puede entrar (misma vista que su empleado);
// el despacho "completo" del admin vive en el panel, esta
// pagina es deliberadamente simple: una sola tarea.
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnvioService } from '../../core/envios.service';
import { Pedido } from '../../core/pedido.service';

// Las unicas transportadoras que el backend acepta
const TRANSPORTADORAS = ['Envia', 'Servientrega', 'Interrapidisimo'];

@Component({
  selector: 'app-envios',
  imports: [FormsModule],
  template: `
    <!-- Fondo: Smuggler's Copter (el helicoptero de reparto) -->
    <section class="envios fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/2/6/2680ed41-da35-475a-9d80-ae2f4686feed.jpg?1783923937')">
      <p class="miga">MANACORE · ENVÍOS</p>
      <h1>Pedidos por despachar</h1>
      <p class="explicacion">
        Estos pedidos ya están <strong>pagados</strong> y esperan envío. Abre uno,
        empaca las cartas de la lista, genera la guía con la transportadora y
        regístrala aquí. El cliente recibe el aviso por correo automáticamente.
      </p>

      @if (cargando()) {
        <p class="vacio">Cargando pedidos…</p>
      } @else if (pedidos().length === 0) {
        <div class="panel tarjeta vacio-panel">
          <p class="vacio">🎉 No hay pedidos pendientes de envío.</p>
          <button class="btn-fantasma btn-mini" (click)="cargar()">⟳ Revisar de nuevo</button>
        </div>
      } @else {
        <p class="conteo">{{ pedidos().length }} pedido(s) esperando despacho</p>

        @for (p of pedidos(); track p.id) {
          <div class="pedido panel">
            <!-- Fila compacta: clic abre/cierra el detalle -->
            <div class="pedido-fila" (click)="alternar(p)">
              <div class="pedido-info">
                <span class="pedido-numero">{{ p.orderNumber }}</span>
                <span class="pedido-cliente">
                  @if (p.user) { {{ p.user.name }} · }
                  {{ p.shippingCity }}
                </span>
              </div>
              <span class="pedido-total">{{ formato(p.totalCop) }}</span>
              <span class="expandir">{{ abierto() === p.id ? '▲' : '▼' }}</span>
            </div>

            @if (abierto() === p.id) {
              <div class="detalle">
                <!-- A donde va el paquete -->
                <p class="dato">📍 <strong>{{ p.shippingAddress }}</strong> — {{ p.shippingCity }}</p>
                @if (p.user) {
                  <p class="dato">👤 {{ p.user.name }}
                    @if (p.user.phone) { · 📱 {{ p.user.phone }} }
                  </p>
                }
                @if (p.notes) { <p class="dato">📝 {{ p.notes }}</p> }

                <!-- Las cartas a empacar, con imagen -->
                <div class="items">
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
                    </div>
                  }
                </div>

                @if (error()) { <p class="error">{{ error() }}</p> }

                <!-- Formulario de despacho -->
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
          </div>
        }
      }

      <!-- Despachado: WhatsApp listo para avisar al cliente -->
      @if (whatsappLink()) {
        <div class="panel tarjeta">
          <p class="aviso">Pedido despachado ✔ — el correo al cliente ya salió.</p>
          <a [href]="whatsappLink()" target="_blank" class="btn-dorado">
            📱 Avisar por WhatsApp
          </a>
        </div>
      }
    </section>
  `,
  styles: `
    .envios {
      max-width: 720px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .miga {
      color: var(--dorado);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.25em;
    }
    h1 { font-size: 1.7rem; margin: 0.2rem 0 0.8rem; }
    .explicacion {
      color: var(--texto-suave);
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 1.4rem;
      max-width: 620px;
    }
    .conteo { color: var(--texto-suave); font-size: 0.85rem; margin-bottom: 0.9rem; }
    .vacio { color: var(--texto-suave); text-align: center; padding: 1rem 0; }
    .vacio-panel { text-align: center; padding: 1.4rem; }
    .btn-mini { padding: 0.35rem 0.9rem; font-size: 0.8rem; }

    .pedido { margin-bottom: 0.8rem; overflow: hidden; }
    .pedido-fila {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.2rem;
      cursor: pointer;
      transition: background 0.12s;
    }
    .pedido-fila:hover { background: rgba(212, 175, 55, 0.05); }
    .pedido-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .pedido-numero { font-weight: 700; color: var(--texto); }
    .pedido-cliente { color: var(--texto-suave); font-size: 0.8rem; }
    .pedido-total { color: var(--dorado); font-weight: 600; white-space: nowrap; }
    .expandir { color: var(--texto-suave); font-size: 0.8rem; }

    .detalle {
      border-top: 1px solid var(--negro-borde);
      padding: 1rem 1.2rem;
    }
    .dato {
      font-size: 0.88rem;
      color: var(--texto-suave);
      margin-bottom: 0.3rem;
    }
    .dato strong { color: var(--texto); }

    .items { margin: 0.7rem 0 1rem; }
    .item {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--negro-borde);
    }
    .item-img { width: 58px; border-radius: 5px; flex-shrink: 0; }
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

    .tarjeta { padding: 1.1rem 1.3rem; margin-top: 1rem; }
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
      margin-bottom: 0.9rem;
    }
  `
})
export class Envios {

  private envios = inject(EnvioService);

  transportadoras = TRANSPORTADORAS;

  pedidos = signal<Pedido[]>([]);
  cargando = signal(true);
  abierto = signal<number | null>(null);   // id del pedido expandido

  // Formulario de despacho (del pedido abierto)
  transportadora = signal('');
  guia = signal('');
  archivoGuia = signal<File | null>(null);

  trabajando = signal(false);
  error = signal('');
  whatsappLink = signal('');

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.envios.pedidosPorEnviar().subscribe({
      next: (lista) => { this.pedidos.set(lista); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  // Abre/cierra un pedido; al cambiar de pedido se limpia el formulario
  alternar(p: Pedido) {
    if (this.abierto() === p.id) {
      this.abierto.set(null);
      return;
    }
    this.abierto.set(p.id);
    this.transportadora.set('');
    this.guia.set('');
    this.archivoGuia.set(null);
    this.error.set('');
  }

  elegirArchivoGuia(evento: Event) {
    this.archivoGuia.set((evento.target as HTMLInputElement).files?.[0] ?? null);
  }

  despachar(p: Pedido) {
    this.error.set('');
    this.trabajando.set(true);
    this.envios.enviarPedido(p.orderNumber, this.guia().trim(),
        this.transportadora(), this.archivoGuia()).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.whatsappLink.set(r.whatsappLink);
        this.abierto.set(null);
        // El pedido ya quedo SHIPPED: sale de la bandeja de pendientes
        this.pedidos.update(lista => lista.filter(x => x.id !== p.id));
      },
      error: (e) => {
        this.trabajando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo despachar el pedido.');
      }
    });
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
