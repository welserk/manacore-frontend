// ============================================================
// NAVEGACION DEL PANEL ADMIN (compartida)
// Las pestañas que aparecen en TODAS las paginas del panel.
// Vive en un solo componente: agregar una seccion nueva es
// agregar UNA linea aqui, no tocar cada pagina.
// ============================================================
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-panel-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs-panel">
      <a routerLink="/manacore-panel/dashboard" routerLinkActive="activo">Dashboard</a>
      <a routerLink="/manacore-panel" [routerLinkActiveOptions]="{ exact: true }"
         routerLinkActive="activo">Inventario</a>
      <a routerLink="/manacore-panel/pedidos" routerLinkActive="activo">Pedidos</a>
      <a routerLink="/manacore-panel/ofertas" routerLinkActive="activo">Ofertas</a>
      <a routerLink="/manacore-panel/usuarios" routerLinkActive="activo">Usuarios</a>
      <a routerLink="/manacore-panel/configuracion" routerLinkActive="activo">Configuración</a>
      <a routerLink="/manacore-panel/terminos" routerLinkActive="activo">Términos</a>
    </nav>
  `,
  styles: `
    .tabs-panel {
      display: flex;
      gap: 0.6rem;
      margin-bottom: 1.2rem;
      flex-wrap: wrap;
    }
    .tabs-panel a {
      padding: 0.45rem 1.2rem;
      border: 1px solid var(--negro-borde);
      border-radius: 20px;
      color: var(--texto-suave);
      font-size: 0.88rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .tabs-panel a.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }
  `
})
export class PanelNav {}
