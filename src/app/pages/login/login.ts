// ============================================================
// LOGIN / CREAR CUENTA — la pagina a la que lleva "Ingresar" del
// header y a la que redirigen las paginas que requieren sesion.
//
// Soporta "volver": si llegaste aqui intentando entrar a una
// pagina protegida (ej: /vender), al iniciar sesion te devuelve
// alla en vez de dejarte en el inicio. Viaja como query param:
//   /login?volver=/vender
// ============================================================
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <section class="acceso-pagina">
      <!-- Aviso de contexto: le explica al cliente POR QUE llego aqui
           (ej: intento entrar a "Vende tu coleccion" sin sesion) -->
      @if (mensajeContexto()) {
        <p class="contexto">🔒 {{ mensajeContexto() }}</p>
      }
      <div class="panel tarjeta">
        <div class="tabs">
          <button [class.activo]="modo() === 'login'"
                  (click)="cambiarModo('login')">Ingresar</button>
          <button [class.activo]="modo() === 'registro'"
                  (click)="cambiarModo('registro')">Crear cuenta</button>
        </div>

        @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }
        @if (error()) { <p class="error">{{ error() }}</p> }

        @if (modo() === 'login') {
          <form (ngSubmit)="ingresar()">
            <label>Email
              <input type="email" name="email" required
                     [ngModel]="email()" (ngModelChange)="email.set($event)">
            </label>
            <label>Contraseña
              <input type="password" name="password" required
                     [ngModel]="password()" (ngModelChange)="password.set($event)">
            </label>
            <button class="btn-dorado enviar" [disabled]="cargando()">
              {{ cargando() ? 'Ingresando…' : 'Ingresar' }}
            </button>
          </form>
        } @else {
          <form (ngSubmit)="crearCuenta()">
            <label>Nombre completo
              <input type="text" name="nombre" required
                     [ngModel]="regNombre()" (ngModelChange)="regNombre.set($event)">
            </label>
            <label>Email
              <input type="email" name="regEmail" required
                     [ngModel]="regEmail()" (ngModelChange)="regEmail.set($event)">
            </label>
            <div class="fila-doble">
              <label>Contraseña
                <input type="password" name="regPassword" required
                       [ngModel]="regPassword()" (ngModelChange)="regPassword.set($event)">
              </label>
              <label>Confirmar contraseña
                <input type="password" name="regConfirm" required
                       [ngModel]="regConfirm()" (ngModelChange)="regConfirm.set($event)">
              </label>
            </div>
            <div class="fila-doble">
              <label>Celular
                <input type="tel" name="regTelefono" required placeholder="3001234567"
                       [ngModel]="regTelefono()" (ngModelChange)="regTelefono.set($event)">
              </label>
              <label>Ciudad
                <input type="text" name="regCiudad" required placeholder="Armenia"
                       [ngModel]="regCiudad()" (ngModelChange)="regCiudad.set($event)">
              </label>
            </div>
            <button class="btn-dorado enviar" [disabled]="cargando()">
              {{ cargando() ? 'Creando cuenta…' : 'Crear cuenta' }}
            </button>
            <p class="nota">Te llegará un correo para verificar la cuenta antes de poder ingresar.</p>
          </form>
        }
      </div>
    </section>
  `,
  styles: `
    /* Fondo de la pagina: arte de Liliana of the Veil (Steve Argyle,
       imagen servida por Scryfall, la misma fuente del catalogo),
       oscurecida con un degradado para que el formulario se lea bien
       y se funda con el negro de la marca hacia abajo */
    .acceso-pagina {
      min-height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
      background:
        linear-gradient(180deg,
          rgba(10, 10, 12, 0.78) 0%,
          rgba(10, 10, 12, 0.88) 55%,
          #0d0d0d 100%),
        url('https://cards.scryfall.io/art_crop/front/e/f/efbb7256-9337-4183-8bda-a419f3f2c501.jpg?1782726481')
        center 22% / cover no-repeat;
    }
    .contexto {
      color: var(--dorado);
      font-size: 0.92rem;
      font-weight: 600;
      margin-bottom: 1rem;
      text-align: center;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
    }
    .tarjeta {
      width: min(480px, 100%);
      padding: 1.5rem 1.6rem;
      background: rgba(14, 14, 17, 0.9);   /* semitransparente sobre el arte */
      backdrop-filter: blur(4px);
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.2rem;
    }
    .tabs button {
      flex: 1;
      padding: 0.6rem;
      background: transparent;
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto-suave);
      font-family: var(--fuente-titulos);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tabs button.activo {
      border-color: var(--dorado);
      color: var(--dorado);
      background: rgba(212, 175, 55, 0.08);
    }

    form { display: flex; flex-direction: column; gap: 0.9rem; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: var(--texto-suave);
    }
    input {
      /* width 100% + border-box: el campo ocupa EXACTAMENTE su columna.
         Sin esto, los input usan su ancho "natural" del navegador y se
         salen de la tarjeta en las filas de dos columnas */
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
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
    /* min-width 0: permite que las celdas de la grilla se encojan
       (por defecto una celda nunca se hace mas chica que su contenido) */
    .fila-doble label { min-width: 0; }
    .enviar { margin-top: 0.4rem; }
    .enviar:disabled { opacity: 0.55; cursor: not-allowed; }
    .nota { font-size: 0.8rem; color: var(--texto-suave); line-height: 1.5; }

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
export class Login {

  private auth = inject(AuthService);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);

  modo = signal<'login' | 'registro'>('login');
  cargando = signal(false);
  error = signal('');
  aviso = signal('');

  // Mensaje segun de DONDE venia el cliente (query param ?volver=)
  mensajeContexto = computed(() => {
    const volver = this.ruta.snapshot.queryParamMap.get('volver') ?? '';
    if (volver.startsWith('/vender')) {
      return 'Para vender tu colección primero debes iniciar sesión.';
    }
    if (volver.startsWith('/cuenta')) {
      return 'Para ver tu cuenta primero debes iniciar sesión.';
    }
    return '';
  });

  email = signal('');
  password = signal('');

  regNombre = signal('');
  regEmail = signal('');
  regPassword = signal('');
  regConfirm = signal('');
  regTelefono = signal('');
  regCiudad = signal('');

  cambiarModo(m: 'login' | 'registro') {
    this.modo.set(m);
    this.error.set('');
  }

  ingresar() {
    this.error.set('');
    this.cargando.set(true);
    this.auth.login(this.email(), this.password()).subscribe({
      next: () => {
        // Vuelve a la pagina que pidio el login (?volver=...) o al inicio
        const volver = this.ruta.snapshot.queryParamMap.get('volver') ?? '/';
        this.router.navigateByUrl(volver);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo ingresar. Intenta de nuevo.');
      }
    });
  }

  crearCuenta() {
    this.error.set('');
    if (this.regPassword() !== this.regConfirm()) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }
    this.cargando.set(true);
    this.auth.registrar({
      name: this.regNombre(),
      email: this.regEmail(),
      password: this.regPassword(),
      confirmPassword: this.regConfirm(),
      phone: this.regTelefono(),
      city: this.regCiudad()
    }).subscribe({
      next: (r) => {
        this.cargando.set(false);
        this.aviso.set(r.mensaje + ' Cuando la verifiques, ingresa aquí.');
        this.modo.set('login');
        this.email.set(this.regEmail());
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo crear la cuenta. Intenta de nuevo.');
      }
    });
  }
}
