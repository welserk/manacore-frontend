// ============================================================
// TILE DEL CATALOGO (una carta + acabado, idiomas colapsados)
// A diferencia de tile-carta (que muestra una variante exacta),
// este es el tile de navegacion del catalogo: al hacer clic lleva
// al detalle de la carta, donde se elige idioma y se ve el stock.
//
// La etiqueta de acabado (FOIL/ETCHED/SURGEFOIL) va AL LADO DEL
// NOMBRE, entre parentesis, para NO tapar el simbolo de mana de
// la imagen de la carta.
// ============================================================
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoTile } from '../core/modelos';

@Component({
  selector: 'app-tile-catalogo',
  imports: [RouterLink],
  template: `
    <a class="tile panel" [routerLink]="['/carta', tile().cardId]">
      <div class="tile-imagen-marco">
        @if (tile().imageUrl) {
          <img [src]="tile().imageUrl!" [alt]="tile().name" class="tile-imagen" loading="lazy">
        }
      </div>
      <div class="tile-info">
        <span class="tile-nombre">
          {{ tile().name }}
          @if (etiquetaAcabado()) {
            <span class="etiqueta-foil">({{ etiquetaAcabado() }})</span>
          }
        </span>
        <span class="tile-set">{{ tile().setName }} · #{{ tile().collectorNumber }}</span>
        <div class="tile-pie">
          <span class="tile-precio">{{ precioFormateado() }}</span>
          <span class="tile-stock">{{ tile().stockTotal }} disp.</span>
        </div>
      </div>
    </a>
  `,
  styles: `
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
      line-height: 1.25;
    }
    /* Etiqueta de acabado al lado del nombre, con acento tornasol foil */
    .etiqueta-foil {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      background: linear-gradient(100deg, #c96be0, #5aa9e8, #52c98a, #e8d152);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .tile-set {
      font-size: 0.72rem;
      color: var(--texto-suave);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tile-pie {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 0.35rem;
    }
    .tile-precio {
      font-weight: 700;
      color: var(--dorado);
      font-size: 0.95rem;
    }
    .tile-stock {
      font-size: 0.7rem;
      color: var(--texto-suave);
    }
  `
})
export class TileCatalogo {

  tile = input.required<CatalogoTile>();

  // Etiqueta a mostrar entre parentesis: el tipo de foil especial si existe,
  // o "foil"/"etched". Para "normal" no se muestra nada.
  etiquetaAcabado = computed(() => {
    const t = this.tile();
    if (t.specialFoilType) return t.specialFoilType;
    if (t.finish === 'normal') return '';
    return t.finish;
  });

  precioFormateado = computed(() =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(this.tile().precio)
  );
}
