// ============================================================
// LOGIN / CREAR CUENTA — la pagina a la que lleva "Ingresar" del
// header y a la que redirigen las paginas que requieren sesion.
//
// Soporta "volver": si llegaste aqui intentando entrar a una
// pagina protegida (ej: /vender), al iniciar sesion te devuelve
// alla en vez de dejarte en el inicio. Viaja como query param:
//   /login?volver=/vender
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <section class="acceso-pagina">
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
    .acceso-pagina {
      max-width: 480px;
      margin: 0 auto;
      padding: 3rem 2rem;
    }
    .tarjeta { padding: 1.5rem 1.6rem; }

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
