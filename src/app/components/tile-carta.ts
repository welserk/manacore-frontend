// ============================================================
// TILE DE CARTA (una variante vendible)
// Usado en "Lo último": muestra una variante recien agregada.
// La etiqueta de acabado (FOIL/ETCHED) y el idioma van AL LADO
// DEL NOMBRE, entre parentesis, para no tapar el simbolo de mana
// de la imagen. Al hacer clic lleva al detalle de la carta.
// ============================================================
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardVariant } from '../core/modelos';

@Component({
  selector: 'app-tile-carta',
  imports: [RouterLink],
  template: `
    <a class="tile panel" [routerLink]="['/carta', variante().card.id]">
      <div class="tile-imagen-marco">
        @if (variante().card.imageUrl) {
          <img [src]="variante().card.imageUrl!" [alt]="variante().card.name"
               class="tile-imagen" loading="lazy">
        }
      </div>
      <div class="tile-info">
        <span class="tile-nombre">
          {{ variante().card.name }}
          @if (etiquetaAcabado()) {
            <span class="etiqueta-foil">({{ etiquetaAcabado() }})</span>
          }
          @if (variante().language !== 'en') {
            <span class="etiqueta-idioma">({{ variante().language.toUpperCase() }})</span>
          }
        </span>
        <span class="tile-set">{{ variante().card.mtgSet.name }} · #{{ variante().card.collectorNumber }}</span>
        <div class="tile-pie">
          <span class="tile-precio">{{ precioFormateado() }}</span>
          <span class="tile-stock">{{ variante().stock }} disp.</span>
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
    /* Etiqueta de acabado con acento tornasol foil */
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
    .etiqueta-idioma {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--dorado);
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
export class TileCarta {

  variante = input.required<CardVariant>();

  precio = computed(() => {
    const v = this.variante();
    if (v.manualPriceCop != null) return v.manualPriceCop;
    const c = v.card;
    switch (v.finish) {
      case 'foil': return c.priceCopFoil ?? 0;
      case 'etched': return c.priceCopEtched ?? 0;
      default: return c.priceCop ?? 0;
    }
  });

  precioFormateado = computed(() =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(this.precio())
  );

  etiquetaAcabado = computed(() => {
    const v = this.variante();
    if (v.specialFoilType) return v.specialFoilType;
    if (v.finish === 'normal') return '';
    return v.finish;
  });
}
