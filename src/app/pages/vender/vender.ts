// ============================================================
// VENDE TU COLECCION — el cliente ofrece sus cartas a la tienda.
// Formulario: lista de cartas (texto libre), telefono/WhatsApp
// (precargado del perfil) y archivo adjunto OPCIONAL (foto de
// las cartas, Excel, CSV, PDF). Debajo: sus ofertas anteriores
// con el estado en que van (la tienda las revisa y lo contacta).
// Requiere sesion (ruta protegida por el guardia).
// ============================================================
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ColeccionService, OfertaColeccion } from '../../core/coleccion.service';
import { API_URL } from '../../core/catalogo.service';

// Como se ve cada estado de una oferta
const ESTADOS: Record<string, { texto: string; color: string }> = {
  PENDIENTE:  { texto: 'Pendiente de revisión', color: '#d4af37' },
  REVISADA:   { texto: 'Revisada',              color: '#5aa9e8' },
  CONTACTADO: { texto: 'Te contactamos',        color: '#52c98a' },
  RECHAZADA:  { texto: 'Rechazada',             color: '#d3202a' }
};

@Component({
  selector: 'app-vender',
  imports: [FormsModule],
  template: `
    <!-- Fondo: Nissa, Who Shakes the World -->
    <section class="vender fondo-arte"
             style="--arte-fondo: url('https://cards.scryfall.io/art_crop/front/f/8/f857bbe4-5619-4733-a0c7-69700f2ef4f3.jpg?1782708637')">
      <p class="miga">TIENDA</p>
      <h1>Vende tu colección</h1>
      <p class="explicacion">
        ¿Tienes cartas que ya no usas? Te las recibimos de dos formas:
        <strong>te las compramos</strong>, o <strong>las cambias por cartas de
        nuestro stock</strong> — tu colección se valora al <strong>70%</strong>
        de su precio para el intercambio. Cuéntanos qué tienes: pega la lista en
        el cuadro (una carta por línea, con la expansión si la sabes) y si
        quieres adjunta un Excel, PDF o archivo de texto con el detalle. La
        revisamos y te contactamos por WhatsApp con una oferta.
      </p>

      <div class="panel tarjeta">
        @if (aviso()) { <p class="aviso">{{ aviso() }}</p> }
        @if (error()) { <p class="error">{{ error() }}</p> }

        <form (ngSubmit)="enviar()">
          <label>Tu lista de cartas
            <textarea name="lista" rows="8" required
                      placeholder="4 Lightning Bolt (Secret Lair)&#10;1 Sol Ring foil&#10;2 Counterspell..."
                      [ngModel]="lista()" (ngModelChange)="lista.set($event)"></textarea>
          </label>
          <div class="fila-doble">
            <label>Teléfono o WhatsApp de contacto
              <input type="tel" name="telefono" required placeholder="3001234567"
                     [ngModel]="telefono()" (ngModelChange)="telefono.set($event)">
            </label>
            <label>Archivo adjunto (opcional: Excel, PDF o texto)
              <!-- El input file no se puede "bindear" con ngModel:
                   se lee el archivo elegido en el evento change.
                   Solo listas: Excel, CSV, PDF o texto (fotos NO) -->
              <input type="file" name="archivo"
                     accept=".pdf,.xlsx,.xls,.csv,.txt"
                     (change)="elegirArchivo($event)">
            </label>
          </div>
          <button class="btn-dorado enviar"
                  [disabled]="enviando() || !lista().trim() || !telefono().trim()">
            {{ enviando() ? 'Enviando…' : 'Enviar oferta' }}
          </button>
        </form>
      </div>

      <!-- ============ MIS OFERTAS ANTERIORES ============ -->
      @if (ofertas().length > 0) {
        <h2>Mis ofertas</h2>
        @for (oferta of ofertas(); track oferta.id) {
          <div class="panel oferta">
            <div class="cabecera">
              <span class="fecha">{{ fecha(oferta.createdAt) }}</span>
              <span class="insignia" [style.--color-estado]="estado(oferta).color">
                {{ estado(oferta).texto }}
              </span>
            </div>
            <p class="lista-texto">{{ resumen(oferta.listText) }}</p>
            @if (oferta.attachmentPath) {
              <a [href]="urlAdjunto(oferta)" target="_blank" class="adjunto">📎 Ver archivo adjunto</a>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .vender {
      max-width: 720px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
    }
    .miga {
      color: var(--dorado);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.25em;
    }
    h1 { font-size: 1.7rem; margin: 0.2rem 0 0.8rem; }
    h2 { font-size: 1.15rem; margin: 1.6rem 0 0.9rem; }
    .explicacion {
      color: var(--texto-suave);
      font-size: 0.92rem;
      line-height: 1.7;
      margin-bottom: 1.4rem;
    }

    .tarjeta { padding: 1.4rem 1.5rem; }
    form { display: flex; flex-direction: column; gap: 0.9rem; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: var(--texto-suave);
    }
    input, textarea {
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
    textarea { font-family: monospace; line-height: 1.6; resize: vertical; }
    input:focus, textarea:focus { border-color: var(--dorado); }
    /* El selector de archivo con estilo de boton discreto */
    input[type="file"] { padding: 0.45rem 0.6rem; cursor: pointer; }
    input[type="file"]::file-selector-button {
      background: transparent;
      border: 1px solid var(--dorado-oscuro);
      border-radius: 6px;
      color: var(--dorado);
      padding: 0.3rem 0.8rem;
      margin-right: 0.7rem;
      cursor: pointer;
      font-family: var(--fuente-cuerpo);
    }
    .fila-doble {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
    }
    .enviar { align-self: flex-start; }
    .enviar:disabled { opacity: 0.55; cursor: not-allowed; }

    .oferta { padding: 1.1rem 1.3rem; margin-bottom: 1rem; }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.6rem;
    }
    .fecha { color: var(--texto-suave); font-size: 0.82rem; }
    .insignia {
      border: 1px solid var(--color-estado);
      color: var(--color-estado);
      border-radius: 20px;
      padding: 0.25rem 0.9rem;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .lista-texto {
      color: var(--texto-suave);
      font-size: 0.85rem;
      font-family: monospace;
      white-space: pre-line;
      line-height: 1.5;
    }
    .adjunto {
      display: inline-block;
      margin-top: 0.6rem;
      color: var(--dorado);
      font-size: 0.85rem;
      font-weight: 600;
    }

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
export class Vender {

  private auth = inject(AuthService);
  private servicio = inject(ColeccionService);

  lista = signal('');
  telefono = signal('');
  archivo = signal<File | null>(null);
  enviando = signal(false);
  aviso = signal('');
  error = signal('');
  ofertas = signal<OfertaColeccion[]>([]);

  constructor() {
    // Precarga el telefono del perfil (para no pedirlo dos veces)
    this.auth.getPerfil().subscribe(p => {
      if (p.phone && !this.telefono().trim()) this.telefono.set(p.phone);
    });
    this.cargarOfertas();
  }

  private cargarOfertas() {
    this.servicio.misOfertas().subscribe(lista => this.ofertas.set(lista));
  }

  // Tipos de archivo permitidos (solo LISTAS, no fotos)
  private static readonly EXTENSIONES = ['.pdf', '.xlsx', '.xls', '.csv', '.txt'];

  elegirArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (!archivo) {
      this.archivo.set(null);
      return;
    }
    // El "accept" del input es solo una sugerencia del navegador:
    // aqui se valida de verdad la extension del archivo elegido
    const nombre = archivo.name.toLowerCase();
    const valido = Vender.EXTENSIONES.some(ext => nombre.endsWith(ext));
    if (!valido) {
      this.error.set('Solo se aceptan archivos de lista: Excel (.xlsx/.xls), CSV, PDF o texto (.txt).');
      input.value = '';          // limpia la eleccion invalida
      this.archivo.set(null);
      return;
    }
    this.error.set('');
    this.archivo.set(archivo);
  }

  enviar() {
    this.aviso.set('');
    this.error.set('');
    this.enviando.set(true);
    this.servicio.crearOferta(this.lista(), this.telefono(), this.archivo()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.aviso.set('¡Oferta enviada! La revisaremos y te contactaremos pronto. 📱');
        this.lista.set('');
        this.archivo.set(null);
        this.cargarOfertas();   // la nueva aparece de una en "Mis ofertas"
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(e.error?.error ?? 'No se pudo enviar la oferta. Intenta de nuevo.');
      }
    });
  }

  estado(oferta: OfertaColeccion) {
    return ESTADOS[oferta.status] ?? { texto: oferta.status, color: '#888' };
  }

  // La lista puede ser larguisima: en el historial se muestran
  // las primeras lineas y un "..." si hay mas
  resumen(texto: string): string {
    const lineas = texto.split('\n');
    return lineas.slice(0, 4).join('\n') + (lineas.length > 4 ? '\n…' : '');
  }

  urlAdjunto(oferta: OfertaColeccion): string {
    return `${API_URL}${oferta.attachmentPath}`;
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }
}
