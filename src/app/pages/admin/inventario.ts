// ============================================================
// PANEL ADMIN — INVENTARIO
// El corazon operativo de la tienda. Flujo del dueño cuando
// llega un lote de cartas:
//   1. Buscar la carta en el CENSO completo (95k, incluye
//      stock 0 y tokens — a diferencia del catalogo publico)
//   2. Abrir sus variantes (acabado + idioma)
//   3. Subirle stock a la variante exacta que llego
//
// Las combinaciones BASE (Normal y Foil, en Ingles y Español)
// aparecen SIEMPRE en la tabla aunque no existan en la base de
// datos todavia: se muestran con stock 0 y, al guardar un stock,
// la variante se crea sola. Otros idiomas o acabados (etched) se
// agregan con el selector de "Variante nueva".
// Solo entra el rol ADMIN (guardia en la ruta + backend).
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, TipoBusqueda } from '../../core/admin.service';
import { Card, CardVariant, MtgSet, NOMBRES_IDIOMA, Pagina } from '../../core/modelos';

// Una fila de la tabla de variantes. Puede ser:
//  - real:    existe en la base de datos (variante con ID)
//  - virtual: combinacion base que aun no existe (variante = null);
//             se crea automaticamente al guardarle un stock
interface FilaVariante {
  variante: CardVariant | null;
  finish: string;
  language: string;
}

@Component({
  selector: 'app-admin-inventario',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (la artifice: perfecta para el taller del admin) -->
    <section class="inventario fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Inventario</h1>

      <!-- Navegacion del panel -->
      <nav class="tabs-panel">
        <a routerLink="/manacore-panel" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Inventario</a>
        <a routerLink="/manacore-panel/pedidos" routerLinkActive="activo">Pedidos</a>
        <a routerLink="/manacore-panel/ofertas" routerLinkActive="activo">Ofertas</a>
      </nav>

      <p class="explicacion">
        Busca en el censo completo, abre las variantes y sube el stock de lo
        que llegó. Cada sección va por aparte: cartas, tierras básicas y tokens.
      </p>

      <!-- Secciones del censo: cartas / tierras basicas / tokens -->
      <div class="tipos">
        <button [class.activo]="tipo() === 'cartas'" (click)="cambiarTipo('cartas')">🃏 Cartas</button>
        <button [class.activo]="tipo() === 'basicas'" (click)="cambiarTipo('basicas')">⛰ Tierras básicas</button>
        <button [class.activo]="tipo() === 'tokens'" (click)="cambiarTipo('tokens')">🪙 Tokens</button>
      </div>

      <!-- ============ BUSCADOR ============ -->
      <form class="buscador panel" (ngSubmit)="buscar(0)">
        <input type="search" name="nombre" [placeholder]="placeholderNombre()"
               [ngModel]="nombre()" (ngModelChange)="alEscribirNombre($event)">
        <!-- El desplegable se ADAPTA: solo lista los sets donde existe
             lo que escribiste (con todos los sets si el campo esta vacio) -->
        <select name="set" class="campo-set"
                [ngModel]="set()" (ngModelChange)="set.set($event)">
          <option value="">Todos los sets ({{ setsDisponibles().length }})</option>
          @for (s of setsDisponibles(); track s.code) {
            <option [value]="s.code">{{ s.name }} ({{ s.code }})</option>
          }
        </select>
        <button class="btn-dorado" [disabled]="cargando() || !puedeBuscar()">
          {{ cargando() ? 'Buscando…' : 'Buscar' }}
        </button>
      </form>
      @if (tipo() === 'basicas') {
        <p class="pista-numero">💡 Puedes buscar por número de coleccionista:
          <code>Island 234</code> o <code>Mountain #311</code>.</p>
      }

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
                      @for (fila of filas(); track clave(fila)) {
                        <tr>
                          <td>
                            {{ capitalizar(fila.finish) }}
                            @if (fila.variante?.specialFoilType) {
                              <em> ({{ fila.variante!.specialFoilType }})</em>
                            }
                          </td>
                          <td>{{ nombreIdioma(fila.language) }}</td>
                          <td class="precio">{{ formato(precioFila(carta, fila)) }}</td>
                          <td>
                            <!-- Stepper − / +: mas comodo que las flechitas del
                                 navegador. El input edita una COPIA local; el
                                 stock real solo cambia al presionar Guardar -->
                            <div class="stepper">
                              <button type="button" class="paso"
                                      (click)="ajustarFila(fila, -1)">−</button>
                              <input type="number" min="0" class="stock-input"
                                     [ngModel]="stockDeFila(fila)"
                                     (ngModelChange)="editarFila(fila, $event)"
                                     [ngModelOptions]="{ standalone: true }">
                              <button type="button" class="paso"
                                      (click)="ajustarFila(fila, 1)">＋</button>
                            </div>
                          </td>
                          <td class="acciones-fila">
                            <button class="btn-fantasma btn-mini"
                                    [disabled]="!puedeGuardar(fila) || guardandoClave() === clave(fila)"
                                    (click)="guardarFila(carta, fila)">
                              {{ guardandoClave() === clave(fila) ? '…' : 'Guardar' }}
                            </button>
                            <!-- Solo las variantes REALES se pueden eliminar
                                 (las base sin crear no existen todavia) -->
                            @if (fila.variante) {
                              <button class="btn-eliminar" title="Eliminar esta variante"
                                      [disabled]="guardandoClave() === clave(fila)"
                                      (click)="eliminarFila(fila)">🗑</button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <p class="nota-base">Normal y Foil en Inglés y Español están siempre
                    listas: escribe el stock, dale Guardar y la variante se crea sola.</p>

                  <!-- Otros acabados o idiomas (etched, japones, frances...) -->
                  <div class="nueva-variante">
                    <span class="nueva-titulo">＋ Variante nueva:</span>
                    <select [ngModel]="nvFinish()" (ngModelChange)="nvFinish.set($event)"
                            [ngModelOptions]="{ standalone: true }">
                      <option value="normal">Normal</option>
                      <option value="foil">Foil</option>
                      <option value="etched">Etched</option>
                    </select>
                    <select [ngModel]="nvIdioma()" (ngModelChange)="nvIdioma.set($event)"
                            [ngModelOptions]="{ standalone: true }">
                      <option value="" disabled>Idioma…</option>
                      @for (codigo of codigosIdioma; track codigo) {
                        <option [value]="codigo">{{ nombreIdioma(codigo) }}</option>
                      }
                    </select>
                    <div class="stepper">
                      <button type="button" class="paso" (click)="ajustarNvStock(-1)">−</button>
                      <input type="number" min="0" class="stock-input" placeholder="stock"
                             [ngModel]="nvStock()" (ngModelChange)="nvStock.set($event)"
                             [ngModelOptions]="{ standalone: true }">
                      <button type="button" class="paso" (click)="ajustarNvStock(1)">＋</button>
                    </div>
                    <button class="btn-fantasma btn-mini"
                            [disabled]="creandoVariante() || !nvIdioma()"
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

    .explicacion {
      color: var(--texto-suave);
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 1.2rem;
      max-width: 640px;
    }

    /* Pestañas de seccion (cartas / basicas / tokens) */
    .tipos { display: flex; gap: 0.6rem; margin-bottom: 1rem; }
    .tipos button {
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
    .tipos button.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    .buscador {
      display: flex;
      gap: 0.8rem;
      padding: 1rem 1.2rem;
      margin-bottom: 0.6rem;
    }
    .buscador input, .buscador select {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.92rem;
      padding: 0.6rem 0.9rem;
      outline: none;
    }
    .buscador input:focus, .buscador select:focus { border-color: var(--dorado); }
    .campo-set { max-width: 280px; }
    .pista-numero {
      color: var(--texto-suave);
      font-size: 0.8rem;
      margin-bottom: 0.8rem;
    }
    .pista-numero code {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 5px;
      padding: 0.05rem 0.4rem;
      font-size: 0.75rem;
    }
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
    /* Stepper − [cantidad] + */
    .stepper {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .paso {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--negro);
      border: 1px solid var(--dorado-oscuro);
      border-radius: 6px;
      color: var(--dorado);
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .paso:hover {
      background: rgba(212, 175, 55, 0.12);
      border-color: var(--dorado);
    }
    .stock-input {
      width: 56px;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      text-align: center;
      padding: 0.35rem 0.4rem;
      outline: none;
      /* Sin las flechitas nativas del navegador: el stepper las reemplaza */
      appearance: textfield;
      -moz-appearance: textfield;
    }
    .stock-input::-webkit-outer-spin-button,
    .stock-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .stock-input:focus { border-color: var(--dorado); }
    .btn-mini { padding: 0.35rem 0.8rem; font-size: 0.78rem; }
    .btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }
    .acciones-fila { white-space: nowrap; }
    .btn-eliminar {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0.25rem 0.45rem;
      margin-left: 0.4rem;
      opacity: 0.6;
      transition: opacity 0.15s, border-color 0.15s;
    }
    .btn-eliminar:hover { opacity: 1; border-color: #d3202a; }
    .btn-eliminar:disabled { opacity: 0.25; cursor: not-allowed; }
    .nota-base {
      color: var(--texto-suave);
      font-size: 0.76rem;
      margin-top: 0.6rem;
      opacity: 0.85;
    }

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
    .nueva-variante select {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      padding: 0.35rem 0.5rem;
      outline: none;
    }

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

  // Las combinaciones que SIEMPRE se ofrecen aunque no existan aun
  // (decision del dueño: Normal y Foil, en Ingles y Español)
  private static readonly BASE: [string, string][] = [
    ['normal', 'en'], ['normal', 'es'], ['foil', 'en'], ['foil', 'es']
  ];

  // Codigos de idioma para el selector de variante nueva
  codigosIdioma = Object.keys(NOMBRES_IDIOMA);

  // Buscador
  tipo = signal<TipoBusqueda>('cartas');   // la seccion activa
  nombre = signal('');
  set = signal('');
  setsDisponibles = signal<MtgSet[]>([]);
  cargando = signal(false);
  resultados = signal<Pagina<Card> | null>(null);
  // Debounce del desplegable de sets: se refresca cuando dejas de escribir
  private timerSets?: ReturnType<typeof setTimeout>;

  // Variantes de la carta abierta
  abierta = signal<number | null>(null);
  variantes = signal<CardVariant[]>([]);
  cargandoVariantes = signal(false);

  // Filas de la tabla: variantes reales + combinaciones base faltantes
  filas = computed<FilaVariante[]>(() => {
    const reales = this.variantes();
    const lista: FilaVariante[] = reales.map(v =>
      ({ variante: v, finish: v.finish, language: v.language }));
    for (const [finish, language] of AdminInventario.BASE) {
      const existe = reales.some(v => v.finish === finish && v.language === language);
      if (!existe) lista.push({ variante: null, finish, language });
    }
    // Orden estable: acabado (normal, foil, etched) y luego idioma
    const orden: Record<string, number> = { normal: 0, foil: 1, etched: 2 };
    return lista.sort((a, b) =>
      (orden[a.finish] ?? 9) - (orden[b.finish] ?? 9)
      || a.language.localeCompare(b.language));
  });

  // Ediciones de stock sin guardar: clave de fila -> valor escrito
  stockEditado = signal<Record<string, number>>({});
  guardandoClave = signal<string | null>(null);
  avisoStock = signal('');
  errorStock = signal('');

  // Variante nueva (otros acabados/idiomas)
  nvFinish = signal('normal');
  nvIdioma = signal('');
  nvStock = signal(1);
  creandoVariante = signal(false);

  constructor() {
    // Al abrir el panel: el desplegable arranca con todos los sets
    this.cargarSets();
  }

  // Cambiar de seccion limpia los resultados y recarga el desplegable
  cambiarTipo(t: TipoBusqueda) {
    this.tipo.set(t);
    this.resultados.set(null);
    this.abierta.set(null);
    this.set.set('');
    this.cargarSets();
  }

  // Cada letra reinicia el temporizador; al dejar de escribir 400ms,
  // el desplegable de sets se adapta a lo escrito
  alEscribirNombre(texto: string) {
    this.nombre.set(texto);
    clearTimeout(this.timerSets);
    this.timerSets = setTimeout(() => this.cargarSets(), 400);
  }

  private cargarSets() {
    const { nombre } = this.terminoYNumero();
    this.admin.setsDeBusqueda(nombre, this.tipo()).subscribe({
      next: (sets) => {
        this.setsDisponibles.set(sets);
        // Si el set elegido ya no aplica a la busqueda nueva, se suelta
        if (this.set() && !sets.some(s => s.code === this.set())) {
          this.set.set('');
        }
      },
      error: () => this.setsDisponibles.set([])
    });
  }

  // Separa "Island 234" o "Mountain #311" en nombre + numero de
  // coleccionista. Solo en la seccion de basicas: alli tiene sentido
  // (en cartas normales hay nombres CON numeros, seria peligroso)
  private terminoYNumero(): { nombre: string; numero: string } {
    const texto = this.nombre().trim();
    if (this.tipo() === 'basicas') {
      const con = texto.match(/^(.*?)[\s#]+(\d+[a-z]?)$/i);
      if (con) return { nombre: con[1].trim(), numero: con[2] };
    }
    return { nombre: texto, numero: '' };
  }

  // Se puede buscar con nombre (2+ letras), o solo por set, o por numero
  // (asi en basicas/tokens puedes explorar una expansion entera)
  puedeBuscar(): boolean {
    const { nombre, numero } = this.terminoYNumero();
    return nombre.length >= 2 || !!numero || !!this.set().trim();
  }

  placeholderNombre(): string {
    switch (this.tipo()) {
      case 'basicas': return 'Ej: Island 234, Mountain #311, o solo Island…';
      case 'tokens':  return 'Nombre del token… (ej: Treasure, Zombie)';
      default:        return 'Nombre de la carta… (ej: Blood Crypt)';
    }
  }

  buscar(page: number) {
    if (!this.puedeBuscar()) return;
    const { nombre, numero } = this.terminoYNumero();
    this.cargando.set(true);
    this.abierta.set(null);
    this.admin.buscarCartas(nombre, this.set(), numero, this.tipo(), page).subscribe({
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

  // Identificador unico de una fila (real: su id; virtual: acabado+idioma)
  clave(fila: FilaVariante): string {
    return fila.variante ? `v${fila.variante.id}` : `${fila.finish}|${fila.language}`;
  }

  // Lo que muestra el input: lo editado, o el stock real, o 0 si es base
  stockDeFila(fila: FilaVariante): number {
    return this.stockEditado()[this.clave(fila)] ?? fila.variante?.stock ?? 0;
  }

  editarFila(fila: FilaVariante, valor: number) {
    this.stockEditado.update(m => ({ ...m, [this.clave(fila)]: valor }));
  }

  // Botones − / + del stepper: suman o restan 1 sin bajar de 0
  ajustarFila(fila: FilaVariante, delta: number) {
    const actual = Number(this.stockDeFila(fila)) || 0;
    this.editarFila(fila, Math.max(0, actual + delta));
  }

  ajustarNvStock(delta: number) {
    this.nvStock.set(Math.max(0, (Number(this.nvStock()) || 0) + delta));
  }

  // Guardar se habilita solo si hay un cambio valido que aplicar
  puedeGuardar(fila: FilaVariante): boolean {
    const valor = this.stockEditado()[this.clave(fila)];
    if (valor == null || valor < 0) return false;
    return fila.variante ? valor !== fila.variante.stock : true;
  }

  // Guarda una fila: si la variante existe cambia su stock; si es una
  // combinacion base sin crear, LA CREA con ese stock (todo en un boton)
  guardarFila(carta: Card, fila: FilaVariante) {
    const stock = this.stockEditado()[this.clave(fila)];
    if (stock == null || stock < 0) return;
    this.avisoStock.set('');
    this.errorStock.set('');
    this.guardandoClave.set(this.clave(fila));
    const etiqueta = `${this.capitalizar(fila.finish)} ${this.nombreIdioma(fila.language)}`;

    if (fila.variante) {
      this.admin.setStock(fila.variante.id, stock).subscribe({
        next: (actualizada) => {
          this.variantes.update(lista =>
            lista.map(x => x.id === actualizada.id ? actualizada : x));
          this.guardandoClave.set(null);
          this.avisoStock.set(`Stock de ${etiqueta} actualizado a ${stock} ✔`);
        },
        error: (e) => {
          this.guardandoClave.set(null);
          this.errorStock.set(e.error?.error ?? 'No se pudo actualizar el stock.');
        }
      });
    } else {
      this.admin.agregarVariante(carta.id, fila.finish, fila.language, stock).subscribe({
        next: () => {
          this.guardandoClave.set(null);
          this.avisoStock.set(`Variante ${etiqueta} creada con stock ${stock} ✔`);
          this.cargarVariantes(carta.id);
        },
        error: (e) => {
          this.guardandoClave.set(null);
          this.errorStock.set(e.error?.error ?? 'No se pudo crear la variante.');
        }
      });
    }
  }

  // Elimina una variante agregada por error (pide confirmacion).
  // El backend rechaza el borrado si tiene ventas historicas.
  eliminarFila(fila: FilaVariante) {
    if (!fila.variante) return;
    const etiqueta = `${this.capitalizar(fila.finish)} ${this.nombreIdioma(fila.language)}`;
    if (!confirm(`¿Eliminar la variante ${etiqueta}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.avisoStock.set('');
    this.errorStock.set('');
    this.guardandoClave.set(this.clave(fila));
    const cardId = this.abierta()!;
    this.admin.eliminarVariante(fila.variante.id).subscribe({
      next: () => {
        this.guardandoClave.set(null);
        this.avisoStock.set(`Variante ${etiqueta} eliminada ✔`);
        this.cargarVariantes(cardId);
      },
      error: (e) => {
        this.guardandoClave.set(null);
        this.errorStock.set(e.error?.error ?? 'No se pudo eliminar la variante.');
      }
    });
  }

  crearVariante(carta: Card) {
    this.avisoStock.set('');
    this.errorStock.set('');
    this.creandoVariante.set(true);
    this.admin.agregarVariante(carta.id, this.nvFinish(),
        this.nvIdioma(), this.nvStock() || 0).subscribe({
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

  // Precio efectivo de una fila: el manual de la variante si esta
  // fijado, si no el del Card segun el acabado (la regla del backend)
  precioFila(carta: Card, fila: FilaVariante): number {
    if (fila.variante?.manualPriceCop != null) return fila.variante.manualPriceCop;
    switch (fila.finish) {
      case 'foil':   return carta.priceCopFoil ?? 0;
      case 'etched': return carta.priceCopEtched ?? 0;
      default:       return carta.priceCop ?? 0;
    }
  }

  // "foil" -> "Foil" (peticion del dueño: acabados con mayuscula inicial)
  capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  nombreIdioma(codigo: string): string {
    return NOMBRES_IDIOMA[codigo] ?? codigo.toUpperCase();
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
