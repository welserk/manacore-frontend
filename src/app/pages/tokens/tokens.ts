// ============================================================
// TOKENS — seccion separada del catalogo (Zombie, Tesoro, Clue...)
// Decision del dueño: SOLO se muestran tokens con stock, igual que
// el catalogo principal (el backend ya filtra por disponibilidad).
// Buscador con debounce como el del header. Cada token lleva a su
// detalle (/carta/:id) donde se elige variante y se agrega.
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Card } from '../../core/modelos';
import { API_URL } from '../../core/catalogo.service';

@Component({
  selector: 'app-tokens',
  imports: [RouterLink],
  template: `
    <!-- Fondo: Ugin, the Spirit Dragon -->
    <section class="tokens fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/c/9c017fa9-7021-417a-9c2e-3df409644fcf.jpg?1782707011')">
      <p class="miga">CATÁLOGO</p>
      <h1>Tokens</h1>
      <p class="explicacion">
        Zombies, Tesoros, Espíritus y todo lo que tus cartas ponen en la mesa.
        Aquí están los tokens disponibles en la tienda.
      </p>

      <input
        type="search"
        class="buscador"
        placeholder="Buscar token… (ej: zombie, treasure)"
        (input)="alEscribir($any($event.target).value)">

      @if (cargando()) {
        <p class="vacio">Cargando tokens…</p>
      } @else if (tokens().length === 0) {
        <p class="vacio">
          {{ buscando() ? 'Ningún token coincide con tu búsqueda.'
                        : 'No hay tokens disponibles por ahora — pronto llegarán.' }}
        </p>
      } @else {
        <p class="conteo">{{ tokens().length }} tokens disponibles</p>
        <div class="grilla">
          @for (token of tokens(); track token.id) {
            <a class="tile panel" [routerLink]="['/carta', token.id]">
              <div class="tile-imagen-marco">
                @if (token.imageUrl) {
                  <img [src]="token.imageUrl" [alt]="token.name" class="tile-imagen" loading="lazy">
                }
              </div>
              <div class="tile-info">
                <span class="tile-nombre">{{ token.name }}</span>
                <span class="tile-set">{{ token.mtgSet.name }} · #{{ token.collectorNumber }}</span>
              </div>
            </a>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .tokens {
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
      font-size: 0.92rem;
      line-height: 1.6;
      margin-bottom: 1.2rem;
      max-width: 640px;
    }
    .buscador {
      width: min(420px, 100%);
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 20px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.95rem;
      padding: 0.6rem 1.2rem;
      outline: none;
      margin-bottom: 1.6rem;
      transition: border-color 0.15s;
    }
    .buscador:focus { border-color: var(--dorado); }
    .vacio { color: var(--texto-suave); padding: 2rem 0; }
    .conteo { color: var(--texto-suave); font-size: 0.85rem; margin-bottom: 1rem; }

    .grilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    .tile {
      display: block;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.12s, box-shadow 0.2s;
    }
    .tile:hover {
      border-color: var(--dorado);
      transform: translateY(-3px);
      box-shadow: 0 6px 22px rgba(212, 175, 55, 0.16);
    }
    .tile-imagen-marco {
      aspect-ratio: 63 / 88;
      background: #1a1a20;
    }
    .tile-imagen {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .tile-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.6rem 0.7rem 0.7rem;
    }
    .tile-nombre {
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--texto);
    }
    .tile-set {
      font-size: 0.72rem;
      color: var(--texto-suave);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `
})
export class Tokens {

  private http = inject(HttpClient);

  tokens = signal<Card[]>([]);
  cargando = signal(true);
  buscando = signal(false);   // true = hay texto de busqueda activo
  private timerBusqueda?: ReturnType<typeof setTimeout>;

  constructor() {
    this.cargarTodos();
  }

  private cargarTodos() {
    this.http.get<Card[]>(`${API_URL}/api/cards/tokens`).subscribe({
      next: (lista) => { this.tokens.set(lista); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  // Mismo debounce del buscador del header: espera 250ms sin teclear
  alEscribir(texto: string) {
    clearTimeout(this.timerBusqueda);
    const t = texto.trim();
    this.timerBusqueda = setTimeout(() => {
      if (t.length < 2) {
        this.buscando.set(false);
        this.cargarTodos();
        return;
      }
      this.buscando.set(true);
      this.http.get<Card[]>(`${API_URL}/api/cards/tokens/buscar`, { params: { nombre: t } })
        .subscribe(lista => this.tokens.set(lista));
    }, 250);
  }
}
