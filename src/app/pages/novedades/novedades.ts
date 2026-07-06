// ============================================================
// PAGINA "LO ULTIMO"
// La version completa de la seccion del inicio: las ultimas
// cartas subidas a la tienda (hasta 30), mas recientes primero.
// ============================================================
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../core/catalogo.service';
import { TileCarta } from '../../components/tile-carta';

@Component({
  selector: 'app-novedades',
  imports: [TileCarta],
  template: `
    <!-- Fondo: Gideon of the Trials -->
    <section class="novedades-pagina fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/5/959ce13f-519f-4472-bbd1-f26a972723d7.jpg?1782711207')">
      <h1>Lo último en la tienda</h1>
      <p class="descripcion">
        Las cartas más recientes agregadas al inventario. ¡Lo que ves aquí acaba de llegar!
      </p>
      <hr class="separador-dorado">

      @if (novedades().length === 0) {
        <p class="vacio">Aún no hay cartas recién agregadas. ¡Vuelve pronto!</p>
      } @else {
        <div class="grilla">
          @for (v of novedades(); track v.id) {
            <app-tile-carta [variante]="v" />
          }
        </div>
      }
    </section>
  `,
  styles: `
    .novedades-pagina {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2.5rem 2rem 1rem;
    }
    h1 {
      text-align: center;
      font-size: 1.7rem;
    }
    .descripcion {
      text-align: center;
      color: var(--texto-suave);
      margin-top: 0.4rem;
    }
    .vacio {
      text-align: center;
      color: var(--texto-suave);
      padding: 2rem 0;
    }
    .grilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.1rem;
    }
  `
})
export class Novedades {
  private catalogo = inject(CatalogoService);

  // Hasta 30 novedades, de la mas reciente a la mas vieja
  novedades = toSignal(this.catalogo.getNovedades(30), { initialValue: [] });
}
