// ============================================================
// PANEL ADMIN — DASHBOARD
// La vista de pajaro del negocio:
//   - Los numeros grandes: ventas del mes, pedidos por enviar,
//     cartas en stock, clientes.
//   - Ventas de los ultimos 30 dias (barras hechas con CSS).
//   - Top 10 de cartas mas vendidas (con imagen).
//   - Unidades vendidas por color de mana.
// Todo sale de los endpoints de estadisticas del backend.
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { AdminService, CartaVendida, ResumenTienda, VentaDiaria, VentasPorColor } from '../../core/admin.service';
import { PanelNav } from './panel-nav';

// Nombre y color visual de cada color de mana (los del logo)
const COLORES_MANA: Record<string, { nombre: string; css: string }> = {
  W:        { nombre: 'Blanco',   css: '#f5f1e3' },
  U:        { nombre: 'Azul',     css: '#2f9de0' },
  B:        { nombre: 'Negro',    css: '#9457c9' },
  R:        { nombre: 'Rojo',     css: '#e03e2f' },
  G:        { nombre: 'Verde',    css: '#3fae4a' },
  Incoloro: { nombre: 'Incoloro', css: '#a9a9a9' }
};

@Component({
  selector: 'app-admin-dashboard',
  imports: [PanelNav],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="dashboard fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Dashboard</h1>

      <app-panel-nav />

      <!-- ============ LOS NUMEROS GRANDES ============ -->
      @if (resumen(); as r) {
        <div class="tiles">
          <div class="panel tile">
            <span class="tile-valor">{{ formato(r.ventasMes) }}</span>
            <span class="tile-nombre">Ventas del mes</span>
          </div>
          <div class="panel tile" [class.alerta]="r.pedidosSinEnviar > 0">
            <span class="tile-valor">{{ r.pedidosSinEnviar }}</span>
            <span class="tile-nombre">Por despachar</span>
          </div>
          <div class="panel tile">
            <span class="tile-valor">{{ r.cartasEnStock }}</span>
            <span class="tile-nombre">Cartas en stock</span>
          </div>
          <div class="panel tile">
            <span class="tile-valor">{{ r.totalClientes }}</span>
            <span class="tile-nombre">Clientes</span>
          </div>
        </div>
      }

      <!-- ============ VENTAS ULTIMOS 30 DIAS ============ -->
      <div class="panel tarjeta">
        <h2>Ventas — últimos 30 días</h2>
        @if (ventas().length === 0) {
          <p class="vacio-mini">Sin ventas registradas todavía.</p>
        } @else {
          <div class="grafica">
            @for (dia of ventas(); track dia.fecha) {
              <!-- Cada barra: alto proporcional al dia de mayor venta.
                   El title muestra fecha y monto al pasar el mouse -->
              <div class="barra-caja" [title]="dia.fecha + ': ' + formato(dia.total)">
                <div class="barra" [style.height.%]="alturaBarra(dia)"></div>
              </div>
            }
          </div>
          <div class="grafica-pie">
            <span>hace 30 días</span>
            <span>Total: {{ formato(totalPeriodo()) }}</span>
            <span>hoy</span>
          </div>
        }
      </div>

      <div class="dos-columnas">
        <!-- ============ TOP CARTAS ============ -->
        <div class="panel tarjeta">
          <h2>Más vendidas</h2>
          @if (topCartas().length === 0) {
            <p class="vacio-mini">Aún no hay ventas.</p>
          } @else {
            @for (c of topCartas(); track c.id) {
              <div class="fila-carta">
                @if (c.imagen) { <img [src]="c.imagen" alt="" class="mini"> }
                <div class="info">
                  <span class="nombre">{{ c.nombre }}</span>
                  <span class="detalle">{{ c.set }} · {{ c.unidadesVendidas }} vendidas</span>
                </div>
                <span class="monto">{{ formato(c.totalGenerado) }}</span>
              </div>
            }
          }
        </div>

        <!-- ============ POR COLOR ============ -->
        <div class="panel tarjeta">
          <h2>Unidades por color</h2>
          @if (!colores() || maxColor() === 0) {
            <p class="vacio-mini">Aún no hay ventas.</p>
          } @else {
            @for (fila of filasColor(); track fila.nombre) {
              <div class="fila-color">
                <span class="color-nombre">{{ fila.nombre }}</span>
                <div class="color-pista">
                  <div class="color-barra"
                       [style.width.%]="fila.porcentaje"
                       [style.background]="fila.css"></div>
                </div>
                <span class="color-valor">{{ fila.unidades }}</span>
              </div>
            }
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .dashboard {
      max-width: 900px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .miga {
      color: var(--dorado);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.25em;
    }
    h1 { font-size: 1.7rem; margin: 0.2rem 0 1rem; }
    h2 { font-size: 1.02rem; margin-bottom: 0.9rem; }
    .vacio-mini { color: var(--texto-suave); font-size: 0.88rem; }

    /* Los numeros grandes */
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.9rem;
      margin-bottom: 1rem;
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 1rem 1.2rem;
    }
    .tile-valor {
      font-family: var(--fuente-titulos);
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--dorado);
    }
    .tile-nombre { font-size: 0.78rem; color: var(--texto-suave); }
    .tile.alerta { border-color: var(--alerta); }
    .tile.alerta .tile-valor { color: var(--alerta); }

    .tarjeta { padding: 1.2rem 1.4rem; margin-bottom: 1rem; }

    /* Grafica de barras de 30 dias (solo CSS) */
    .grafica {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 140px;
    }
    .barra-caja {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: flex-end;
      cursor: default;
    }
    .barra {
      width: 100%;
      min-height: 2px;
      border-radius: 3px 3px 0 0;
      background: linear-gradient(180deg, var(--dorado-claro), var(--dorado-oscuro));
      transition: filter 0.12s;
    }
    .barra-caja:hover .barra { filter: brightness(1.3); }
    .grafica-pie {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.74rem;
      color: var(--texto-suave);
    }

    .dos-columnas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 700px) { .dos-columnas { grid-template-columns: 1fr; } }

    /* Top cartas */
    .fila-carta {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.45rem 0;
      border-top: 1px solid var(--negro-borde);
    }
    .mini { width: 34px; border-radius: 3px; flex-shrink: 0; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
    .nombre {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--texto);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .detalle { font-size: 0.72rem; color: var(--texto-suave); }
    .monto { color: var(--dorado); font-weight: 600; font-size: 0.82rem; white-space: nowrap; }

    /* Barras por color de mana */
    .fila-color {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.4rem 0;
    }
    .color-nombre { width: 70px; font-size: 0.8rem; color: var(--texto-suave); }
    .color-pista {
      flex: 1;
      height: 14px;
      background: var(--negro);
      border-radius: 7px;
      overflow: hidden;
    }
    .color-barra { height: 100%; border-radius: 7px; min-width: 2px; }
    .color-valor { width: 34px; text-align: right; font-size: 0.8rem; color: var(--texto); font-weight: 600; }
  `
})
export class AdminDashboard {

  private admin = inject(AdminService);

  resumen = signal<ResumenTienda | null>(null);
  ventas = signal<VentaDiaria[]>([]);
  topCartas = signal<CartaVendida[]>([]);
  colores = signal<VentasPorColor | null>(null);

  // El dia de mayor venta define el 100% de alto de las barras
  private maxVenta = computed(() =>
    Math.max(...this.ventas().map(v => v.total), 1));
  totalPeriodo = computed(() =>
    this.ventas().reduce((suma, v) => suma + v.total, 0));
  maxColor = computed(() =>
    Math.max(...(this.colores()?.data ?? [0]), 0));

  // Combina labels + data del backend con los nombres/colores visuales
  filasColor = computed(() => {
    const c = this.colores();
    if (!c) return [];
    const max = this.maxColor() || 1;
    return c.labels.map((label, i) => ({
      nombre: COLORES_MANA[label]?.nombre ?? label,
      css: COLORES_MANA[label]?.css ?? '#888',
      unidades: c.data[i],
      porcentaje: (c.data[i] / max) * 100
    }));
  });

  constructor() {
    this.admin.getResumen().subscribe(r => this.resumen.set(r));
    this.admin.getVentasDiarias().subscribe(v => this.ventas.set(v));
    this.admin.getCartasMasVendidas().subscribe(c => this.topCartas.set(c));
    this.admin.getVentasPorColor().subscribe(c => this.colores.set(c));
  }

  alturaBarra(dia: VentaDiaria): number {
    return (dia.total / this.maxVenta()) * 100;
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
