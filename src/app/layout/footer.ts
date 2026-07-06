// ============================================================
// FOOTER: pie de pagina de toda la tienda.
// Icono monocromatico + tagline + contacto + link a terminos.
// ============================================================
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <hr class="separador-dorado">
      <div class="contenido">
        <div class="bloque-marca">
          <img src="logo/icono-mono.png" alt="ManaCore" class="icono">
          <p class="tagline">EVERY CARD MATTERS</p>
        </div>

        <div class="bloque">
          <h4>Tienda</h4>
          <a routerLink="/catalogo">Catálogo</a>
          <a routerLink="/tokens">Tokens</a>
          <a routerLink="/vender">Vende tu colección</a>
        </div>

        <div class="bloque">
          <h4>Ayuda</h4>
          <a routerLink="/terminos">Términos y condiciones</a>
          <a href="mailto:manacore.store@gmail.com">manacore.store&#64;gmail.com</a>
          <span class="nota">Entregas a domicilio en Armenia:<br>escríbenos al correo</span>
        </div>
      </div>
      <p class="legal">
        © 2026 ManaCore TCG — Armenia, Quindío, Colombia.<br>
        Magic: The Gathering es propiedad de Wizards of the Coast.
        ManaCore TCG no está afiliada a Wizards of the Coast.
      </p>
    </footer>
  `,
  styles: `
    .footer {
      margin-top: 4rem;
      padding: 0 2rem 2rem;
    }
    .contenido {
      display: flex;
      justify-content: center;
      gap: 5rem;
      flex-wrap: wrap;
      padding: 1rem 0 2rem;
    }
    .bloque-marca {
      text-align: center;
    }
    .icono {
      height: 84px;
      opacity: 0.85;
    }
    .tagline {
      font-family: var(--fuente-titulos);
      font-size: 0.7rem;
      letter-spacing: 0.35em;
      color: var(--texto-suave);
      margin-top: 0.5rem;
    }
    .bloque {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .bloque h4 {
      font-size: 0.95rem;
      margin-bottom: 0.4rem;
    }
    .bloque a {
      color: var(--texto-suave);
      font-size: 0.9rem;
    }
    .bloque a:hover {
      color: var(--dorado);
    }
    .nota {
      color: var(--texto-suave);
      font-size: 0.8rem;
      margin-top: 0.4rem;
    }
    .legal {
      text-align: center;
      color: var(--texto-suave);
      font-size: 0.75rem;
      opacity: 0.7;
    }
  `
})
export class Footer {}
