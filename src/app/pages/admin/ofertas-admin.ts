// ============================================================
// PANEL ADMIN — VENTA DE COLECCIONES
// Las ofertas que los clientes mandan desde "Vende tu coleccion".
// El flujo del dueño: revisar la lista (y el adjunto si hay),
// contactar al vendedor por su telefono, y dejar registrado en
// que va: PENDIENTE -> REVISADA -> CONTACTADO (o RECHAZADA),
// con notas internas que el vendedor nunca ve.
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, OfertaAdmin } from '../../core/admin.service';
import { API_URL } from '../../core/catalogo.service';

const ESTADOS: Record<string, { texto: string; color: string }> = {
  PENDIENTE:  { texto: 'Pendiente',     color: '#d4af37' },
  REVISADA:   { texto: 'Revisada',      color: '#5aa9e8' },
  CONTACTADO: { texto: 'Contactado',    color: '#52c98a' },
  RECHAZADA:  { texto: 'Rechazada',     color: '#d3202a' }
};

@Component({
  selector: 'app-admin-ofertas',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="ofertas-admin fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Venta de colecciones</h1>

      <!-- Navegacion del panel -->
      <nav class="tabs-panel">
        <a routerLink="/manacore-panel" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Inventario</a>
        <a routerLink="/manacore-panel/pedidos" routerLinkActive="activo">Pedidos</a>
        <a routerLink="/manacore-panel/ofertas" routerLinkActive="activo">Ofertas</a>
        <a routerLink="/manacore-panel/configuracion" routerLinkActive="activo">Configuración</a>
        <a routerLink="/manacore-panel/terminos" routerLinkActive="activo">Términos</a>
      </nav>

      <!-- Filtro por estado -->
      <div class="filtros-estado">
        <button [class.activo]="filtro() === 'PENDIENTE'" (click)="cambiarFiltro('PENDIENTE')">Pendientes</button>
        <button [class.activo]="filtro() === ''" (click)="cambiarFiltro('')">Todas</button>
        <button [class.activo]="filtro() === 'CONTACTADO'" (click)="cambiarFiltro('CONTACTADO')">Contactadas</button>
        <button [class.activo]="filtro() === 'RECHAZADA'" (click)="cambiarFiltro('RECHAZADA')">Rechazadas</button>
      </div>

      @if (cargando()) {
        <p class="vacio">Cargando ofertas…</p>
      } @else if (ofertas().length === 0) {
        <p class="vacio">
          {{ filtro() === 'PENDIENTE' ? '🎉 No hay ofertas pendientes.' : 'No hay ofertas aquí.' }}
        </p>
      } @else {
        @for (oferta of ofertas(); track oferta.id) {
          <div class="panel oferta">
            <div class="cabecera">
              <div>
                <span class="vendedor">{{ oferta.user?.name ?? 'Cliente' }}</span>
                <span class="fecha">{{ fecha(oferta.createdAt) }}</span>
              </div>
              <span class="insignia" [style.--color-estado]="estado(oferta).color">
                {{ estado(oferta).texto }}
              </span>
            </div>

            <p class="contacto">
              📱 {{ oferta.contactPhone }}
              @if (oferta.user?.email) { · ✉ {{ oferta.user?.email }} }
              @if (oferta.user?.city)  { · 📍 {{ oferta.user?.city }} }
            </p>

            <!-- La lista de cartas ofrecida (texto tal cual la mando) -->
            <pre class="lista">{{ oferta.listText }}</pre>

            @if (oferta.attachmentPath) {
              <a [href]="urlAdjunto(oferta)" target="_blank" class="adjunto">📎 Ver archivo adjunto</a>
            }

            @if (avisoDe() === oferta.id && aviso()) { <p class="aviso">{{ aviso() }}</p> }
            @if (avisoDe() === oferta.id && error()) { <p class="error">{{ error() }}</p> }

            <!-- Gestion: cambiar estado + notas internas -->
            <div class="gestion">
              <select [ngModel]="estadoEditado()[oferta.id] ?? oferta.status"
                      (ngModelChange)="editarEstado(oferta.id, $event)"
                      [ngModelOptions]="{ standalone: true }">
                <option value="PENDIENTE">Pendiente</option>
                <option value="REVISADA">Revisada</option>
                <option value="CONTACTADO">Contactado</option>
                <option value="RECHAZADA">Rechazada</option>
              </select>
              <input type="text" class="campo-notas"
                     placeholder="Notas internas (el vendedor no las ve)…"
                     [ngModel]="notasEditadas()[oferta.id] ?? (oferta.adminNotes ?? '')"
                     (ngModelChange)="editarNotas(oferta.id, $event)"
                     [ngModelOptions]="{ standalone: true }">
              <button class="btn-fantasma btn-mini"
                      [disabled]="guardandoId() === oferta.id"
                      (click)="guardar(oferta)">
                {{ guardandoId() === oferta.id ? '…' : 'Guardar' }}
              </button>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .ofertas-admin {
      max-width: 760px;
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

    .tabs-panel { display: flex; gap: 0.6rem; margin-bottom: 1.2rem; }
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

    .filtros-estado { display: flex; gap: 0.6rem; margin-bottom: 1.4rem; flex-wrap: wrap; }
    .filtros-estado button {
      padding: 0.45rem 1rem;
      background: transparent;
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto-suave);
      font-family: var(--fuente-cuerpo);
      font-size: 0.84rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filtros-estado button.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    .vacio { color: var(--texto-suave); padding: 2rem 0; text-align: center; }

    .oferta { padding: 1.2rem 1.4rem; margin-bottom: 1.1rem; }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.4rem;
    }
    .vendedor {
      font-family: var(--fuente-titulos);
      font-weight: 700;
      color: var(--dorado);
      margin-right: 0.8rem;
    }
    .fecha { color: var(--texto-suave); font-size: 0.82rem; }
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.25rem 0.9rem;
      font-size: 0.76rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .contacto { color: var(--texto-suave); font-size: 0.86rem; margin-bottom: 0.7rem; }

    .lista {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      padding: 0.8rem 1rem;
      font-size: 0.84rem;
      color: var(--texto-suave);
      white-space: pre-wrap;
      max-height: 180px;
      overflow-y: auto;
      margin-bottom: 0.6rem;
    }
    .adjunto {
      display: inline-block;
      color: var(--dorado);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.6rem;
    }

    .gestion {
      display: flex;
      gap: 0.7rem;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 0.6rem;
      padding-top: 0.8rem;
      border-top: 1px dashed var(--negro-borde);
    }
    .gestion select, .campo-notas {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.85rem;
      padding: 0.45rem 0.6rem;
      outline: none;
      box-sizing: border-box;
    }
    .campo-notas { flex: 1; min-width: 200px; }
    .campo-notas:focus, .gestion select:focus { border-color: var(--dorado); }
    .btn-mini { padding: 0.4rem 0.9rem; font-size: 0.8rem; }
    .btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.82rem;
      margin: 0.6rem 0;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.82rem;
      margin: 0.6rem 0;
    }
  `
})
export class AdminOfertas {

  private admin = inject(AdminService);

  // '' = todas; o un estado especifico. Arranca en PENDIENTE:
  // es lo que el dueño viene a revisar
  filtro = signal('PENDIENTE');
  ofertas = signal<OfertaAdmin[]>([]);
  cargando = signal(true);

  // Ediciones sin guardar (por id de oferta)
  estadoEditado = signal<Record<number, string>>({});
  notasEditadas = signal<Record<number, string>>({});
  guardandoId = signal<number | null>(null);
  avisoDe = signal<number | null>(null);
  aviso = signal('');
  error = signal('');

  constructor() {
    this.cargar();
  }

  cambiarFiltro(estado: string) {
    this.filtro.set(estado);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.admin.getOfertas(this.filtro() || undefined).subscribe({
      next: (lista) => { this.ofertas.set(lista); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  editarEstado(id: number, valor: string) {
    this.estadoEditado.update(m => ({ ...m, [id]: valor }));
  }

  editarNotas(id: number, valor: string) {
    this.notasEditadas.update(m => ({ ...m, [id]: valor }));
  }

  guardar(oferta: OfertaAdmin) {
    const estado = this.estadoEditado()[oferta.id] ?? oferta.status;
    const notas = this.notasEditadas()[oferta.id] ?? (oferta.adminNotes ?? '');
    this.aviso.set('');
    this.error.set('');
    this.avisoDe.set(oferta.id);
    this.guardandoId.set(oferta.id);
    this.admin.actualizarOferta(oferta.id, estado, notas).subscribe({
      next: (actualizada) => {
        this.guardandoId.set(null);
        this.aviso.set('Oferta actualizada ✔');
        // Refresca la tarjeta; si el filtro activo ya no la incluye,
        // desaparece de la lista (comportamiento esperado)
        if (this.filtro() && actualizada.status !== this.filtro()) {
          this.ofertas.update(lista => lista.filter(o => o.id !== oferta.id));
        } else {
          this.ofertas.update(lista =>
            lista.map(o => o.id === actualizada.id ? actualizada : o));
        }
      },
      error: (e) => {
        this.guardandoId.set(null);
        this.error.set(e.error?.error ?? 'No se pudo actualizar la oferta.');
      }
    });
  }

  estado(oferta: OfertaAdmin) {
    return ESTADOS[oferta.status] ?? { texto: oferta.status, color: '#888' };
  }

  urlAdjunto(oferta: OfertaAdmin): string {
    return `${API_URL}${oferta.attachmentPath}`;
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }
}
