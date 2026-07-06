// ============================================================
// PAGINA DEL CATALOGO — el corazon de la tienda
// Buscador + filtros (expansion, color, rareza, formato) +
// grilla de tiles estilo SCG (cada variante es su propio tile)
// + paginacion. Todo con stock real del backend.
// ============================================================
import { Component, computed, effect, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../core/catalogo.service';
import { CatalogoTile, Pagina } from '../../core/modelos';
import { TileCatalogo } from '../../components/tile-catalogo';

// Los mismos tipos visibles del inicio (para el filtro de expansiones)
const TIPOS_SET_VISIBLES = ['expansion', 'core', 'masters', 'commander', 'draft_innovation', 'masterpiece'];

@Component({
  selector: 'app-catalogo',
  imports: [TileCatalogo, TitleCasePipe],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class Catalogo {

  private catalogo = inject(CatalogoService);
  private ruta = inject(ActivatedRoute);

  // ------ Filtros (cada uno es un signal: al cambiar, se re-consulta) ------
  nombre = signal('');
  set = signal('');
  color = signal('');
  rareza = signal('');
  orden = signal('precio-desc');   // "precio-desc" (defecto) | "precio-asc"
  pagina = signal(0);

  // ------ Resultados ------
  resultados = signal<Pagina<CatalogoTile> | null>(null);
  cargando = signal(false);

  // Los colores de mana para los botones de filtro, con su simbolo
  // oficial (SVG de Scryfall). "C" es el incoloro (simbolo wastes):
  // artefactos, Eldrazi y demas cartas sin color.
  colores = [
    { codigo: 'W', nombre: 'Blanco' },
    { codigo: 'U', nombre: 'Azul' },
    { codigo: 'B', nombre: 'Negro' },
    { codigo: 'R', nombre: 'Rojo' },
    { codigo: 'G', nombre: 'Verde' },
    { codigo: 'C', nombre: 'Incoloro' },
  ];
  rarezas = ['common', 'uncommon', 'rare', 'mythic'];

  // URL del simbolo de mana oficial de un color
  simboloMana(codigo: string): string {
    return `https://svgs.scryfall.io/card-symbols/${codigo}.svg`;
  }

  // Expansiones para el menu desplegable (mismas reglas del inicio)
  private sets = toSignal(this.catalogo.getSets(), { initialValue: [] });
  setsVisibles = computed(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    return this.sets()
      .filter(s => s.releaseDate && s.releaseDate <= hoy)
      .filter(s => TIPOS_SET_VISIBLES.includes(s.setType));
  });

  // Temporizador para no consultar en cada tecla del buscador (espera 350ms)
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Sincroniza los filtros con los parametros de la URL. Asi funcionan:
    //   /catalogo?set=stx        (clic en una expansion del inicio)
    //   /catalogo?buscar=bolt    (buscador del header, incluso ya estando aqui)
    // Al ser una suscripcion, reacciona aunque ya estemos en el catalogo.
    this.ruta.queryParamMap.subscribe(params => {
      const buscar = params.get('buscar') ?? '';
      const set = params.get('set') ?? '';
      if (buscar !== this.nombre()) { this.pagina.set(0); this.nombre.set(buscar); }
      if (set !== this.set()) { this.pagina.set(0); this.set.set(set); }
    });

    // Cada vez que CUALQUIER filtro o la pagina cambia, se consulta de nuevo.
    // effect() observa los signals que se leen adentro y se re-ejecuta solo.
    effect(() => {
      const filtros = {
        nombre: this.nombre(),
        set: this.set(),
        color: this.color(),
        rareza: this.rareza(),
        orden: this.orden(),
        page: this.pagina(),
        size: 24
      };
      this.cargando.set(true);
      this.catalogo.buscarCatalogo(filtros).subscribe({
        next: r => { this.resultados.set(r); this.cargando.set(false); },
        error: () => { this.resultados.set(null); this.cargando.set(false); }
      });
    });
  }

  // El buscador escribe con retraso de 350ms para no saturar el backend
  alEscribirNombre(valor: string) {
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => {
      this.pagina.set(0);       // toda busqueda nueva empieza en la pagina 1
      this.nombre.set(valor);
    }, 350);
  }

  // Alternar un color: clic en el activo lo desactiva
  alternarColor(codigo: string) {
    this.pagina.set(0);
    this.color.set(this.color() === codigo ? '' : codigo);
  }

  cambiarSet(valor: string) {
    this.pagina.set(0);
    this.set.set(valor);
  }

  cambiarRareza(valor: string) {
    this.pagina.set(0);
    this.rareza.set(valor);
  }

  cambiarOrden(valor: string) {
    this.pagina.set(0);
    this.orden.set(valor);
  }

  limpiarFiltros() {
    this.pagina.set(0);
    this.nombre.set('');
    this.set.set('');
    this.color.set('');
    this.rareza.set('');
    this.orden.set('precio-desc');
  }

  // Navegacion entre paginas de resultados
  paginaAnterior() {
    if (this.pagina() > 0) this.pagina.update(p => p - 1);
  }
  paginaSiguiente() {
    const r = this.resultados();
    if (r && this.pagina() < r.totalPages - 1) this.pagina.update(p => p + 1);
  }
}
