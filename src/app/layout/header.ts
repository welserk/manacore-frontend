// ============================================================
// HEADER: la barra superior de toda la tienda.
// Logo circular + nombre en la tipografia de la marca + navegacion.
// ============================================================
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CarritoService } from '../core/carrito.service';
import { AuthService } from '../core/auth.service';
import { CatalogoService } from '../core/catalogo.service';
import { AdminService } from '../core/admin.service';
import { CatalogoTile } from '../core/modelos';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <!-- Marca: logo + nombre, clic lleva al inicio -->
      <a routerLink="/" class="marca">
        <img src="logo/logo-icono-circulo.png" alt="ManaCore TCG" class="marca-logo">
        <span class="marca-texto">
          <span class="marca-nombre">MANACORE</span>
          <span class="marca-tcg">TCG</span>
        </span>
      </a>

      <!-- Navegacion principal -->
      <nav class="nav">
        <a routerLink="/catalogo" routerLinkActive="activo">Catálogo</a>
        <a routerLink="/tokens" routerLinkActive="activo">Tokens</a>
        <a routerLink="/vender" routerLinkActive="activo">Vende tu colección</a>
      </nav>

      <!-- Buscador rapido: al escribir muestra hasta 5 sugerencias;
           Enter lleva al catalogo filtrado por ese nombre -->
      <div class="buscador-header">
        <input
          #campoBusqueda
          type="search"
          placeholder="Buscar carta…"
          (input)="alEscribir(campoBusqueda.value)"
          (keyup.enter)="buscar(campoBusqueda.value)"
          (blur)="cerrarSugerencias()">
        <span class="lupa">🔍</span>
        @if (sugerencias().length > 0) {
          <div class="sugerencias">
            <!-- Cada sugerencia es una VARIANTE del catalogo: la misma
                 carta puede salir varias veces (arte alterno, foil...) -->
            @for (tile of sugerencias(); track tile.cardId + '-' + tile.finish) {
              <!-- mousedown (no click): se dispara ANTES del blur del
                   input, asi la navegacion gana antes de que el panel
                   se cierre -->
              <button class="sugerencia" (mousedown)="irACarta(tile, campoBusqueda)">
                @if (tile.imageUrl) {
                  <img [src]="tile.imageUrl" alt="" class="sugerencia-img">
                }
                <span class="sugerencia-info">
                  <span class="sugerencia-nombre">
                    {{ tile.name }}
                    @if (etiquetaAcabado(tile)) {
                      <span class="sugerencia-foil">({{ etiquetaAcabado(tile) }})</span>
                    }
                  </span>
                  <span class="sugerencia-set">{{ tile.setName }} · #{{ tile.collectorNumber }}</span>
                </span>
                <span class="sugerencia-datos">
                  <span class="sugerencia-precio">{{ formatoPrecio(tile.precio) }}</span>
                  <span class="sugerencia-stock">{{ tile.stockTotal }} disp.</span>
                </span>
              </button>
            }
          </div>
        }
      </div>

      <!-- Acciones del usuario: carrito e ingreso -->
      <div class="acciones">
        <button class="carrito-btn" (click)="carrito.abrir()" title="Ver carrito">
          🛒
          @if (carrito.cantidadTotal() > 0) {
            <span class="carrito-badge">{{ carrito.cantidadTotal() }}</span>
          }
        </button>
        <!-- Si hay sesion: nombre (lleva a Mi cuenta) + salir. Si no: Ingresar. -->
        @if (auth.logueado()) {
          <!-- Menu del ADMIN: desplegable con las secciones del panel
               y el numerito de ofertas de coleccion pendientes -->
          @if (auth.sesion()?.rol === 'ADMIN') {
            <div class="menu-admin">
              <button class="btn-fantasma btn-chico"
                      (click)="menuAdmin.set(!menuAdmin())">
                ⚙ Panel ▾
                @if (ofertasPendientes() > 0) {
                  <span class="notificacion">{{ ofertasPendientes() }}</span>
                }
              </button>
              @if (menuAdmin()) {
                <div class="menu-desplegable">
                  <a routerLink="/manacore-panel/dashboard" (click)="menuAdmin.set(false)">📊 Dashboard</a>
                  <a routerLink="/manacore-panel" (click)="menuAdmin.set(false)">🃏 Inventario</a>
                  <a routerLink="/manacore-panel/pedidos" (click)="menuAdmin.set(false)">📦 Pedidos</a>
                  <a routerLink="/manacore-panel/ofertas" (click)="menuAdmin.set(false)">
                    💰 Venta de colecciones
                    @if (ofertasPendientes() > 0) {
                      <span class="notificacion">{{ ofertasPendientes() }}</span>
                    }
                  </a>
                  <a routerLink="/manacore-panel/usuarios" (click)="menuAdmin.set(false)">👥 Usuarios</a>
                  <a routerLink="/manacore-panel/configuracion" (click)="menuAdmin.set(false)">⚙ Configuración</a>
                  <a routerLink="/manacore-panel/terminos" (click)="menuAdmin.set(false)">📄 Términos</a>
                </div>
              }
            </div>
          }
          <a routerLink="/cuenta" class="usuario-nombre" title="Mi cuenta">👤 {{ auth.nombre() }}</a>
          <button class="btn-fantasma btn-chico" (click)="salir()">Salir</button>
        } @else {
          <a routerLink="/login" class="btn-fantasma btn-chico">Ingresar</a>
        }
      </div>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 0.6rem 2rem;
      background: rgba(10, 10, 12, 0.92);
      border-bottom: 1px solid var(--negro-borde);
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(8px);
    }

    .marca {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }
    .marca-logo {
      height: 52px;
      width: 52px;
    }
    .marca-texto {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .marca-nombre {
      font-family: var(--fuente-titulos);
      font-weight: 700;
      font-size: 1.35rem;
      letter-spacing: 0.08em;
      /* Degradado dorado sobre el texto, como el logo */
      background: linear-gradient(180deg, var(--dorado-claro), var(--dorado) 55%, var(--dorado-oscuro));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .marca-tcg {
      font-family: var(--fuente-titulos);
      font-size: 0.72rem;
      letter-spacing: 0.5em;
      color: var(--dorado-oscuro);
    }

    .nav {
      display: flex;
      gap: 1.6rem;
    }

    /* Buscador rapido del header: anclado al CENTRO exacto de la
       pagina (el mismo eje del logo grande del inicio). position
       absolute lo saca de la fila y left 50% + translateX(-50%)
       lo centra sin importar cuanto ocupen el menu o las acciones */
    .buscador-header {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: clamp(220px, 26vw, 380px);
    }
    /* En pantallas angostas no hay campo para centrarlo sin tapar
       el menu: vuelve a la fila normal, entre el menu y las acciones */
    @media (max-width: 1100px) {
      .buscador-header {
        position: relative;
        left: auto;
        transform: none;
        flex: 1;
        width: auto;
        max-width: 320px;
        margin-left: auto;
      }
    }
    .buscador-header input {
      width: 100%;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 20px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.9rem;
      padding: 0.5rem 2.2rem 0.5rem 1rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .buscador-header input:focus {
      border-color: var(--dorado);
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
    }
    .lupa {
      position: absolute;
      right: 0.8rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.85rem;
      opacity: 0.6;
      pointer-events: none;
    }

    /* Panel de sugerencias colgando debajo del input. Es mas ancho
       que el input (minmax con vw) para que quepan precio y stock */
    .sugerencias {
      position: absolute;
      top: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      width: min(480px, 90vw);
      background: rgba(14, 14, 17, 0.98);
      border: 1px solid var(--dorado-oscuro);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      z-index: 200;
    }
    .sugerencia {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      width: 100%;
      padding: 0.55rem 0.9rem;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s;
    }
    .sugerencia:hover {
      background: rgba(212, 175, 55, 0.12);
    }
    .sugerencia-img {
      width: 44px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .sugerencia-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      line-height: 1.35;
      overflow: hidden;
    }
    .sugerencia-nombre {
      color: var(--texto);
      font-size: 0.95rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Acabado foil con el mismo acento tornasol de los tiles */
    .sugerencia-foil {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      background: linear-gradient(100deg, #c96be0, #5aa9e8, #52c98a, #e8d152);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .sugerencia-set {
      color: var(--texto-suave);
      font-size: 0.76rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Precio y stock a la derecha de cada sugerencia */
    .sugerencia-datos {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.35;
      flex-shrink: 0;
    }
    .sugerencia-precio {
      color: var(--dorado);
      font-weight: 700;
      font-size: 0.9rem;
    }
    .sugerencia-stock {
      color: var(--texto-suave);
      font-size: 0.72rem;
    }
    .nav a {
      color: var(--texto-suave);
      font-weight: 500;
      font-size: 0.95rem;
      padding: 0.3rem 0;
      border-bottom: 2px solid transparent;
    }
    .nav a:hover {
      color: var(--texto);
    }
    .nav a.activo {
      color: var(--dorado);
      border-bottom-color: var(--dorado);
    }

    .btn-chico {
      padding: 0.45rem 1.1rem;
      font-size: 0.85rem;
    }

    /* Menu desplegable del admin */
    .menu-admin { position: relative; }
    .menu-desplegable {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      display: flex;
      flex-direction: column;
      min-width: 230px;
      background: rgba(14, 14, 17, 0.98);
      border: 1px solid var(--dorado-oscuro);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      z-index: 300;
    }
    .menu-desplegable a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1rem;
      color: var(--texto-suave);
      font-size: 0.88rem;
      font-weight: 600;
      transition: background 0.12s, color 0.12s;
    }
    .menu-desplegable a:hover {
      background: rgba(212, 175, 55, 0.1);
      color: var(--dorado);
    }
    /* El numerito rojo de pendientes */
    .notificacion {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: #d3202a;
      color: #fff;
      border-radius: 9px;
      font-size: 0.68rem;
      font-weight: 700;
      margin-left: 0.4rem;
    }

    /* Nombre del usuario logueado (enlace a Mi cuenta) */
    .usuario-nombre {
      color: var(--dorado);
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .usuario-nombre:hover { text-decoration: underline; }

    .acciones {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      margin-left: auto;   /* pegadas al extremo derecho */
    }
    /* Icono del carrito con el numerito de cuantas cartas lleva */
    .carrito-btn {
      position: relative;
      background: transparent;
      border: none;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 0.2rem;
      transition: transform 0.12s;
    }
    .carrito-btn:hover { transform: scale(1.12); }
    .carrito-badge {
      position: absolute;
      top: -4px;
      right: -6px;
      background: linear-gradient(180deg, var(--dorado-claro), var(--dorado-oscuro));
      color: #1a1405;
      font-size: 0.68rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
  `
})
export class Header {
  private router = inject(Router);
  private catalogo = inject(CatalogoService);
  private adminSrv = inject(AdminService);
  carrito = inject(CarritoService);
  auth = inject(AuthService);

  // Menu del panel (solo ADMIN) + numerito de ofertas pendientes
  menuAdmin = signal(false);
  ofertasPendientes = signal(0);

  constructor() {
    // Cuando hay sesion de ADMIN se consulta cuantas ofertas de
    // coleccion estan PENDIENTES (el numerito rojo del menu)
    effect(() => {
      if (this.auth.sesion()?.rol === 'ADMIN') {
        this.adminSrv.getOfertas('PENDIENTE').subscribe({
          next: (lista) => this.ofertasPendientes.set(lista.length),
          error: () => this.ofertasPendientes.set(0)
        });
      } else {
        this.ofertasPendientes.set(0);
      }
    });
  }

  // Sugerencias del buscador: max 5 VARIANTES del catalogo con stock
  // (la misma carta puede aparecer varias veces: arte alterno, foil...)
  sugerencias = signal<CatalogoTile[]>([]);
  // Temporizador del "debounce": espera a que el usuario deje de
  // escribir antes de consultar la API (evita una llamada por letra)
  private timerBusqueda?: ReturnType<typeof setTimeout>;

  // Cierra la sesion y vuelve al inicio (por si estaba en una
  // pagina que requiere cuenta, como el checkout)
  salir() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // Cada letra reinicia el temporizador; solo cuando pasan 250ms
  // sin escribir se consulta el backend. Minimo 2 letras.
  alEscribir(texto: string) {
    clearTimeout(this.timerBusqueda);
    const t = texto.trim();
    if (t.length < 2) {
      this.sugerencias.set([]);
      return;
    }
    this.timerBusqueda = setTimeout(() => {
      // El endpoint del catalogo devuelve cada variante como su
      // propio resultado (con precio y stock ya calculados)
      this.catalogo.buscarCatalogo({ nombre: t, size: 5 }).subscribe({
        next: pagina => this.sugerencias.set(pagina.content),
        error: () => this.sugerencias.set([])
      });
    }, 250);
  }

  // Clic en una sugerencia: va al detalle de esa carta
  irACarta(tile: CatalogoTile, campo: HTMLInputElement) {
    campo.value = '';
    this.sugerencias.set([]);
    this.router.navigate(['/carta', tile.cardId]);
  }

  // Etiqueta del acabado (foil/etched/surgefoil...); vacia si es normal
  etiquetaAcabado(tile: CatalogoTile): string {
    if (tile.specialFoilType) return tile.specialFoilType;
    return tile.finish === 'normal' ? '' : tile.finish;
  }

  formatoPrecio(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }

  // Al salir del campo se ocultan las sugerencias. El pequeno
  // retraso deja que un mousedown en una sugerencia gane primero.
  cerrarSugerencias() {
    setTimeout(() => this.sugerencias.set([]), 150);
  }

  // Lleva al catalogo filtrado por el texto buscado.
  // Si el campo esta vacio, va al catalogo sin filtro.
  buscar(texto: string) {
    clearTimeout(this.timerBusqueda);
    this.sugerencias.set([]);
    const t = texto.trim();
    this.router.navigate(['/catalogo'], {
      queryParams: t ? { buscar: t } : {}
    });
  }
}
