// ============================================================
// PAGINA DE INICIO
// Hero con el logo de la marca + expansiones en el mercado
// + "Lo último": las cartas recien subidas a la tienda.
// ============================================================
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../core/catalogo.service';
import { TileCarta } from '../../components/tile-carta';

// Tipos de set que SI se muestran como clasificacion propia en la tienda.
// Decision del dueño (2026-07-04): las series masterpiece (Marvel Universe,
// Mystical Archive...) SI son clasificacion propia porque son productos
// premium reales. Solo las PROMOS se funden dentro de su expansion madre.
//   - token/memorabilia: tienen su propia seccion o no se venden
//   - promo: NO aparece como entrada; sus cartas salen al filtrar el set madre
const TIPOS_SET_VISIBLES = ['expansion', 'core', 'masters', 'commander', 'draft_innovation', 'masterpiece'];

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, TileCarta],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {

  private catalogo = inject(CatalogoService);

  // Los sets llegan del backend como un "signal": cuando la respuesta
  // llega, la pagina se actualiza sola. Empieza como lista vacia.
  private sets = toSignal(this.catalogo.getSets(), { initialValue: [] });

  // "Lo último": las 6 variantes con stock subido mas recientemente
  novedades = toSignal(this.catalogo.getNovedades(6), { initialValue: [] });

  // Expansiones que se muestran en el inicio:
  // 1. Ya lanzadas (releaseDate <= hoy). Las futuras como Reality
  //    Fracture apareceran SOLAS el dia de su lanzamiento.
  // 2. Solo tipos principales (ver TIPOS_SET_VISIBLES arriba).
  // 3. Solo las 8 mas recientes.
  setsRecientes = computed(() => {
    const hoy = new Date().toISOString().slice(0, 10); // "2026-07-04"
    return this.sets()
      .filter(s => s.releaseDate && s.releaseDate <= hoy)
      .filter(s => TIPOS_SET_VISIBLES.includes(s.setType))
      .slice(0, 8);
  });
}
