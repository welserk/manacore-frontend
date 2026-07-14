// ============================================================
// PANEL ADMIN — USUARIOS
// Dos grupos:
//   - CLIENTES: los compradores registrados. Se pueden BLOQUEAR
//     (no podran iniciar sesion) y reactivar.
//   - EQUIPO DE ENVIOS (SHIPPER): las cuentas de los empleados
//     que despachan. El admin las crea aqui (quedan activas de
//     una, sin verificacion de email) y les entrega el email y
//     la contraseña. El shipper solo ve pedidos por enviar.
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, UsuarioAdmin } from '../../core/admin.service';
import { PanelNav } from './panel-nav';

@Component({
  selector: 'app-admin-usuarios',
  imports: [PanelNav, FormsModule],
  template: `
    <!-- Fondo: Saheeli Rai (el mismo del panel) -->
    <section class="usuarios-admin fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/9/4/94b38464-39cd-4ee6-b9bf-a0bc1e128d9a.jpg?1782711513')">
      <p class="miga">PANEL MANACORE</p>
      <h1>Usuarios</h1>

      <app-panel-nav />

      <!-- ============ EQUIPO DE ENVIOS ============ -->
      <div class="panel tarjeta">
        <h2>Equipo de envíos ({{ shippers().length }})</h2>
        <p class="pista">Cuentas para tus empleados de despacho. Solo ven los
          pedidos pagados por enviar y los marcan como enviados — sin acceso a
          precios, clientes ni configuración.</p>

        @if (avisoShipper()) { <p class="aviso">{{ avisoShipper() }}</p> }
        @if (errorShipper()) { <p class="error">{{ errorShipper() }}</p> }

        @for (s of shippers(); track s.id) {
          <div class="fila-usuario">
            <div class="info">
              <span class="nombre">{{ s.name }}</span>
              <span class="detalle">{{ s.email }}</span>
            </div>
            <span class="insignia" [style.--color-estado]="s.active ? '#52c98a' : '#d3202a'">
              {{ s.active ? 'Activa' : 'Bloqueada' }}
            </span>
            <button class="btn-fantasma btn-mini"
                    [disabled]="trabajandoId() === s.id"
                    (click)="alternarEstado(s)">
              {{ s.active ? 'Bloquear' : 'Reactivar' }}
            </button>
          </div>
        }

        <!-- Crear cuenta de shipper -->
        <div class="crear-shipper">
          <span class="nueva-titulo">＋ Cuenta nueva:</span>
          <input type="text" placeholder="Nombre"
                 [ngModel]="nvNombre()" (ngModelChange)="nvNombre.set($event)"
                 [ngModelOptions]="{ standalone: true }">
          <input type="email" placeholder="email@ejemplo.com"
                 [ngModel]="nvEmail()" (ngModelChange)="nvEmail.set($event)"
                 [ngModelOptions]="{ standalone: true }">
          <input type="text" placeholder="Contraseña"
                 [ngModel]="nvPassword()" (ngModelChange)="nvPassword.set($event)"
                 [ngModelOptions]="{ standalone: true }">
          <button class="btn-dorado btn-crear"
                  [disabled]="creando() || !nvNombre().trim() || !nvEmail().trim() || nvPassword().length < 6"
                  (click)="crearShipper()">
            {{ creando() ? 'Creando…' : 'Crear' }}
          </button>
        </div>
        <p class="pista">La contraseña debe tener al menos 6 caracteres.
          Entrégale las credenciales al empleado: con ellas inicia sesión normal.</p>
      </div>

      <!-- ============ CLIENTES ============ -->
      <div class="panel tarjeta">
        <h2>Clientes ({{ clientes().length }})</h2>

        @if (errorClientes()) { <p class="error">{{ errorClientes() }}</p> }

        @if (cargando()) {
          <p class="vacio-mini">Cargando clientes…</p>
        } @else if (clientes().length === 0) {
          <p class="vacio-mini">Aún no hay clientes registrados.</p>
        } @else {
          @for (c of clientes(); track c.id) {
            <div class="fila-usuario">
              <div class="info">
                <span class="nombre">{{ c.name }}</span>
                <span class="detalle">{{ c.email }}
                  @if (c.phone) { · 📱 {{ c.phone }} }
                  @if (c.city)  { · 📍 {{ c.city }} }
                  · registrado {{ fecha(c.createdAt) }}
                </span>
              </div>
              <span class="insignia" [style.--color-estado]="c.active ? '#52c98a' : '#d3202a'">
                {{ c.active ? 'Activa' : 'Bloqueada' }}
              </span>
              <button class="btn-fantasma btn-mini"
                      [disabled]="trabajandoId() === c.id"
                      (click)="alternarEstado(c)">
                {{ trabajandoId() === c.id ? '…' : (c.active ? 'Bloquear' : 'Reactivar') }}
              </button>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .usuarios-admin {
      max-width: 780px;
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

    .tarjeta { padding: 1.2rem 1.4rem; margin-bottom: 1rem; }
    h2 { font-size: 1.05rem; margin-bottom: 0.6rem; }
    .pista { font-size: 0.82rem; color: var(--texto-suave); line-height: 1.5; margin-bottom: 0.9rem; }
    .vacio-mini { color: var(--texto-suave); font-size: 0.88rem; padding: 0.6rem 0; }

    .fila-usuario {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.6rem 0;
      border-top: 1px solid var(--negro-borde);
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .nombre { font-weight: 600; color: var(--texto); font-size: 0.92rem; }
    .detalle {
      color: var(--texto-suave);
      font-size: 0.78rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.2rem 0.8rem;
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-mini { padding: 0.35rem 0.9rem; font-size: 0.78rem; flex-shrink: 0; }
    .btn-mini:disabled { opacity: 0.4; cursor: not-allowed; }

    .crear-shipper {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
      margin-top: 0.9rem;
      padding-top: 0.9rem;
      border-top: 1px dashed var(--negro-borde);
    }
    .nueva-titulo { color: var(--texto-suave); font-size: 0.82rem; }
    .crear-shipper input {
      flex: 1;
      min-width: 140px;
      box-sizing: border-box;
      background: var(--negro);
      border: 1px solid var(--negro-borde);
      border-radius: 6px;
      color: var(--texto);
      font-family: var(--fuente-cuerpo);
      font-size: 0.85rem;
      padding: 0.45rem 0.6rem;
      outline: none;
    }
    .crear-shipper input:focus { border-color: var(--dorado); }
    .btn-crear { padding: 0.45rem 1.1rem; font-size: 0.82rem; }
    .btn-crear:disabled { opacity: 0.5; cursor: not-allowed; }

    .aviso {
      background: rgba(0, 115, 62, 0.15);
      border: 1px solid #00733e;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.84rem;
      margin-bottom: 0.8rem;
      line-height: 1.5;
    }
    .error {
      background: rgba(211, 32, 42, 0.12);
      border: 1px solid #d3202a;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.84rem;
      margin-bottom: 0.8rem;
    }
  `
})
export class AdminUsuarios {

  private admin = inject(AdminService);

  clientes = signal<UsuarioAdmin[]>([]);
  shippers = signal<UsuarioAdmin[]>([]);
  cargando = signal(true);
  trabajandoId = signal<number | null>(null);
  errorClientes = signal('');

  // Crear shipper
  nvNombre = signal('');
  nvEmail = signal('');
  nvPassword = signal('');
  creando = signal(false);
  avisoShipper = signal('');
  errorShipper = signal('');

  constructor() {
    this.cargar();
  }

  private cargar() {
    // El filtro por rol tambien se aplica AQUI (ademas del backend):
    // asi, aunque el backend corriendo sea anterior al parametro "rol",
    // jamas se mezclan clientes con el equipo de envios
    this.admin.getUsuarios('CUSTOMER').subscribe({
      next: (lista) => {
        this.clientes.set(lista.filter(u => u.role === 'CUSTOMER'));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorClientes.set('No se pudieron cargar los clientes.');
      }
    });
    this.admin.getUsuarios('SHIPPER').subscribe({
      next: (lista) => this.shippers.set(lista.filter(u => u.role === 'SHIPPER')),
      error: () => {}
    });
  }

  // Bloquea o reactiva la cuenta (bloquear pide confirmacion:
  // el cliente no podra iniciar sesion hasta reactivarlo)
  alternarEstado(u: UsuarioAdmin) {
    if (u.active && !confirm(`¿Bloquear la cuenta de ${u.name}? No podrá iniciar sesión hasta que la reactives.`)) {
      return;
    }
    this.trabajandoId.set(u.id);
    this.admin.toggleUsuario(u.id, !u.active).subscribe({
      next: (actualizado) => {
        this.trabajandoId.set(null);
        const refrescar = (lista: UsuarioAdmin[]) =>
          lista.map(x => x.id === actualizado.id ? actualizado : x);
        this.clientes.update(refrescar);
        this.shippers.update(refrescar);
      },
      error: () => this.trabajandoId.set(null)
    });
  }

  crearShipper() {
    this.avisoShipper.set('');
    this.errorShipper.set('');
    this.creando.set(true);
    this.admin.crearTrabajador(this.nvNombre().trim(), this.nvEmail().trim(),
        this.nvPassword()).subscribe({
      next: (r) => {
        this.creando.set(false);
        this.avisoShipper.set(`Cuenta creada ✔ — entrégale al empleado: email ${r.email} y la contraseña que escribiste.`);
        this.nvNombre.set('');
        this.nvEmail.set('');
        this.nvPassword.set('');
        this.cargar();
      },
      error: (e) => {
        this.creando.set(false);
        this.errorShipper.set(e.error?.error ?? 'No se pudo crear la cuenta.');
      }
    });
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
}
