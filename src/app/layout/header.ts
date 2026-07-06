// ============================================================
// HEADER: la barra superior de toda la tienda.
// Logo circular + nombre en la tipografia de la marca + navegacion.
// ============================================================
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CarritoService } from '../core/carrito.service';

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

      <!-- Buscador rapido: Enter lleva al catalogo filtrado por ese nombre -->
      <div class="buscador-header">
        <input
          type="search"
          placeholder="Buscar carta…"
          (keyup.enter)="buscar($any($event.target).value)">
        <span class="lupa">🔍</span>
      </div>

      <!-- Acciones del usuario: carrito e ingreso -->
      <div class="acciones">
        <button class="carrito-btn" (click)="carrito.abrir()" title="Ver carrito">
          🛒
          @if (carrito.cantidadTotal() > 0) {
            <span class="carrito-badge">{{ carrito.cantidadTotal() }}</span>
          }
        </button>
        <a routerLink="/login" class="btn-fantasma btn-chico">Ingresar</a>
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

    /* Buscador rapido del header */
    .buscador-header {
      position: relative;
      flex: 1;
      max-width: 300px;
      margin-left: auto;
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

    .acciones {
      display: flex;
      align-items: center;
      gap: 0.9rem;
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
  carrito = inject(CarritoService);

  // Lleva al catalogo filtrado por el texto buscado.
  // Si el campo esta vacio, va al catalogo sin filtro.
  buscar(texto: string) {
    const t = texto.trim();
    this.router.navigate(['/catalogo'], {
      queryParams: t ? { buscar: t } : {}
    });
  }
}
