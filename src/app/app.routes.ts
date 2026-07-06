// ============================================================
// RUTAS DE LA APLICACION
// Cada ruta dice: "cuando la URL sea X, muestra la pagina Y".
// Las paginas se cargan de forma perezosa (loadComponent):
// solo se descargan cuando el usuario las visita.
// ============================================================
import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from './core/auth.service';

// Guardia de las paginas que requieren cuenta: si no hay sesion,
// lleva al LOGIN y le dice a donde volver despues (?volver=...)
// para que el cliente no pierda el hilo de lo que iba a hacer
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
const soloConSesion = (_ruta: ActivatedRouteSnapshot, estado: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.logueado()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { volver: estado.url } });
};

export const routes: Routes = [
  // Pagina de inicio
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio),
    title: 'ManaCore TCG — Every Card Matters'
  },

  // El catalogo: la grilla principal de la tienda
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalogo/catalogo').then(m => m.Catalogo),
    title: 'Catálogo — ManaCore TCG'
  },

  // Detalle de una carta (disponibilidad por acabado e idioma)
  {
    path: 'carta/:id',
    loadComponent: () => import('./pages/detalle-carta/detalle-carta').then(m => m.DetalleCarta),
    title: 'Carta — ManaCore TCG'
  },

  // Finalizar compra (resumen del pedido; pago se conecta luego)
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout').then(m => m.Checkout),
    title: 'Finalizar compra — ManaCore TCG'
  },

  // "Lo último": las cartas recien subidas a la tienda
  {
    path: 'novedades',
    loadComponent: () => import('./pages/novedades/novedades').then(m => m.Novedades),
    title: 'Lo último — ManaCore TCG'
  },

  // Compra por lista: pegar una lista de cartas y ver lo disponible
  {
    path: 'lista',
    loadComponent: () => import('./pages/compra-lista/compra-lista').then(m => m.CompraLista),
    title: 'Compra por lista — ManaCore TCG'
  },

  // Retorno de MercadoPago: exitoso, pendiente o fallido
  // (las backUrls del backend apuntan a estas rutas)
  {
    path: 'pago/:resultado',
    loadComponent: () => import('./pages/pago/pago-resultado').then(m => m.PagoResultado),
    title: 'Pago — ManaCore TCG'
  },

  // Ingresar / crear cuenta (con retorno via ?volver=)
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    title: 'Ingresar — ManaCore TCG'
  },

  // Vende tu coleccion: oferta con lista + adjunto (requiere sesion)
  {
    path: 'vender',
    canActivate: [soloConSesion],
    loadComponent: () => import('./pages/vender/vender').then(m => m.Vender),
    title: 'Vende tu colección — ManaCore TCG'
  },

  // Mi cuenta: perfil y direccion de envio (requiere sesion)
  {
    path: 'cuenta',
    canActivate: [soloConSesion],
    loadComponent: () => import('./pages/cuenta/cuenta').then(m => m.Cuenta),
    title: 'Mi cuenta — ManaCore TCG'
  },

  // Mis pedidos: historial con estado y rastreo (requiere sesion)
  {
    path: 'cuenta/pedidos',
    canActivate: [soloConSesion],
    loadComponent: () => import('./pages/mis-pedidos/mis-pedidos').then(m => m.MisPedidos),
    title: 'Mis pedidos — ManaCore TCG'
  },

  // Las demas paginas (catalogo, tokens, vender, login, terminos...)
  // se agregan aqui a medida que las construyamos en las siguientes etapas

  // Cualquier URL desconocida vuelve al inicio
  { path: '**', redirectTo: '' }
];
