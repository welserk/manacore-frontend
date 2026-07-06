// ============================================================
// PANEL ADMIN — INVENTARIO
// El corazon operativo de la tienda. Flujo del dueño cuando
// llega un lote de cartas:
//   1. Buscar la carta en el CENSO completo (95k, incluye
//      stock 0 y tokens — a diferencia del catalogo publico)
//   2. Abrir sus variantes (acabado + idioma)
//   3. Subirle stock a la variante exacta que llego
//   4. Si la variante no existe (ej: llego en español y solo
//      estaba la inglesa), crearla ahi mismo
// Solo entra el rol ADMIN (guardia en la ruta + backend).
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { Card, CardVariant, Pagina } from '../../core/modelos';

@Component({
  selector: 'app-admin-inventario',
  imports: [FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (la artifice: perfecta para el taller del admin) -->
    <section class="inventario fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Inventario</h1>
      <p class="explicacion">
        Busca cualquier carta del censo (incluye las que no tienen stock y los
        tokens), abre sus variantes y sube el stock de la que llegó.
      </p>

      <!-- ============ BUSCADOR ============ -->
      <form class="buscador panel" (ngSubmit)="buscar(0)">
        <input type="search" name="nombre" placeholder="Nombre de la carta… (ej: Blood Crypt)"
               [ngModel]="nombre()" (ngModelChange)="nombre.set($event)">
        <input type="text" name="set" class="campo-set" placeholder="Set (opcional, ej: rvr)"
               [ngModel]="set()" (ngModelChange)="set.set($event)">
        <button class="btn-dorado" [disabled]="cargando() || nombre().trim().length < 2">
          {{ cargando() ? 'Buscando…' : 'Buscar' }}
        </button>
      </form>

      @if (resultados(); as pagina) {
        <p class="conteo">{{ pagina.totalElements }} impresiones encontradas</p>

        <!-- ============ RESULTADOS ============ -->
        @for (carta of pagina.content; track carta.id) {
          <div class="carta panel">
            <div class="carta-fila" (click)="alternarVariantes(carta)">
              @if (carta.imageUrl) {
                <img [src]="carta.imageUrl" alt="" class="miniatura">
              }
              <div class="carta-info">
                <span class="carta-nombre">
                  {{ carta.name }}
                  @if (carta.token) { <span class="es-token">TOKEN</span> }
                </span>
                <span class="carta-set">{{ carta.mtgSet.name }} ({{ carta.mtgSet.code }}) · #{{ carta.collectorNumber }} · {{ carta.rarity }}</span>
                <span class="carta-precios">
                  @if (carta.priceCop != null)      { <em>Normal {{ formato(carta.priceCop) }}</em> }
                  @if (carta.priceCopFoil != null)  { <em>Foil {{ formato(carta.priceCopFoil) }}</em> }
                  @if (carta.priceCopEtched != null){ <em>Etched {{ formato(carta.priceCopEtched) }}</em> }
                </span>
              </div>
              <span class="expandir">{{ abierta() === carta.id ? '▲' : '▼ Variantes' }}</span>
            </div>

            <!-- ============ VARIANTES (expandible) ============ -->
            @if (abierta() === carta.id) {
              <div class="variantes">
                @if (cargandoVariantes()) {
                  <p class="cargando">Cargando variantes…</p>
                } @else {
                  @if (avisoStock()) { <p class="aviso">{{ avisoStock() }}</p> }
                  @if (errorStock()) { <p class="error">{{ errorStock() }}</p> }

                  <table>
                    <thead>
                      <tr><th>Acabado</th><th>Idioma</th><th>Precio</th><th>Stock</th><th></th></tr>
                    </thead>
                    <tbody>
                      @for (v of variantes(); track v.id) {
                        <tr>
                          <td>{{ v.finish }}@if (v.specialFoilType) { <em> ({{ v.specialFoilType }})</em> }</td>
                          <td>{{ v.language.toUpperCase() }}</td>
                          <td class="precio">{{ formato(precioVariante(carta, v)) }}</td>
                          <td>
                            <!-- El input edita una COPIA local; el stock real
                                 solo cambia al presionar Guardar -->
                            <input type="number" min="0" class="stock-input"
                                   [ngModel]="stockEditado()[v.id] ?? v.stock"
                                   (ngModelChange)="editarStock(v.id, $event)"
                                   [ngModelOptions]="{ standalone: true }">
                          </td>
                          <td>
                            <button class="btn-fantasma btn-mini"
                                    [disabled]="guardandoId() === v.id || (stockEditado()[v.id] ?? v.stock) === v.stock"
                                    (click)="guardarStock(v)">
                              {{ guardandoId() === v.id ? '…' : 'Guardar' }}
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>

                  <!-- Crear variante nueva (acabado/idioma que no existia) -->
                  <div class="nueva-variante">
                    <span class="nueva-titulo">＋ Variante nueva:</span>
                    <select [ngModel]="nvFinish()" (ngModelChange)="nvFinish.set($event)"
                            [ngModelOptions]="{ standalone: true }">
                      <option value="normal">normal</option>
                      <option value="foil">foil</option>
                      <option value="etched">etched</option>
                    </select>
                    <input type="text" class="campo-idioma" placeholder="idioma (es, en...)"
                           [ngModel]="nvIdioma()" (ngModelChange)="nvIdioma.set($event)"
                           [ngModelOptions]="{ standalone: true }">
                    <input type="number" min="0" class="stock-input" placeholder="stock"
                           [ngModel]="nvStock()" (ngModelChange)="nvStock.set($event)"
                           [ngModelOptions]="{ standalone: true }">
                    <button class="btn-fantasma btn-mini"
                            [disabled]="creandoVariante() || !nvIdioma().trim()"
                            (click)="crearVariante(carta)">
                      {{ creandoVariante() ? '…' : 'Crear' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ============ PAGINACION ============ -->
        @if (pagina.totalPages > 1) {
          <div class="paginacion">
            <button class="btn-fantasma btn-mini" [disabled]="pagina.number === 0"
                    (click)="buscar(pagina.number - 1)">← Anterior</button>
            <span>Página {{ pagina.number + 1 }} de {{ pagina.totalPages }}</span>
            <button class="btn-fantasma btn-mini" [disabled]="pagina.number >= pagina.totalPages - 1"
                    (click)="buscar(pagina.number + 1)">Siguiente →</button>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .inventario {
      max-width: 900px;
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
      margin-bottom: 1.2rem;
      max-width: 640px;
    }

    .buscador {
      display: flex;
      gap: 0.8rem;
      padding: 1rem 1.2rem;
      margin-bottom: 1.4rem;
    }
    .buscador input {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.95rem;
      padding: 0.6rem 0.9rem;
      outline: none;
    }
    .buscador input:focus { border-color: var(--dorado); }
    .campo-set { max-width: 180px; }
    .conteo { color: var(--texto-suave); font-size: 0.85rem; margin-bottom: 0.9rem; }

    .carta { margin-bottom: 0.9rem; overflow: hidden; }
    .carta-fila {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.8rem 1.1rem;
      cursor: pointer;
      transition: background 0.12s;
    }
    .carta-fila:hover { background: rgba(212, 175, 55, 0.05); }
    .miniatura { width: 46px; border-radius: 4px; flex-shrink: 0; }
    .carta-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .carta-nombre { font-weight: 600; color: var(--texto); }
    .es-token {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--dorado);
      border: 1px solid var(--dorado-oscuro);
      border-radius: 4px;
      padding: 0.05rem 0.4rem;
      margin-left: 0.4rem;
      vertical-align: middle;
    }
    .carta-set { color: var(--texto-suave); font-size: 0.78rem; }
    .carta-precios { display: flex; gap: 1rem; }
    .carta-precios em {
      color: var(--dorado);
      font-style: normal;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .expandir {
      color: var(--texto-suave);
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .variantes {
      border-top: 1px solid var(--negro-borde);
      padding: 1rem 1.2rem;
    }
    .cargando { color: var(--texto-suave); font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th {
      text-align: left;
      color: var(--texto-suave);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.3rem 0.6rem;
    }
    td { padding: 0.4rem 0.6rem; border-top: 1px solid var(--negro-borde); }
    td em { color: var(--texto-suave); font-style: normal; font-size: 0.75rem; }
    .precio { color: var(--dorado); font-weight: 600; }
    .stock-input {
      width: 76px;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      padding: 0.35rem 0.5rem;
      outline: none;
    }
    .stock-input:focus { border-color: var(--dorado); }
    .btn-mini { padding: 0.35rem 0.8rem; font-size: 0.78rem; }
    .btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }

    .nueva-variante {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin-top: 0.9rem;
      padding-top: 0.9rem;
      border-top: 1px dashed var(--negro-borde);
      flex-wrap: wrap;
    }
    .nueva-titulo { color: var(--texto-suave); font-size: 0.82rem; }
    .nueva-variante select, .campo-idioma {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      padding: 0.35rem 0.5rem;
      outline: none;
    }
    .campo-idioma { width: 130px; box-sizing: border-box; }

    .paginacion {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.2rem;
      margin-top: 1.4rem;
      color: var(--texto-suave);
      font-size: 0.85rem;
    }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.82rem;
      margin-bottom: 0.8rem;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.82rem;
      margin-bottom: 0.8rem;
    }
  `
})
export class AdminInventario {

  private admin = inject(AdminService);

  // Buscador
  nombre = signal('');
  set = signal('');
  cargando = signal(false);
  resultados = signal<Pagina<Card> | null>(null);

  // Variantes de la carta abierta
  abierta = signal<number | null>(null);
  variantes = signal<CardVariant[]>([]);
  cargandoVariantes = signal(false);

  // Edicion de stock: mapa variantId -> valor escrito (sin guardar aun)
  stockEditado = signal<Record<number, number>>({});
  guardandoId = signal<number | null>(null);
  avisoStock = signal('');
  errorStock = signal('');

  // Variante nueva
  nvFinish = signal('normal');
  nvIdioma = signal('');
  nvStock = signal(1);
  creandoVariante = signal(false);

  buscar(page: number) {
    if (this.nombre().trim().length < 2) return;
    this.cargando.set(true);
    this.abierta.set(null);
    this.admin.buscarCartas(this.nombre().trim(), this.set(), page).subscribe({
      next: (pagina) => { this.resultados.set(pagina); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  // Abre/cierra el panel de variantes de una carta
  alternarVariantes(carta: Card) {
    if (this.abierta() === carta.id) {
      this.abierta.set(null);
      return;
    }
    this.abierta.set(carta.id);
    this.avisoStock.set('');
    this.errorStock.set('');
    this.stockEditado.set({});
    this.cargarVariantes(carta.id);
  }

  private cargarVariantes(cardId: number) {
    this.cargandoVariantes.set(true);
    this.admin.getVariantes(cardId).subscribe({
      next: (lista) => { this.variantes.set(lista); this.cargandoVariantes.set(false); },
      error: () => this.cargandoVariantes.set(false)
    });
  }

  editarStock(variantId: number, valor: number) {
    this.stockEditado.update(m => ({ ...m, [variantId]: valor }));
  }

  guardarStock(v: CardVariant) {
    const nuevo = this.stockEditado()[v.id];
    if (nuevo == null || nuevo < 0) return;
    this.avisoStock.set('');
    this.errorStock.set('');
    this.guardandoId.set(v.id);
    this.admin.setStock(v.id, nuevo).subscribe({
      next: (actualizada) => {
        // Refresca la fila con la verdad del backend
        this.variantes.update(lista =>
          lista.map(x => x.id === actualizada.id ? actualizada : x));
        this.guardandoId.set(null);
        this.avisoStock.set(`Stock de ${v.finish} ${v.language.toUpperCase()} actualizado a ${nuevo} ✔`);
      },
      error: (e) => {
        this.guardandoId.set(null);
        this.errorStock.set(e.error?.error ?? 'No se pudo actualizar el stock.');
      }
    });
  }

  crearVariante(carta: Card) {
    this.avisoStock.set('');
    this.errorStock.set('');
    this.creandoVariante.set(true);
    this.admin.agregarVariante(carta.id, this.nvFinish(),
        this.nvIdioma().trim().toLowerCase(), this.nvStock() || 0).subscribe({
      next: () => {
        this.creandoVariante.set(false);
        this.nvIdioma.set('');
        this.nvStock.set(1);
        this.avisoStock.set('Variante creada ✔');
        this.cargarVariantes(carta.id);   // recarga la tabla con la nueva
      },
      error: (e) => {
        this.creandoVariante.set(false);
        this.errorStock.set(e.error?.error ?? 'No se pudo crear la variante.');
      }
    });
  }

  // Precio efectivo de una variante: el manual si esta fijado,
  // si no el del Card segun el acabado (la misma regla del backend)
  precioVariante(carta: Card, v: CardVariant): number {
    if (v.manualPriceCop != null) return v.manualPriceCop;
    switch (v.finish) {
      case 'foil':   return carta.priceCopFoil ?? 0;
      case 'etched': return carta.priceCopEtched ?? 0;
      default:       return carta.priceCop ?? 0;
    }
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
