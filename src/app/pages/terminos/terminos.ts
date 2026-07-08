// ============================================================
// TERMINOS Y CONDICIONES
// Muestra el documento legal que vive en la base de datos (el
// dueño lo edita desde el panel admin). El contenido llega en
// Markdown y aqui se convierte a HTML con un traductor MINIMO
// hecho a mano que cubre lo que usan los terminos: titulos (#),
// negrilla (**) y listas (-). Si algun dia se necesita Markdown
// completo (tablas, links...), se cambia por la libreria "marked".
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { LegalService } from '../../core/legal.service';
import { markdownAHtml } from '../../core/markdown';

@Component({
  selector: 'app-terminos',
  template: `
    <!-- Fondo: Urza, Lord High Artificer -->
    <section class="terminos fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/7/b/7b7a348a-51f7-4dc5-8fe7-1c70fea5e050.jpg?1782733217')">
      @if (cargando()) {
        <p class="cargando">Cargando…</p>
      } @else {
        <!-- [innerHTML]: Angular ademas SANITIZA el HTML resultante
             (elimina scripts o atributos peligrosos) por seguridad -->
        <article class="panel documento" [innerHTML]="html()"></article>
      }
    </section>
  `,
  styles: `
    .terminos {
      max-width: 760px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .cargando { text-align: center; color: var(--texto-suave); padding: 2rem; }
    .documento {
      padding: 2rem 2.4rem;
      line-height: 1.75;
      font-size: 0.94rem;
      color: var(--texto-suave);
    }
    /* Estilos del HTML generado por el traductor de Markdown.
       Como ese HTML se inyecta con [innerHTML], Angular no le pone
       sus marcas de encapsulacion de estilos — ::ng-deep hace que
       estos selectores lo alcancen de todas formas. */
    .documento ::ng-deep h1 {
      font-size: 1.5rem;
      color: var(--dorado);
      margin-bottom: 1rem;
    }
    .documento ::ng-deep h2 {
      font-size: 1.1rem;
      color: var(--texto);
      margin: 1.6rem 0 0.6rem;
    }
    .documento ::ng-deep h3 {
      font-size: 0.98rem;
      color: var(--texto);
      margin: 1.2rem 0 0.4rem;
    }
    .documento ::ng-deep p { margin-bottom: 0.8rem; }
    .documento ::ng-deep ul { margin: 0.4rem 0 0.9rem 1.4rem; }
    .documento ::ng-deep li { margin-bottom: 0.3rem; }
    .documento ::ng-deep strong { color: var(--texto); }
  `
})
export class Terminos {

  private legal = inject(LegalService);

  cargando = signal(true);
  html = signal('');

  constructor() {
    this.legal.getTerminos().subscribe({
      next: (doc) => {
        this.html.set(markdownAHtml(doc.content));
        this.cargando.set(false);
      },
      error: () => {
        this.html.set('<p>No se pudieron cargar los términos. Intenta más tarde.</p>');
        this.cargando.set(false);
      }
    });
  }
}
