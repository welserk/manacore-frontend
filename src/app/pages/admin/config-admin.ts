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
import { FormsModule } from '@angular/forms';
import { AdminService, BusquedaTop } from '../../core/admin.service';
import { StoreConfig } from '../../core/modelos';
import { PanelNav } from './panel-nav';

@Component({
  selector: 'app-admin-config',
  imports: [PanelNav, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="config-admin fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Configuración</h1>

      <app-panel-nav />

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

        <!-- ============ ACTUALIZAR CATALOGO ============ -->
        <div class="panel tarjeta">
          <h2>Catálogo</h2>
          <p class="pista">Cuando sale una expansión nueva, actualiza el catálogo
            desde Scryfall: descarga los sets y cartas nuevos y los agrega (tu
            stock actual no se toca). Tarda varios minutos y corre en segundo
            plano; ve al Inventario para subirles stock cuando lleguen.</p>
          @if (avisoCatalogo()) { <p class="aviso">{{ avisoCatalogo() }}</p> }
          @if (errorCatalogo()) { <p class="error">{{ errorCatalogo() }}</p> }
          <button class="btn-dorado" [disabled]="actualizando()" (click)="actualizarCatalogo()">
            {{ actualizando() ? 'Actualización iniciada…' : '⟳ Actualizar catálogo desde Scryfall' }}
          </button>
        </div>

        <!-- ============ BUSQUEDAS FRECUENTES ============ -->
        <div class="panel tarjeta">
          <h2>Tendencias de búsqueda</h2>
          <div class="dos-columnas">
            <div>
              <h3>Lo más buscado</h3>
              @if (busquedasTop().length === 0) {
                <p class="vacio-mini">Aún no hay búsquedas registradas.</p>
              } @else {
                @for (b of busquedasTop(); track b.termino) {
                  <div class="linea-busqueda">
                    <span>{{ b.termino }}</span>
                    <span class="veces">{{ b.veces }}×</span>
                  </div>
                }
              }
            </div>
            <div>
              <h3>Buscado y sin stock 💡</h3>
              <p class="pista pista-mini">Lo que la gente pide y no tienes — oportunidades.</p>
              @if (busquedasSinResultado().length === 0) {
                <p class="vacio-mini">Nada por ahora.</p>
              } @else {
                @for (b of busquedasSinResultado(); track b.termino) {
                  <div class="linea-busqueda">
                    <span>{{ b.termino }}</span>
                    <span class="veces alerta">{{ b.veces }}×</span>
                  </div>
                }
              }
            </div>
          </div>
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

    /* Tendencias de busqueda */
    h3 { font-size: 0.85rem; color: var(--texto-suave); text-transform: uppercase;
         letter-spacing: 0.06em; margin-bottom: 0.6rem; }
    .dos-columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
    .pista-mini { font-size: 0.76rem; margin-bottom: 0.6rem; }
    .linea-busqueda {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.35rem 0;
      border-top: 1px solid var(--negro-borde);
      font-size: 0.86rem;
      color: var(--texto);
    }
    .veces { color: var(--dorado); font-weight: 600; white-space: nowrap; }
    .veces.alerta { color: var(--alerta); }
    @media (max-width: 620px) { .dos-columnas { grid-template-columns: 1fr; } }

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
  busquedasTop = signal<BusquedaTop[]>([]);
  busquedasSinResultado = signal<BusquedaTop[]>([]);

  guardando = signal(false);
  guardandoTrm = signal(false);
  recalculando = signal(false);
  actualizando = signal(false);
  avisoConfig = signal('');
  errorConfig = signal('');
  avisoTrm = signal('');
  errorTrm = signal('');
  avisoCatalogo = signal('');
  errorCatalogo = signal('');

  constructor() {
    this.admin.getConfig().subscribe(c => this.form.set(c));
    this.admin.getBusquedasTop().subscribe(b => this.busquedasTop.set(b));
    this.admin.getBusquedasSinResultado().subscribe(b => this.busquedasSinResultado.set(b));
  }

  // Dispara la actualizacion del catalogo (corre @Async en el backend)
  actualizarCatalogo() {
    if (!confirm('¿Actualizar el catálogo desde Scryfall? Descarga los datos '
        + 'nuevos y puede tardar varios minutos. Tu stock no se toca.')) {
      return;
    }
    this.avisoCatalogo.set('');
    this.errorCatalogo.set('');
    this.actualizando.set(true);
    this.admin.actualizarCatalogo().subscribe({
      next: (r) => {
        this.avisoCatalogo.set((r.mensaje ?? 'Actualización iniciada')
          + '. Corre en segundo plano; revisa el Inventario en unos minutos.');
        // El boton queda deshabilitado un rato para no dispararlo dos veces
        setTimeout(() => this.actualizando.set(false), 8000);
      },
      error: (e) => {
        this.actualizando.set(false);
        this.errorCatalogo.set(e.error?.error ?? 'No se pudo iniciar la actualización.');
      }
    });
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
