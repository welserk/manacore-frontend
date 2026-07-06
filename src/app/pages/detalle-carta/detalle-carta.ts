// ============================================================
// DETALLE DE CARTA
// Al hacer clic en un tile del catalogo se llega aqui.
// Muestra la imagen grande y la DISPONIBILIDAD por acabado e
// idioma: aqui es donde el cliente ve que hay Sol Ring en
// ingles y en espanol, con su stock y precio de cada uno.
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CatalogoService } from '../../core/catalogo.service';
import { CarritoService } from '../../core/carrito.service';
import { Card, CardVariant } from '../../core/modelos';

// Una fila de disponibilidad: acabado + idioma + stock + precio
interface FilaDisponibilidad {
  variantId: number;
  finish: string;
  etiquetaFinish: string;   // "Normal", "Foil", "Surgefoil"...
  language: string;
  precio: number;
  stock: number;
}

@Component({
  selector: 'app-detalle-carta',
  templateUrl: './detalle-carta.html',
  styleUrl: './detalle-carta.scss'
})
export class DetalleCarta {

  private catalogo = inject(CatalogoService);
  private carrito = inject(CarritoService);
  private ruta = inject(ActivatedRoute);

  carta = signal<Card | null>(null);
  variantes = signal<CardVariant[]>([]);
  cargando = signal(true);

  constructor() {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.catalogo.getCarta(id).subscribe({
      next: c => this.carta.set(c),
      error: () => this.cargando.set(false)
    });
    this.catalogo.getVariantes(id).subscribe({
      next: vs => { this.variantes.set(vs); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  // Nombres de idioma en espanol. Cubre todos los codigos que usa Scryfall,
  // por si en un lote llegan cartas en japones, ruso, aleman, etc.
  private nombresIdioma: Record<string, string> = {
    en: 'Inglés',
    es: 'Español',
    fr: 'Francés',
    de: 'Alemán',
    it: 'Italiano',
    pt: 'Portugués',
    ja: 'Japonés',
    ko: 'Coreano',
    ru: 'Ruso',
    zhs: 'Chino simplificado',
    zht: 'Chino tradicional',
    he: 'Hebreo',
    la: 'Latín',
    grc: 'Griego antiguo',
    ar: 'Árabe',
    sa: 'Sánscrito',
    ph: 'Phyrexiano'
  };
  nombreIdioma(codigo: string): string {
    return this.nombresIdioma[codigo] ?? codigo.toUpperCase();
  }

  // Solo las variantes CON stock, ordenadas: acabado y luego idioma.
  // Cada una con su precio efectivo (manual > precio del Card por acabado).
  disponibilidad = computed<FilaDisponibilidad[]>(() => {
    const c = this.carta();
    if (!c) return [];
    return this.variantes()
      .filter(v => v.stock > 0)
      .map(v => ({
        variantId: v.id,
        finish: v.finish,
        etiquetaFinish: v.specialFoilType
          ? this.capitalizar(v.specialFoilType)
          : this.capitalizar(v.finish),
        language: v.language,
        precio: this.precioVariante(v, c),
        stock: v.stock
      }))
      .sort((a, b) =>
        a.finish.localeCompare(b.finish) || a.language.localeCompare(b.language));
  });

  private precioVariante(v: CardVariant, c: Card): number {
    if (v.manualPriceCop != null) return v.manualPriceCop;
    switch (v.finish) {
      case 'foil': return c.priceCopFoil ?? 0;
      case 'etched': return c.priceCopEtched ?? 0;
      default: return c.priceCop ?? 0;
    }
  }

  private capitalizar(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Agrega una fila de disponibilidad (variante exacta) al carrito
  agregarAlCarrito(fila: FilaDisponibilidad) {
    const c = this.carta();
    if (!c) return;
    this.carrito.agregar({
      variantId: fila.variantId,
      cardId: c.id,
      nombre: c.name,
      imageUrl: c.imageUrl,
      setName: c.mtgSet.name,
      finish: fila.finish,
      language: fila.language,
      precio: fila.precio,
      stock: fila.stock
    });
  }

  formatearPrecio(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
