// ============================================================
// SERVICIO DE AUTENTICACION
// Maneja el login, registro y la sesion del usuario. La sesion
// (token JWT + datos basicos) se guarda en localStorage para que
// NO se pierda al recargar la pagina o cerrar el navegador.
//
// El token JWT es la "cedula digital" del usuario: el backend lo
// exige en las rutas protegidas (crear pedido, ver mis pedidos,
// perfil...). Un interceptor HTTP (siguiente paso) lo adjuntara
// automaticamente a cada peticion.
// ============================================================
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from './catalogo.service';

// Lo que el backend devuelve al hacer login exitoso
export interface Sesion {
  token: string;
  id: number;
  nombre: string;
  email: string;
  rol: string;              // "CUSTOMER" | "ADMIN" | "SHIPPER"
  ciudad: string | null;
  puntos: number;
  tieneRecompensa: boolean;
}

// Datos que pide el registro (el backend valida que las
// contrasenas coincidan y envia el correo de verificacion)
export interface DatosRegistro {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  city: string;
}

// El perfil completo (entidad User del backend, sin secretos).
// Incluye la direccion de envio predeterminada que el checkout precarga.
export interface Perfil {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;       // direccion de envio guardada
  city: string | null;
  addressNotes: string | null;  // "Apto 302", "casa con reja azul"...
  shippingPoints: number;
  hasReward: boolean;
}

const CLAVE_STORAGE = 'manacore_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private http = inject(HttpClient);

  // La sesion actual. null = nadie ha iniciado sesion.
  // Se carga de localStorage al arrancar (por si ya habia sesion).
  sesion = signal<Sesion | null>(this.cargarDeStorage());

  // Atajos comodos para los componentes (header, checkout...)
  logueado = computed(() => this.sesion() !== null);
  nombre   = computed(() => this.sesion()?.nombre ?? '');

  // Inicia sesion contra el backend. Si las credenciales son
  // correctas, guarda la sesion; si no, el error viaja al
  // componente para mostrarlo (ej: "Email o contrasena incorrectos").
  login(email: string, password: string): Observable<Sesion> {
    return this.http.post<Sesion>(`${API_URL}/api/auth/login`, { email, password })
      .pipe(tap(sesion => this.guardarSesion(sesion)));
  }

  // Crea la cuenta. OJO: el registro NO inicia sesion — el backend
  // exige verificar el email primero (llega un correo con un link).
  registrar(datos: DatosRegistro): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${API_URL}/api/auth/registro`, datos);
  }

  // Cierra la sesion: borra el token del navegador. No hay llamada
  // al backend porque los JWT no se "apagan" del lado del servidor:
  // simplemente dejamos de enviarlo.
  logout() {
    this.sesion.set(null);
    localStorage.removeItem(CLAVE_STORAGE);
  }

  // El token actual (lo usara el interceptor HTTP)
  token(): string | null {
    return this.sesion()?.token ?? null;
  }

  // Perfil completo del usuario del token (incluye la direccion
  // de envio guardada, que el login no trae)
  getPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${API_URL}/api/auth/perfil`);
  }

  // Actualiza el perfil. OJO: el backend REEMPLAZA nombre, telefono,
  // direccion, ciudad y notas con lo que llegue — siempre hay que
  // mandar el perfil COMPLETO (leer primero, cambiar lo necesario).
  actualizarPerfil(perfil: Perfil): Observable<Perfil> {
    return this.http.put<Perfil>(`${API_URL}/api/auth/perfil`, perfil);
  }

  private guardarSesion(sesion: Sesion) {
    this.sesion.set(sesion);
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion));
  }

  private cargarDeStorage(): Sesion | null {
    try {
      const guardada = localStorage.getItem(CLAVE_STORAGE);
      return guardada ? JSON.parse(guardada) : null;
    } catch {
      return null;
    }
  }
}
