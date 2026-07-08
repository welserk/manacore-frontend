// ============================================================
// PANEL ADMIN — TERMINOS Y CONDICIONES
// Editor del documento legal que se muestra en /terminos. Se
// escribe en Markdown (titulos con #, listas con -, **negrilla**)
// y a la derecha se ve la vista previa en vivo, tal cual la vera
// el cliente. Guardar -> PUT /manacore-panel/api/legal/terminos.
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { LegalService } from '../../core/legal.service';
import { markdownAHtml } from '../../core/markdown';

@Component({
  selector: 'app-admin-terminos',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="terminos-admin fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Términos y condiciones</h1>

      <nav class="tabs-panel">
        <a routerLink="/manacore-panel" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Inventario</a>
        <a routerLink="/manacore-panel/pedidos" routerLinkActive="activo">Pedidos</a>
        <a routerLink="/manacore-panel/ofertas" routerLinkActive="activo">Ofertas</a>
        <a routerLink="/manacore-panel/configuracion" routerLinkActive="activo">Configuración</a>
        <a routerLink="/manacore-panel/terminos" routerLinkActive="activo">Términos</a>
      </nav>

      @if (cargando()) {
        <p class="vacio">Cargando…</p>
      } @else {
        <p class="pista">Escribe en Markdown: <code>#</code> título, <code>##</code>
          subtítulo, <code>-</code> lista, <code>**negrilla**</code>. A la derecha
          ves cómo quedará para el cliente.</p>

        @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }
        @if (error()) { <p class="error">{{ error() }}</p> }

        <label class="titulo-doc">Título
          <input type="text" [ngModel]="titulo()" (ngModelChange)="titulo.set($event)"
                 [ngModelOptions]="{ standalone: true }">
        </label>

        <div class="editor">
          <div class="col">
            <span class="col-titulo">Contenido (Markdown)</span>
            <textarea [ngModel]="contenido()" (ngModelChange)="contenido.set($event)"
                      [ngModelOptions]="{ standalone: true }" rows="22"></textarea>
          </div>
          <div class="col">
            <span class="col-titulo">Vista previa</span>
            <article class="preview panel" [innerHTML]="preview()"></article>
          </div>
        </div>

        <button class="btn-dorado guardar" [disabled]="guardando() || !titulo().trim()"
                (click)="guardar()">
          {{ guardando() ? 'Guardando…' : 'Guardar términos' }}
        </button>
      }
    </section>
  `,
  styles: `
    .terminos-admin {
      max-width: 1100px;
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

    .tabs-panel { display: flex; gap: 0.6rem; margin-bottom: 1.2rem; flex-wrap: wrap; }
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

    .vacio { color: var(--texto-suave); padding: 2rem 0; text-align: center; }
    .pista { font-size: 0.82rem; color: var(--texto-suave); line-height: 1.5; margin-bottom: 1rem; }
    .pista code {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 5px;
      padding: 0.05rem 0.4rem;
      font-size: 0.78rem;
      color: var(--texto);
    }

    .titulo-doc {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.84rem;
      color: var(--texto-suave);
      margin-bottom: 1rem;
    }
    .titulo-doc input {
      width: 100%;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 1rem;
      padding: 0.6rem 0.8rem;
      outline: none;
    }
    .titulo-doc input:focus { border-color: var(--dorado); }

    /* Editor a dos columnas: Markdown | vista previa */
    .editor {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.2rem;
      margin-bottom: 1.2rem;
    }
    .col { display: flex; flex-direction: column; gap: 0.4rem; }
    .col-titulo {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--texto-suave);
      font-weight: 600;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 10px;
      color: var(--texto);
      font-family: monospace;
      font-size: 0.88rem;
      line-height: 1.6;
      padding: 1rem;
      outline: none;
      resize: vertical;
      transition: border-color 0.15s;
    }
    textarea:focus { border-color: var(--dorado); }

    .preview {
      padding: 1rem 1.3rem;
      min-height: 200px;
      max-height: 520px;
      overflow-y: auto;
      line-height: 1.7;
      font-size: 0.9rem;
      color: var(--texto-suave);
    }
    .preview ::ng-deep h1 { font-size: 1.4rem; color: var(--dorado); margin-bottom: 0.8rem; }
    .preview ::ng-deep h2 { font-size: 1.05rem; color: var(--texto); margin: 1.2rem 0 0.5rem; }
    .preview ::ng-deep h3 { font-size: 0.95rem; color: var(--texto); margin: 1rem 0 0.4rem; }
    .preview ::ng-deep p { margin-bottom: 0.7rem; }
    .preview ::ng-deep ul { margin: 0.3rem 0 0.8rem 1.4rem; }
    .preview ::ng-deep li { margin-bottom: 0.25rem; }
    .preview ::ng-deep strong { color: var(--texto); }

    .guardar:disabled { opacity: 0.55; cursor: not-allowed; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    @media (max-width: 800px) {
      .editor { grid-template-columns: 1fr; }
    }
  `
})
export class AdminTerminos {

  private admin = inject(AdminService);
  private legal = inject(LegalService);

  cargando = signal(true);
  titulo = signal('');
  contenido = signal('');
  guardando = signal(false);
  aviso = signal('');
  error = signal('');

  // Vista previa en vivo (se recalcula cuando cambia el contenido)
  preview = computed(() => markdownAHtml(this.contenido()));

  constructor() {
    this.legal.getTerminos().subscribe({
      next: (doc) => {
        this.titulo.set(doc.title);
        this.contenido.set(doc.content);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  guardar() {
    this.aviso.set('');
    this.error.set('');
    this.guardando.set(true);
    this.admin.editarLegal('terminos', this.titulo(), this.contenido()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.aviso.set('Términos guardados ✔ — ya se ven actualizados en la tienda.');
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e.error?.error ?? 'No se pudieron guardar los términos.');
      }
    });
  }
}
