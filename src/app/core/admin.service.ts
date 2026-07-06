// ============================================================
// SERVICIO DEL PANEL DE ADMINISTRACION
// Todas las llamadas a /manacore-panel/api/** viven aqui. Esas
// rutas exigen rol ADMIN en el backend (el token viaja solo,
// gracias al interceptor).
//
// El flujo PRINCIPAL del dueño: llega un lote de cartas ->
// buscar la carta en el censo (95k, incluye stock 0 y tokens) ->
// subirle stock a la variante exacta (acabado + idioma).
// ============================================================
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './catalogo.service';
import { Card, CardVariant, Pagina } from './modelos';

const PANEL = `${API_URL}/manacore-panel/api`;

@Injectable({ providedIn: 'root' })
export class AdminService {

  private http = inject(HttpClient);

  // Buscador sobre TODO el censo (paginado: con 95k cartas es
  // obligatorio; el backend limita el tamano de pagina)
  buscarCartas(nombre: string, set: string, page: number, size = 20): Observable<Pagina<Card>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('page', page)
      .set('size', size);
    if (set.trim()) params = params.set('set', set.trim());
    return this.http.get<Pagina<Card>>(`${PANEL}/cartas/buscar`, { params });
  }

  // Las variantes fisicas de una carta (acabado + idioma + stock)
  getVariantes(cardId: number): Observable<CardVariant[]> {
    return this.http.get<CardVariant[]>(`${PANEL}/cartas/${cardId}/variantes`);
  }

  // EL boton del negocio: fijar el stock de una variante
  setStock(variantId: number, stock: number): Observable<CardVariant> {
    return this.http.put<CardVariant>(`${PANEL}/variantes/${variantId}/stock`, { stock });
  }

  // Crear una variante nueva (ej: llego una copia en ESPANOL y solo
  // existia la de ingles). El precio sale del Card segun el acabado.
  agregarVariante(cardId: number, finish: string, language: string, stock: number): Observable<CardVariant> {
    return this.http.post<CardVariant>(`${PANEL}/cartas/${cardId}/variantes`,
      { finish, language, stock });
  }
}
