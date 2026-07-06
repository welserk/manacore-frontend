// ============================================================
// RUTAS DE LA APLICACION
// Cada ruta dice: "cuando la URL sea X, muestra la pagina Y".
// Las paginas se cargan de forma perezosa (loadComponent):
// solo se descargan cuando el usuario las visita.
// ============================================================
import { Routes } from '@angular/router';

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

  // Las demas paginas (catalogo, tokens, vender, login, terminos...)
  // se agregan aqui a medida que las construyamos en las siguientes etapas

  // Cualquier URL desconocida vuelve al inicio
  { path: '**', redirectTo: '' }
];
