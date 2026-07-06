// ============================================================
// SERVICIO DE CATALOGO
// Todas las llamadas HTTP publicas del catalogo viven aqui.
// Los componentes NUNCA llaman la API directamente: le piden
// los datos a este servicio (asi la URL y la logica de red
// estan en un solo lugar).
// ============================================================
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Card, CardVariant, CatalogoTile, MtgSet, Pagina } from './modelos';

// Filtros del catalogo publico; todos opcionales
export interface FiltrosCatalogo {
  nombre?: string;
  set?: string;      // codigo del set: "stx", "msh"...
  color?: string;    // W, U, B, R, G o C (incoloro)
  rareza?: string;   // common, uncommon, rare, mythic
  orden?: string;    // "nombre" | "precio-asc" | "precio-desc"
  page?: number;
  size?: number;
}

// URL del backend. En desarrollo es el Spring Boot local;
// cuando se despliegue, se cambia aqui una sola vez.
export const API_URL = 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class CatalogoService {

  private http = inject(HttpClient);

  // --- Expansiones (sets) ---

  // Todas las expansiones, de la mas reciente a la mas antigua
  getSets(): Observable<MtgSet[]> {
    return this.http.get<MtgSet[]>(`${API_URL}/api/sets`);
  }

  // Busca expansiones por nombre (para el filtro del catalogo)
  buscarSets(nombre: string): Observable<MtgSet[]> {
    return this.http.get<MtgSet[]>(`${API_URL}/api/sets/buscar`, {
      params: { nombre }
    });
  }

  // --- Cartas (solo con stock: es el catalogo publico) ---

  // Cartas con al menos una variante disponible
  getCartasEnStock(): Observable<Card[]> {
    return this.http.get<Card[]>(`${API_URL}/api/cards`);
  }

  // Buscador publico por nombre
  buscarCartas(nombre: string): Observable<Card[]> {
    return this.http.get<Card[]>(`${API_URL}/api/cards/buscar`, {
      params: { nombre }
    });
  }

  // Detalle de una carta
  getCarta(id: number): Observable<Card> {
    return this.http.get<Card>(`${API_URL}/api/cards/${id}`);
  }

  // Variantes de una carta (acabado + idioma + stock)
  getVariantes(cardId: number): Observable<CardVariant[]> {
    return this.http.get<CardVariant[]>(`${API_URL}/api/cards/${cardId}/variantes`);
  }

  // "Lo último": las variantes con stock subido mas recientemente
  getNovedades(limite: number = 6): Observable<CardVariant[]> {
    return this.http.get<CardVariant[]>(`${API_URL}/api/cards/novedades`, {
      params: { limite }
    });
  }

  // EL CATALOGO: tiles (carta+acabado, idiomas colapsados), paginado.
  // Solo se envian los filtros que tienen valor (los vacios no viajan).
  buscarCatalogo(filtros: FiltrosCatalogo): Observable<Pagina<CatalogoTile>> {
    let params = new HttpParams()
      .set('page', filtros.page ?? 0)
      .set('size', filtros.size ?? 24);
    if (filtros.nombre) params = params.set('nombre', filtros.nombre);
    if (filtros.set)    params = params.set('set', filtros.set);
    if (filtros.color)  params = params.set('color', filtros.color);
    if (filtros.rareza) params = params.set('rareza', filtros.rareza);
    if (filtros.orden)  params = params.set('orden', filtros.orden);
    return this.http.get<Pagina<CatalogoTile>>(`${API_URL}/api/cards/catalogo`, { params });
  }

  // Cartas de un set especifico
  getCartasPorSet(codigoSet: string): Observable<Card[]> {
    return this.http.get<Card[]>(`${API_URL}/api/cards/set/${codigoSet}`);
  }
}
