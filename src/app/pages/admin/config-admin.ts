// ============================================================
// PANEL ADMIN — CONFIGURACION
// Los ajustes de la tienda que viven en store_config:
//   - TRM: la tasa dolar->peso de la tienda (real + ajuste manual).
//     Cambiarla recalcula TODOS los precios no manuales.
//   - Envío: costo nacional y ciudad con envío gratis.
//   - Pisos de precio: los minimos para cartas baratas (y el precio
//     de los tokens: normal = piso bajo, foil = piso medio).
//   - Datos de la tienda: nombre, email, teléfono.
//   - Mantenimiento: apaga la tienda de cara al público con un aviso.
//   - Stock bajo: variantes con 1-3 unidades, para reponer.
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { CardVariant, StoreConfig } from '../../core/modelos';

@Component({
  selector: 'app-admin-config',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="config-admin fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Configuración</h1>

      <!-- Navegacion del panel -->
      <nav class="tabs-panel">
        <a routerLink="/manacore-panel" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Inventario</a>
        <a routerLink="/manacore-panel/pedidos" routerLinkActive="activo">Pedidos</a>
        <a routerLink="/manacore-panel/ofertas" routerLinkActive="activo">Ofertas</a>
        <a routerLink="/manacore-panel/configuracion" routerLinkActive="activo">Configuración</a>
      </nav>

      @if (!form()) {
        <p class="vacio">Cargando configuración…</p>
      } @else if (form(); as c) {

        <!-- ============ TRM Y PRECIOS ============ -->
        <div class="panel tarjeta">
          <h2>TRM y precios</h2>
          <p class="pista">La TRM ManaCore = TRM real + ajuste. Con ella se calculan
            los precios de las cartas en pesos. Cambiarla <strong>recalcula todo el
            catálogo</strong> (menos las cartas con precio manual).</p>

          @if (avisoTrm()) { <p class="aviso">{{ avisoTrm() }}</p> }
          @if (errorTrm()) { <p class="error">{{ errorTrm() }}</p> }

          <div class="fila-doble">
            <label>TRM real (COP por USD)
              <input type="number" step="0.01"
                     [ngModel]="c.trmReal" (ngModelChange)="editar('trmReal', +$event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
            <label>Ajuste manual (+COP)
              <input type="number" step="0.01"
                     [ngModel]="c.trmAdjustment" (ngModelChange)="editar('trmAdjustment', +$event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
          </div>
          <p class="trm-efectiva">TRM ManaCore actual:
            <strong>{{ c.trmManacore != null ? formato(c.trmManacore) : '—' }}</strong>
            @if (c.trmLastUpdated) { <span class="pista"> · actualizada {{ fecha(c.trmLastUpdated) }}</span> }
          </p>

          <div class="botones">
            <button class="btn-dorado" [disabled]="guardandoTrm()" (click)="guardarTrm()">
              {{ guardandoTrm() ? 'Recalculando…' : 'Guardar TRM y recalcular precios' }}
            </button>
            <button class="btn-fantasma" [disabled]="recalculando()" (click)="recalcular()">
              {{ recalculando() ? 'Recalculando…' : 'Solo recalcular precios' }}
            </button>
          </div>
        </div>

        <!-- ============ ENVIO Y PISOS ============ -->
        <div class="panel tarjeta">
          <h2>Envío y pisos de precio</h2>

          @if (avisoConfig()) { <p class="aviso">{{ avisoConfig() }}</p> }
          @if (errorConfig()) { <p class="error">{{ errorConfig() }}</p> }

          <div class="fila-doble">
            <label>Envío nacional (COP)
              <input type="number" step="0.01"
                     [ngModel]="c.shippingNationalPrice" (ngModelChange)="editar('shippingNationalPrice', +$event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
            <label>Ciudad con envío gratis
              <input type="text"
                     [ngModel]="c.localCity" (ngModelChange)="editar('localCity', $event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
          </div>
          <div class="fila-doble">
            <label>Piso bajo (cartas ≤ $0.50 USD y tokens normales)
              <input type="number" step="0.01"
                     [ngModel]="c.priceFloorLow" (ngModelChange)="editar('priceFloorLow', +$event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
            <label>Piso medio ($0.51–$1 USD y tokens foil)
              <input type="number" step="0.01"
                     [ngModel]="c.priceFloorMid" (ngModelChange)="editar('priceFloorMid', +$event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
          </div>
          <p class="pista">💡 Los pisos también fijan el precio de los tokens
            (normal = piso bajo, foil = piso medio). Si los cambias, dale a
            "Solo recalcular precios" arriba para aplicarlos.</p>
        </div>

        <!-- ============ DATOS DE LA TIENDA ============ -->
        <div class="panel tarjeta">
          <h2>Datos de la tienda</h2>
          <label>Nombre de la tienda
            <input type="text"
                   [ngModel]="c.storeName" (ngModelChange)="editar('storeName', $event)"
                   [ngModelOptions]="{ standalone: true }">
          </label>
          <div class="fila-doble">
            <label>Email de contacto
              <input type="email"
                     [ngModel]="c.storeEmail" (ngModelChange)="editar('storeEmail', $event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
            <label>Teléfono / WhatsApp
              <input type="tel"
                     [ngModel]="c.storePhone" (ngModelChange)="editar('storePhone', $event)"
                     [ngModelOptions]="{ standalone: true }">
            </label>
          </div>
        </div>

        <!-- ============ MANTENIMIENTO ============ -->
        <div class="panel tarjeta">
          <h2>Modo mantenimiento</h2>
          <p class="pista">Con esto activado, el catálogo público queda cerrado y
            los clientes ven el mensaje que escribas.</p>
          <label class="check">
            <input type="checkbox"
                   [ngModel]="c.maintenanceMode" (ngModelChange)="editar('maintenanceMode', $event)"
                   [ngModelOptions]="{ standalone: true }">
            <span>Tienda en mantenimiento</span>
          </label>
          <label>Mensaje para los clientes
            <input type="text" placeholder="Volvemos pronto, estamos actualizando el inventario…"
                   [ngModel]="c.maintenanceMessage" (ngModelChange)="editar('maintenanceMessage', $event)"
                   [ngModelOptions]="{ standalone: true }">
          </label>
        </div>

        <button class="btn-dorado guardar-todo" [disabled]="guardando()" (click)="guardar()">
          {{ guardando() ? 'Guardando…' : 'Guardar configuración' }}
        </button>

        <!-- ============ STOCK BAJO ============ -->
        <div class="panel tarjeta stock-bajo">
          <h2>Stock bajo ({{ stockBajo().length }})</h2>
          <p class="pista">Variantes con 1 a 3 unidades — conviene reponer.</p>
          @if (stockBajo().length === 0) {
            <p class="vacio-mini">Nada con stock bajo por ahora 👍</p>
          } @else {
            @for (v of stockBajo(); track v.id) {
              <a class="linea-stock" [routerLink]="['/manacore-panel']"
                 [queryParams]="{}">
                <span>{{ v.card.name }}
                  <em>({{ v.finish }} · {{ v.language.toUpperCase() }} · {{ v.card.mtgSet.code }})</em>
                </span>
                <span class="unidades">{{ v.stock }} en stock</span>
              </a>
            }
          }
        </div>
      }
    </section>
  `,
  styles: `
    .config-admin {
      max-width: 760px;
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

    .tabs-panel { display: flex; gap: 0.6rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
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

    .vacio { color: var(--texto-suave); padding: 2rem 0; text-align: center; }
    .vacio-mini { color: var(--texto-suave); font-size: 0.85rem; }

    .tarjeta { padding: 1.2rem 1.4rem; margin-bottom: 1rem; }
    h2 { font-size: 1.05rem; margin-bottom: 0.7rem; }
    .pista { font-size: 0.82rem; color: var(--texto-suave); line-height: 1.5; margin-bottom: 0.9rem; }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.84rem;
      color: var(--texto-suave);
      margin-bottom: 0.9rem;
    }
    input[type="text"], input[type="email"], input[type="tel"], input[type="number"] {
      width: 100%;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.95rem;
      padding: 0.55rem 0.8rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: var(--dorado); }
    .fila-doble {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
    }
    .fila-doble label { min-width: 0; }

    .check {
      flex-direction: row;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.9rem;
      color: var(--texto);
    }
    .check input { accent-color: var(--dorado); width: 18px; height: 18px; }

    .trm-efectiva { font-size: 0.92rem; margin: 0.3rem 0 1rem; color: var(--texto-suave); }
    .trm-efectiva strong { color: var(--dorado); font-size: 1.05rem; }

    .botones { display: flex; gap: 0.8rem; flex-wrap: wrap; }
    .botones button:disabled { opacity: 0.5; cursor: not-allowed; }
    .guardar-todo { margin-bottom: 1.5rem; }
    .guardar-todo:disabled { opacity: 0.5; cursor: not-allowed; }

    .stock-bajo .linea-stock {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.45rem 0;
      border-top: 1px solid var(--negro-borde);
      font-size: 0.88rem;
      color: var(--texto);
    }
    .stock-bajo .linea-stock:hover { color: var(--dorado); }
    .linea-stock em { color: var(--texto-suave); font-style: normal; font-size: 0.76rem; }
    .unidades { color: var(--alerta); font-weight: 600; white-space: nowrap; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.84rem;
      margin-bottom: 0.8rem;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.84rem;
      margin-bottom: 0.8rem;
    }
  `
})
export class AdminConfig {

  private admin = inject(AdminService);

  // La config completa como copia editable (se manda entera al guardar)
  form = signal<StoreConfig | null>(null);
  stockBajo = signal<CardVariant[]>([]);

  guardando = signal(false);
  guardandoTrm = signal(false);
  recalculando = signal(false);
  avisoConfig = signal('');
  errorConfig = signal('');
  avisoTrm = signal('');
  errorTrm = signal('');

  constructor() {
    this.admin.getConfig().subscribe(c => this.form.set(c));
    this.admin.getStockBajo().subscribe(v => this.stockBajo.set(v));
  }

  // Edita un campo de la copia local (no toca el backend hasta Guardar)
  editar<K extends keyof StoreConfig>(campo: K, valor: StoreConfig[K]) {
    this.form.update(f => f ? { ...f, [campo]: valor } : f);
  }

  // Guarda todo menos la TRM (esa tiene su propio boton porque recalcula)
  guardar() {
    const c = this.form();
    if (!c) return;
    this.avisoConfig.set('');
    this.errorConfig.set('');
    this.guardando.set(true);
    this.admin.guardarConfig(c).subscribe({
      next: (actualizada) => {
        this.form.set(actualizada);
        this.guardando.set(false);
        this.avisoConfig.set('Configuración guardada ✔');
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorConfig.set(e.error?.error ?? 'No se pudo guardar la configuración.');
      }
    });
  }

  // Cambia la TRM y recalcula el catalogo completo
  guardarTrm() {
    const c = this.form();
    if (!c) return;
    this.avisoTrm.set('');
    this.errorTrm.set('');
    this.guardandoTrm.set(true);
    this.admin.setTrm(c.trmReal, c.trmAdjustment).subscribe({
      next: (r) => {
        this.guardandoTrm.set(false);
        this.avisoTrm.set(r.mensaje ?? 'TRM actualizada y precios recalculados ✔');
        // Refresca la TRM efectiva calculada por el backend
        this.admin.getConfig().subscribe(cfg => this.form.set(cfg));
      },
      error: (e) => {
        this.guardandoTrm.set(false);
        this.errorTrm.set(e.error?.error ?? 'No se pudo actualizar la TRM.');
      }
    });
  }

  recalcular() {
    this.avisoTrm.set('');
    this.errorTrm.set('');
    this.recalculando.set(true);
    this.admin.recalcularPrecios().subscribe({
      next: (r) => {
        this.recalculando.set(false);
        this.avisoTrm.set(r.mensaje ?? 'Precios recalculados ✔');
      },
      error: (e) => {
        this.recalculando.set(false);
        this.errorTrm.set(e.error?.error ?? 'No se pudieron recalcular los precios.');
      }
    });
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }
}
