// ============================================================
// CHECKOUT — pagina de finalizar compra. Tiene 3 estados:
//   1. Carrito vacio  -> invita a ir al catalogo
//   2. Sin sesion     -> login / crear cuenta AQUI MISMO (inline),
//                        sin sacar al cliente de la compra
//   3. Con sesion     -> datos de envio (ciudad precargada del
//                        perfil) y boton de pago
// El pago real con MercadoPago se conecta en el siguiente paso.
// ============================================================
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarritoService } from '../../core/carrito.service';
import { AuthService, Perfil } from '../../core/auth.service';
import { PedidoService } from '../../core/pedido.service';

// Costo de envio informativo (el valor REAL lo calcula el backend
// al crear el pedido, desde store_config). Si el dueño cambia la
// tarifa en la BD, actualizar aqui tambien.
const ENVIO_NACIONAL = 23000;
const CIUDAD_LOCAL = 'armenia';

@Component({
  selector: 'app-checkout',
  imports: [RouterLink, FormsModule],
  template: `
    <!-- Fondo: Karn Liberated -->
    <section class="checkout fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/4/b/4b0c6662-4dde-40a2-97e0-0318478c0367.jpg?1782744061')">
      <h1>Finalizar compra</h1>

      @if (carrito.items().length === 0) {
        <p class="vacio">
          Tu carrito está vacío.<br>
          <a routerLink="/catalogo" class="btn-dorado">Ir al catálogo</a>
        </p>
      } @else {

        <!-- ==================== RESUMEN ==================== -->
        <div class="resumen panel">
          <h2>Resumen del pedido</h2>
          @for (item of carrito.items(); track item.variantId) {
            <div class="linea">
              <span>{{ item.cantidad }}× {{ item.nombre }}
                <em>({{ item.finish }} · {{ item.language.toUpperCase() }})</em>
              </span>
              <span class="linea-precio">{{ formato(item.precio * item.cantidad) }}</span>
            </div>
          }
          <hr class="separador-dorado">
          <div class="linea">
            <span>Subtotal ({{ carrito.cantidadTotal() }} cartas)</span>
            <span class="linea-precio">{{ formato(carrito.total()) }}</span>
          </div>
          @if (auth.logueado()) {
            <div class="linea">
              <span>Envío {{ ciudadEfectiva().trim() ? 'a ' + ciudadEfectiva() : '' }}</span>
              <span class="linea-precio">
                {{ costoEnvio() === 0 ? 'Gratis 🎉' : formato(costoEnvio()) }}
              </span>
            </div>
            <div class="linea total">
              <span>Total a pagar</span>
              <span class="linea-precio">{{ formato(carrito.total() + costoEnvio()) }}</span>
            </div>
          }
        </div>

        @if (!auth.logueado()) {
          <!-- ==================== ACCESO ==================== -->
          <div class="acceso panel">
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
                  {{ cargando() ? 'Ingresando…' : 'Ingresar y continuar' }}
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
                <p class="nota">Te llegará un correo para verificar la cuenta.
                   Después vuelves aquí e ingresas — tu carrito te espera.</p>
              </form>
            }
          </div>
        } @else {
          <!-- ==================== ENVIO ==================== -->
          <div class="envio panel">
            <h2>Datos de envío</h2>
            <p class="comprando-como">Comprando como
              <strong>{{ auth.nombre() }}</strong> ({{ auth.sesion()?.email }})</p>

            @if (avisoDireccion()) { <p class="aviso">{{ avisoDireccion() }}</p> }

            @if (tieneDireccionGuardada()) {
              <!-- Cliente frecuente: elige entre su direccion guardada
                   o escribir una distinta para ESTE pedido -->
              <label class="opcion-direccion" [class.elegida]="modoDireccion() === 'guardada'">
                <input type="radio" name="modoDireccion" value="guardada"
                       [checked]="modoDireccion() === 'guardada'"
                       (change)="modoDireccion.set('guardada')">
                <span class="opcion-texto">
                  <strong>Mi dirección guardada</strong>
                  <span>{{ perfil()!.address }} — {{ perfil()!.city }}</span>
                  @if (perfil()!.addressNotes) {
                    <em>{{ perfil()!.addressNotes }}</em>
                  }
                </span>
              </label>
              <label class="opcion-direccion" [class.elegida]="modoDireccion() === 'otra'">
                <input type="radio" name="modoDireccion" value="otra"
                       [checked]="modoDireccion() === 'otra'"
                       (change)="modoDireccion.set('otra')">
                <span class="opcion-texto"><strong>Enviar a otra dirección</strong></span>
              </label>
            }

            @if (!tieneDireccionGuardada() || modoDireccion() === 'otra') {
              <div class="form-direccion">
                <label>Dirección de entrega
                  <input type="text" name="direccion" required
                         placeholder="Calle 10 # 14-23, Apto 201, Barrio..."
                         [ngModel]="direccion()" (ngModelChange)="direccion.set($event)">
                </label>
                <label>Ciudad
                  <input type="text" name="ciudad" required
                         [ngModel]="ciudad()" (ngModelChange)="ciudad.set($event)">
                </label>
                <!-- Compradores frecuentes: un clic y la proxima compra
                     ya tiene la direccion lista -->
                <!-- Requiere el perfil cargado: la actualizacion manda el
                     perfil completo y sin el se borrarian otros campos -->
                <button type="button" class="btn-fantasma btn-guardar"
                        [disabled]="guardandoDireccion() || !perfil() || !direccion().trim() || !ciudad().trim()"
                        (click)="guardarDireccion()">
                  {{ guardandoDireccion() ? 'Guardando…' : '💾 Guardar como mi dirección predeterminada' }}
                </button>
              </div>
            }

            <label class="campo-notas">Notas del envío (opcional)
              <textarea name="notas" rows="2"
                        placeholder="Ej: dejar en portería, llamar al llegar, timbre dañado..."
                        [ngModel]="notas()" (ngModelChange)="notas.set($event)"></textarea>
            </label>

            <p class="nota">📦 Envío gratis en Armenia · {{ formato(envioNacional) }} al resto del país (se paga una sola vez por pedido)</p>

            @if (errorPago()) { <p class="error">{{ errorPago() }}</p> }

            <!-- Crea el pedido y redirige a la pagina de pago de
                 MercadoPago (PSE, tarjeta, Nequi...) -->
            <button class="btn-dorado enviar"
                    [disabled]="pagando() || !puedePagar()"
                    (click)="pagar()">
              {{ pagando() ? 'Preparando tu pago…' : '🔒 Pagar con MercadoPago' }}
            </button>
            @if (!puedePagar() && !pagando()) {
              <p class="nota proximo">Completa la dirección y la ciudad para continuar.</p>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .checkout {
      max-width: 700px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    h1 { text-align: center; font-size: 1.6rem; margin-bottom: 1.6rem; }
    .vacio { text-align: center; color: var(--texto-suave); line-height: 3; }
    .resumen, .acceso, .envio { padding: 1.3rem 1.5rem; margin-bottom: 1.2rem; }
    .resumen h2, .envio h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .linea {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.4rem 0;
      font-size: 0.92rem;
    }
    .linea em { color: var(--texto-suave); font-style: normal; font-size: 0.8rem; }
    .linea-precio { color: var(--dorado); font-weight: 600; white-space: nowrap; }
    .linea.total { font-family: var(--fuente-titulos); font-size: 1.1rem; }

    /* Pestanas Ingresar / Crear cuenta */
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

    .comprando-como {
      font-size: 0.88rem;
      color: var(--texto-suave);
      margin-bottom: 1rem;
    }
    .comprando-como strong { color: var(--dorado); }

    /* Tarjetas de eleccion de direccion (guardada / otra) */
    .opcion-direccion {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 0.7rem;
      padding: 0.8rem 1rem;
      margin-bottom: 0.7rem;
      border: 1px solid var(--negro-borde);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .opcion-direccion.elegida {
      border-color: var(--dorado);
      background: rgba(212, 175, 55, 0.06);
    }
    .opcion-direccion input[type="radio"] {
      accent-color: var(--dorado);
      margin-top: 0.2rem;
    }
    .opcion-texto {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.88rem;
    }
    .opcion-texto strong { color: var(--texto); }
    .opcion-texto span:not(.opcion-texto) { color: var(--texto-suave); }
    .opcion-texto em {
      color: var(--texto-suave);
      font-style: italic;
      font-size: 0.8rem;
    }

    .form-direccion {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      margin-bottom: 0.9rem;
    }
    .btn-guardar {
      align-self: flex-start;
      font-size: 0.8rem;
      padding: 0.45rem 0.9rem;
    }
    .btn-guardar:disabled { opacity: 0.45; cursor: not-allowed; }

    .campo-notas { margin-bottom: 0.9rem; }
    textarea {
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 8px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.92rem;
      padding: 0.6rem 0.8rem;
      outline: none;
      resize: vertical;
      transition: border-color 0.15s;
    }
    textarea:focus { border-color: var(--dorado); }
    .nota { font-size: 0.8rem; color: var(--texto-suave); line-height: 1.5; }
    .proximo { opacity: 0.7; margin-top: 0.4rem; }

    /* Mensajes de exito y error */
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
export class Checkout {
  carrito = inject(CarritoService);
  auth = inject(AuthService);
  private pedidos = inject(PedidoService);

  envioNacional = ENVIO_NACIONAL;

  // 'login' o 'registro': cual pestana esta activa
  modo = signal<'login' | 'registro'>('login');
  cargando = signal(false);
  error = signal('');
  aviso = signal('');

  // Campos del login
  email = signal('');
  password = signal('');

  // Campos del registro
  regNombre = signal('');
  regEmail = signal('');
  regPassword = signal('');
  regConfirm = signal('');
  regTelefono = signal('');
  regCiudad = signal('');

  // Datos de envio (cuando se usa "otra direccion" o no hay guardada)
  direccion = signal('');
  ciudad = signal('');
  // Observaciones del envio: "dejar en porteria", "timbre danado"...
  notas = signal('');

  // Perfil completo (trae la direccion predeterminada guardada)
  perfil = signal<Perfil | null>(null);
  // 'guardada' = usar la direccion del perfil | 'otra' = escribir una
  modoDireccion = signal<'guardada' | 'otra'>('otra');
  guardandoDireccion = signal(false);
  avisoDireccion = signal('');

  // true si el perfil tiene una direccion completa guardada
  tieneDireccionGuardada = computed(() => {
    const p = this.perfil();
    return !!(p?.address?.trim() && p?.city?.trim());
  });

  // La direccion/ciudad que REALMENTE se usaran para el pedido,
  // segun si el cliente eligio la guardada o escribio otra
  direccionEfectiva = computed(() =>
    this.modoDireccion() === 'guardada' && this.tieneDireccionGuardada()
      ? this.perfil()!.address!
      : this.direccion());
  ciudadEfectiva = computed(() =>
    this.modoDireccion() === 'guardada' && this.tieneDireccionGuardada()
      ? this.perfil()!.city!
      : this.ciudad());

  // Envio informativo: gratis en la ciudad local, tarifa nacional
  // en el resto (el valor final lo confirma el backend al crear
  // el pedido)
  costoEnvio = computed(() =>
    this.ciudadEfectiva().trim().toLowerCase() === CIUDAD_LOCAL ? 0 : ENVIO_NACIONAL);

  // Estado del pago
  pagando = signal(false);
  errorPago = signal('');

  // El boton de pagar se habilita cuando hay direccion y ciudad
  // (la guardada del perfil o la escrita a mano)
  puedePagar = computed(() =>
    !!this.direccionEfectiva().trim() && !!this.ciudadEfectiva().trim());

  constructor() {
    // Cuando aparece la sesion (login exitoso o ya venia guardada),
    // se carga el perfil completo para precargar la direccion de envio
    effect(() => {
      if (this.auth.logueado() && !this.perfil()) {
        this.cargarPerfil();
      }
    });
  }

  private cargarPerfil() {
    this.auth.getPerfil().subscribe({
      next: (p) => {
        this.perfil.set(p);
        // Si hay direccion guardada, queda seleccionada por defecto;
        // si no, se precarga al menos la ciudad del registro
        if (p.address?.trim() && p.city?.trim()) {
          this.modoDireccion.set('guardada');
        } else if (p.city && !this.ciudad().trim()) {
          this.ciudad.set(p.city);
        }
      },
      // Si el backend aun no tiene GET /perfil (falta reiniciar),
      // el checkout sigue funcionando con direccion manual
      error: () => this.perfil.set(null)
    });
  }

  // Guarda la direccion escrita como predeterminada del perfil.
  // El backend reemplaza TODOS los campos del perfil, por eso se
  // manda el perfil completo con la direccion nueva encima.
  guardarDireccion() {
    const p = this.perfil();
    if (!p || !this.direccion().trim() || !this.ciudad().trim()) return;
    this.guardandoDireccion.set(true);
    this.auth.actualizarPerfil({
      ...p,
      address: this.direccion(),
      city: this.ciudad(),
      addressNotes: this.notas() || p.addressNotes
    }).subscribe({
      next: (actualizado) => {
        this.perfil.set(actualizado);
        this.modoDireccion.set('guardada');
        this.guardandoDireccion.set(false);
        this.avisoDireccion.set('Dirección guardada en tu perfil ✔ — la próxima compra ya estará lista.');
      },
      error: () => {
        this.guardandoDireccion.set(false);
        this.avisoDireccion.set('No se pudo guardar la dirección. Intenta de nuevo.');
      }
    });
  }

  cambiarModo(m: 'login' | 'registro') {
    this.modo.set(m);
    this.error.set('');
  }

  ingresar() {
    this.error.set('');
    this.cargando.set(true);
    this.auth.login(this.email(), this.password()).subscribe({
      // El exito no necesita hacer nada mas: auth.logueado() cambia
      // y la plantilla pasa sola al formulario de envio
      next: () => this.cargando.set(false),
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
        // La cuenta requiere verificar el email; se lleva al usuario
        // a la pestana de login con el aviso de revisar el correo
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

  // EL PASO FINAL: crea el pedido en el backend y redirige a la
  // pagina de pago de MercadoPago. Dos llamadas encadenadas:
  //   1. crearPedido  -> devuelve el orderNumber
  //   2. crearCheckout(orderNumber) -> devuelve el initPoint
  // Justo antes de salir se vacia el carrito: el pedido ya quedo
  // registrado en el backend y esa es la fuente de verdad.
  pagar() {
    if (!this.puedePagar() || this.pagando()) return;
    this.errorPago.set('');
    this.pagando.set(true);

    this.pedidos.crearPedido({
      shippingAddress: this.direccionEfectiva(),
      shippingCity: this.ciudadEfectiva(),
      notes: this.notas().trim() || undefined,
      items: this.carrito.items().map(i => ({
        variantId: i.variantId,
        quantity: i.cantidad
      }))
    }).subscribe({
      next: (pedido) => {
        this.pedidos.crearCheckout(pedido.orderNumber).subscribe({
          next: (checkout) => {
            this.carrito.vaciar();
            // Salimos de la app hacia MercadoPago. Al terminar, el
            // cliente vuelve a /pago/exitoso|pendiente|fallido
            // (backUrls configuradas en el backend)
            window.location.href = checkout.initPoint;
          },
          error: (e) => {
            this.pagando.set(false);
            this.errorPago.set(e.error?.error
              ?? 'El pedido quedó creado pero no se pudo iniciar el pago. Intenta de nuevo.');
          }
        });
      },
      error: (e) => {
        this.pagando.set(false);
        // El backend explica el problema (ej: "Stock insuficiente para...")
        this.errorPago.set(e.error?.error ?? 'No se pudo crear el pedido. Intenta de nuevo.');
      }
    });
  }

  formato(cop: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(cop);
  }
}
