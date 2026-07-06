// ============================================================
// MI CUENTA — el perfil del cliente. Tres tarjetas:
//   1. Mis datos: nombre, telefono y direccion de envio
//      predeterminada (la que el checkout precarga). Un solo
//      "Guardar" -> un solo PUT /api/auth/perfil.
//   2. Cambiar contrasena (exige la actual).
//   3. Cambiar email (llega un link de confirmacion AL CORREO
//      NUEVO; el actual sigue activo hasta confirmar).
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, Perfil } from '../../core/auth.service';

@Component({
  selector: 'app-cuenta',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Fondo: Ajani Goldmane -->
    <section class="cuenta fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/2/d/2d911053-a026-4b20-ba2d-dbcc367c1413.jpg?1782715436')">
      <h1>Mi cuenta</h1>

      <!-- Pestanas de la seccion de cuenta -->
      <nav class="tabs-cuenta">
        <a routerLink="/cuenta" [routerLinkActiveOptions]="{ exact: true }"
           routerLinkActive="activo">Mi perfil</a>
        <a routerLink="/cuenta/pedidos" routerLinkActive="activo">Mis pedidos</a>
      </nav>

      @if (!perfil()) {
        <p class="cargando">Cargando tu perfil…</p>
      } @else {

        <!-- ============== MIS DATOS ============== -->
        <div class="panel tarjeta">
          <h2>Mis datos</h2>
          <p class="email-actual">Email: <strong>{{ perfil()!.email }}</strong>
            <span class="pista">(se cambia más abajo)</span></p>

          @if (avisoDatos()) { <p class="aviso">{{ avisoDatos() }}</p> }

          <form (ngSubmit)="guardarDatos()">
            <div class="fila-doble">
              <label>Nombre completo
                <input type="text" name="nombre" required
                       [ngModel]="nombre()" (ngModelChange)="nombre.set($event)">
              </label>
              <label>Celular
                <input type="tel" name="telefono"
                       [ngModel]="telefono()" (ngModelChange)="telefono.set($event)">
              </label>
            </div>
            <label>Dirección de envío predeterminada
              <input type="text" name="direccion"
                     placeholder="Calle 10 # 14-23, Apto 201, Barrio..."
                     [ngModel]="direccion()" (ngModelChange)="direccion.set($event)">
            </label>
            <div class="fila-doble">
              <label>Ciudad
                <input type="text" name="ciudad" placeholder="Armenia"
                       [ngModel]="ciudad()" (ngModelChange)="ciudad.set($event)">
              </label>
              <label>Indicaciones de entrega
                <input type="text" name="notasDireccion"
                       placeholder="Apto 302, casa con reja azul..."
                       [ngModel]="notasDireccion()" (ngModelChange)="notasDireccion.set($event)">
              </label>
            </div>
            <button class="btn-dorado enviar" [disabled]="guardando() || !nombre().trim()">
              {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </form>
        </div>

        <!-- ============== CONTRASENA ============== -->
        <div class="panel tarjeta">
          <h2>Cambiar contraseña</h2>

          @if (avisoPassword()) { <p class="aviso">{{ avisoPassword() }}</p> }
          @if (errorPassword()) { <p class="error">{{ errorPassword() }}</p> }

          <form (ngSubmit)="guardarPassword()">
            <label>Contraseña actual
              <input type="password" name="passActual" required
                     [ngModel]="passActual()" (ngModelChange)="passActual.set($event)">
            </label>
            <div class="fila-doble">
              <label>Contraseña nueva
                <input type="password" name="passNueva" required
                       [ngModel]="passNueva()" (ngModelChange)="passNueva.set($event)">
              </label>
              <label>Confirmar contraseña nueva
                <input type="password" name="passConfirma" required
                       [ngModel]="passConfirma()" (ngModelChange)="passConfirma.set($event)">
              </label>
            </div>
            <button class="btn-dorado enviar"
                    [disabled]="cambiandoPass() || !passActual() || !passNueva()">
              {{ cambiandoPass() ? 'Cambiando…' : 'Cambiar contraseña' }}
            </button>
          </form>
        </div>

        <!-- ============== EMAIL ============== -->
        <div class="panel tarjeta">
          <h2>Cambiar email</h2>
          <p class="pista">Te enviaremos un enlace de confirmación <strong>al correo
            nuevo</strong>. Tu email actual sigue funcionando hasta que confirmes.</p>

          @if (avisoEmail()) { <p class="aviso">{{ avisoEmail() }}</p> }
          @if (errorEmail()) { <p class="error">{{ errorEmail() }}</p> }

          <form (ngSubmit)="pedirCambioEmail()">
            <div class="fila-doble">
              <label>Email nuevo
                <input type="email" name="emailNuevo" required
                       [ngModel]="emailNuevo()" (ngModelChange)="emailNuevo.set($event)">
              </label>
              <label>Tu contraseña (por seguridad)
                <input type="password" name="passEmail" required
                       [ngModel]="passEmail()" (ngModelChange)="passEmail.set($event)">
              </label>
            </div>
            <button class="btn-dorado enviar"
                    [disabled]="cambiandoEmail() || !emailNuevo().trim() || !passEmail()">
              {{ cambiandoEmail() ? 'Enviando…' : 'Solicitar cambio' }}
            </button>
          </form>
        </div>
      }
    </section>
  `,
  styles: `
    .cuenta {
      max-width: 720px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    h1 { text-align: center; font-size: 1.6rem; margin-bottom: 1.2rem; }
    .cargando { text-align: center; color: var(--texto-suave); padding: 2rem; }

    /* Pestanas Mi perfil / Mis pedidos (compartidas con mis-pedidos) */
    .tabs-cuenta {
      display: flex;
      justify-content: center;
      gap: 0.6rem;
      margin-bottom: 1.6rem;
    }
    .tabs-cuenta a {
      padding: 0.5rem 1.3rem;
      border: 1px solid var(--negro-borde);
      border-radius: 20px;
      color: var(--texto-suave);
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.15s;
    }
    .tabs-cuenta a.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    .tarjeta { padding: 1.3rem 1.5rem; margin-bottom: 1.2rem; }
    h2 { font-size: 1.1rem; margin-bottom: 0.9rem; }
    .email-actual { font-size: 0.88rem; color: var(--texto-suave); margin-bottom: 1rem; }
    .email-actual strong { color: var(--texto); }
    .pista { font-size: 0.8rem; color: var(--texto-suave); margin-bottom: 0.9rem; line-height: 1.5; }

    form { display: flex; flex-direction: column; gap: 0.9rem; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: var(--texto-suave);
    }
    input {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.95rem;
      padding: 0.6rem 0.8rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: var(--dorado); }
    .fila-doble {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
    }
    .enviar { align-self: flex-start; }
    .enviar:disabled { opacity: 0.55; cursor: not-allowed; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      line-height: 1.5;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
  `
})
export class Cuenta {

  private auth = inject(AuthService);

  perfil = signal<Perfil | null>(null);

  // Mis datos
  nombre = signal('');
  telefono = signal('');
  direccion = signal('');
  ciudad = signal('');
  notasDireccion = signal('');
  guardando = signal(false);
  avisoDatos = signal('');

  // Contrasena
  passActual = signal('');
  passNueva = signal('');
  passConfirma = signal('');
  cambiandoPass = signal(false);
  avisoPassword = signal('');
  errorPassword = signal('');

  // Email
  emailNuevo = signal('');
  passEmail = signal('');
  cambiandoEmail = signal(false);
  avisoEmail = signal('');
  errorEmail = signal('');

  constructor() {
    // Carga el perfil y precarga el formulario con los datos actuales
    this.auth.getPerfil().subscribe(p => {
      this.perfil.set(p);
      this.nombre.set(p.name);
      this.telefono.set(p.phone ?? '');
      this.direccion.set(p.address ?? '');
      this.ciudad.set(p.city ?? '');
      this.notasDireccion.set(p.addressNotes ?? '');
    });
  }

  // Un solo PUT con el perfil completo (el backend reemplaza todos
  // los campos editables con lo que llegue)
  guardarDatos() {
    const p = this.perfil();
    if (!p) return;
    this.avisoDatos.set('');
    this.guardando.set(true);
    this.auth.actualizarPerfil({
      ...p,
      name: this.nombre().trim(),
      phone: this.telefono().trim() || null,
      address: this.direccion().trim() || null,
      city: this.ciudad().trim() || null,
      addressNotes: this.notasDireccion().trim() || null
    }).subscribe({
      next: (actualizado) => {
        this.perfil.set(actualizado);
        this.guardando.set(false);
        this.avisoDatos.set('Datos guardados ✔');
      },
      error: (e) => {
        this.guardando.set(false);
        this.avisoDatos.set(e.error?.error ?? 'No se pudo guardar. Intenta de nuevo.');
      }
    });
  }

  guardarPassword() {
    this.avisoPassword.set('');
    this.errorPassword.set('');
    if (this.passNueva() !== this.passConfirma()) {
      this.errorPassword.set('Las contraseñas nuevas no coinciden');
      return;
    }
    this.cambiandoPass.set(true);
    this.auth.cambiarPassword(this.passActual(), this.passNueva()).subscribe({
      next: (r) => {
        this.cambiandoPass.set(false);
        this.avisoPassword.set(r.mensaje);
        this.passActual.set('');
        this.passNueva.set('');
        this.passConfirma.set('');
      },
      error: (e) => {
        this.cambiandoPass.set(false);
        this.errorPassword.set(e.error?.error ?? 'No se pudo cambiar la contraseña.');
      }
    });
  }

  pedirCambioEmail() {
    this.avisoEmail.set('');
    this.errorEmail.set('');
    this.cambiandoEmail.set(true);
    this.auth.cambiarEmail(this.emailNuevo().trim(), this.passEmail()).subscribe({
      next: (r) => {
        this.cambiandoEmail.set(false);
        this.avisoEmail.set(r.mensaje);
        this.emailNuevo.set('');
        this.passEmail.set('');
      },
      error: (e) => {
        this.cambiandoEmail.set(false);
        this.errorEmail.set(e.error?.error ?? 'No se pudo solicitar el cambio.');
      }
    });
  }
}
