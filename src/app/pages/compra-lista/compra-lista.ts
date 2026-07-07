// ============================================================
// COMPRA POR LISTA
// El cliente pega su lista de cartas (o carga un .txt) tomada de
// cualquier pagina (Moxfield, Archidekt, un mazo de torneo...) y
// al consultar ve TODO lo que la tienda tiene disponible de esa
// lista: cada impresion y acabado (normal/foil) con stock, como
// tiles del catalogo. Lo que no hay, se marca como no disponible.
//
// Formatos aceptados por linea:
//   "1 Lightning Bolt" · "1x Lightning Bolt" · "1xlightning bolt"
//   "Lightning Bolt" (sin numero = 1)
// Lineas vacias y comentarios que empiezan con // se ignoran.
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CatalogoService } from '../../core/catalogo.service';
import { CarritoService } from '../../core/carrito.service';
import { CardVariant, CatalogoTile, NOMBRES_IDIOMA } from '../../core/modelos';
import { TileCatalogo } from '../../components/tile-catalogo';

// Una linea pedida por el cliente y lo que la tienda tiene de ella
interface ResultadoLinea {
  nombre: string;        // lo que el cliente escribio
  cantidad: number;      // cuantas quiere
  tiles: CatalogoTile[]; // variantes disponibles (vacio = no hay)
}

@Component({
  selector: 'app-compra-lista',
  imports: [TileCatalogo],
  template: `
    <!-- Fondo: Teferi, Hero of Dominaria -->
    <section class="compra-lista fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/5/d/5d10b752-d9cb-419d-a5c4-d4ee1acb655e.jpg?1782710071')">
      <p class="miga">CATÁLOGO</p>
      <h1>Importar lista</h1>
      <p class="explicacion">
        Pega en el cuadro tu lista de cartas (o cárgala desde un archivo de
        texto) — sirve la de Moxfield, Archidekt o cualquier mazo de torneo.
        Escribe <strong>una carta por línea con la cantidad adelante</strong>,
        como en el ejemplo: <code>1 Island</code> o <code>2x Counterspell</code>.
        Al darle <strong>Consultar</strong>, abajo aparecerán todas las versiones
        disponibles de cada carta, listas para agregar al carrito.
      </p>

      <textarea
        [value]="texto()"
        (input)="texto.set($any($event.target).value)"
        rows="12"
        placeholder="1 Accumulate Wisdom&#10;1 Island&#10;1x Lightning Bolt&#10;2 Counterspell"></textarea>

      <div class="acciones-lista">
        <button class="btn-dorado" (click)="consultar()"
                [disabled]="buscando() || !texto().trim()">
          {{ buscando() ? 'Consultando…' : 'Consultar' }}
        </button>
        <!-- El input file real esta oculto; este boton lo dispara -->
        <button class="btn-fantasma" (click)="archivo.click()">⇪ Cargar archivo</button>
        <input #archivo type="file" accept=".txt,text/plain" hidden
               (change)="cargarArchivo($event)">
      </div>

      @if (resultados() !== null) {
        <div class="resumen-lista">
          <span class="disponible-si">✔ {{ lineasDisponibles() }} disponibles</span>
          @if (lineasSinStock() > 0) {
            <span class="disponible-no">✖ {{ lineasSinStock() }} sin disponibilidad</span>
          }
        </div>

        @for (linea of resultados(); track linea.nombre) {
          <div class="grupo">
            <h2>
              {{ linea.cantidad }}× {{ linea.nombre }}
              @if (linea.tiles.length === 0) {
                <span class="sin-stock">— sin disponibilidad por ahora</span>
              }
            </h2>
            @if (linea.tiles.length > 0) {
              <div class="grilla">
                @for (tile of linea.tiles; track tile.cardId + '-' + tile.finish) {
                  <div class="tile-wrap">
                    <app-tile-catalogo [tile]="tile" />
                    <!-- Agregar sin salir de la lista. Si hay un solo idioma
                         se agrega directo; si hay varios, se eligen aqui mismo -->
                    @if (pickerKey() === clave(tile)) {
                      <div class="idiomas">
                        @for (v of pickerVariantes(); track v.id) {
                          <button class="chip" (click)="agregarVariante(tile, v)">
                            {{ nombreIdioma(v.language) }}
                          </button>
                        }
                        <button class="chip cancelar" (click)="pickerKey.set(null)">✕</button>
                      </div>
                    } @else {
                      <button class="btn-agregar"
                              [disabled]="agregando() === clave(tile)"
                              (click)="agregar(tile)">
                        {{ agregando() === clave(tile) ? 'Agregando…' : '＋ Agregar al carrito' }}
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .compra-lista {
      max-width: 1100px;
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
      max-width: 700px;
    }
    code {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 5px;
      padding: 0.1rem 0.45rem;
      font-size: 0.8rem;
      color: var(--texto);
    }

    textarea {
      width: 100%;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 10px;
      color: var(--texto);
      font-family: monospace;
      font-size: 0.9rem;
      line-height: 1.6;
      padding: 1rem 1.2rem;
      outline: none;
      resize: vertical;
      transition: border-color 0.15s;
    }
    textarea:focus { border-color: var(--dorado); }

    .acciones-lista {
      display: flex;
      gap: 0.9rem;
      margin: 1.1rem 0 2rem;
    }
    .btn-dorado:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Contadores de disponibilidad */
    .resumen-lista {
      display: flex;
      gap: 1.4rem;
      padding: 0.8rem 0;
      border-top: 1px solid var(--negro-borde);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .disponible-si { color: #52c98a; }
    .disponible-no { color: #d3202a; }

    .grupo { margin-bottom: 2rem; }
    .grupo h2 {
      font-size: 1.05rem;
      margin-bottom: 0.9rem;
    }
    .sin-stock {
      color: var(--texto-suave);
      font-weight: 400;
      font-size: 0.85rem;
    }
    .grilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .tile-wrap { display: flex; flex-direction: column; gap: 0.5rem; }

    /* Boton de agregar debajo de cada carta */
    .btn-agregar {
      width: 100%;
      background: rgba(212, 175, 55, 0.1);
      border: 1px solid var(--dorado-oscuro);
      border-radius: 8px;
      color: var(--dorado);
      font-family: var(--fuente-titulos);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.5rem;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .btn-agregar:hover {
      background: rgba(212, 175, 55, 0.2);
      box-shadow: 0 0 12px rgba(212, 175, 55, 0.25);
    }
    .btn-agregar:disabled { opacity: 0.6; cursor: wait; }

    /* Chips de idioma cuando la carta tiene varios */
    .idiomas { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip {
      flex: 1;
      background: var(--negro);
      border: 1px solid var(--dorado-oscuro);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.78rem;
      padding: 0.45rem 0.5rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .chip:hover { background: rgba(212, 175, 55, 0.15); border-color: var(--dorado); }
    .chip.cancelar { flex: 0 0 auto; color: var(--texto-suave); }
  `
})
export class CompraLista {

  private catalogo = inject(CatalogoService);
  private carrito = inject(CarritoService);

  texto = signal('');
  buscando = signal(false);
  // null = aun no se ha consultado (no mostrar nada abajo)
  resultados = signal<ResultadoLinea[] | null>(null);

  // Estado del boton "Agregar" por tile (clave = cardId-finish):
  //   agregando  = tile cuyas variantes se estan consultando
  //   pickerKey  = tile que mostro los idiomas para elegir
  agregando = signal<string | null>(null);
  pickerKey = signal<string | null>(null);
  pickerVariantes = signal<CardVariant[]>([]);

  // Identificador de un tile (carta + acabado)
  clave(tile: CatalogoTile): string {
    return tile.cardId + '-' + tile.finish;
  }

  nombreIdioma(codigo: string): string {
    return NOMBRES_IDIOMA[codigo] ?? codigo.toUpperCase();
  }

  // Al pulsar "Agregar": el tile colapsa idiomas, asi que se consultan
  // las variantes reales de esa carta+acabado con stock. Una sola -> se
  // agrega directo; varias -> se muestran para que el cliente elija.
  agregar(tile: CatalogoTile) {
    this.agregando.set(this.clave(tile));
    this.pickerKey.set(null);
    this.catalogo.getVariantes(tile.cardId).subscribe({
      next: (variantes) => {
        this.agregando.set(null);
        const disponibles = variantes.filter(v => v.finish === tile.finish && v.stock > 0);
        if (disponibles.length === 0) return;      // no deberia pasar (el tile tiene stock)
        if (disponibles.length === 1) {
          this.agregarVariante(tile, disponibles[0]);
        } else {
          this.pickerVariantes.set(disponibles);
          this.pickerKey.set(this.clave(tile));
        }
      },
      error: () => this.agregando.set(null)
    });
  }

  // Mete la variante exacta al carrito (abre el panel solo, como confirmacion)
  agregarVariante(tile: CatalogoTile, v: CardVariant) {
    this.carrito.agregar({
      variantId: v.id,
      cardId: tile.cardId,
      nombre: tile.name,
      imageUrl: tile.imageUrl,
      setName: tile.setName,
      finish: v.finish,
      language: v.language,
      precio: tile.precio,
      stock: v.stock
    });
    this.pickerKey.set(null);
  }

  lineasDisponibles = computed(() =>
    (this.resultados() ?? []).filter(l => l.tiles.length > 0).length);
  lineasSinStock = computed(() =>
    (this.resultados() ?? []).filter(l => l.tiles.length === 0).length);

  // Lee el .txt elegido y pone su contenido en el area de texto
  cargarArchivo(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => this.texto.set(String(lector.result ?? ''));
    lector.readAsText(archivo);
  }

  consultar() {
    const lineas = this.parsearLista(this.texto());
    if (lineas.length === 0) {
      this.resultados.set([]);
      return;
    }
    this.buscando.set(true);
    // Una consulta al catalogo por cada carta pedida, TODAS en
    // paralelo; forkJoin espera a que terminen y entrega los
    // resultados en el mismo orden de la lista
    const consultas = lineas.map(l =>
      this.catalogo.buscarCatalogo({ nombre: l.nombre, size: 8 }));
    forkJoin(consultas).subscribe({
      next: (paginas) => {
        this.resultados.set(lineas.map((l, i) => ({
          nombre: l.nombre,
          cantidad: l.cantidad,
          tiles: paginas[i].content
        })));
        this.buscando.set(false);
      },
      error: () => {
        this.resultados.set([]);
        this.buscando.set(false);
      }
    });
  }

  // Convierte el texto pegado en pares {cantidad, nombre}.
  // Si la misma carta aparece dos veces, se suman las cantidades.
  private parsearLista(texto: string): { nombre: string; cantidad: number }[] {
    const mapa = new Map<string, { nombre: string; cantidad: number }>();
    for (const cruda of texto.split('\n')) {
      const linea = cruda.trim();
      if (!linea || linea.startsWith('//')) continue;   // vacias y comentarios
      // "2x Counterspell" -> cantidad 2, nombre "Counterspell"
      // "1xisland"        -> cantidad 1, nombre "island"
      // "Counterspell"    -> sin numero = cantidad 1
      const con = linea.match(/^(\d+)\s*x?\s*(.+)$/i);
      const cantidad = con ? parseInt(con[1], 10) : 1;
      const nombre = (con ? con[2] : linea).trim();
      if (!nombre) continue;
      const clave = nombre.toLowerCase();
      const existente = mapa.get(clave);
      if (existente) {
        existente.cantidad += cantidad;
      } else {
        mapa.set(clave, { nombre, cantidad });
      }
    }
    return [...mapa.values()];
  }
}
