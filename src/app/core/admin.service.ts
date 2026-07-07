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
import { Card, CardVariant, MtgSet, Pagina, StoreConfig } from './modelos';
import { Pedido } from './pedido.service';
import { OfertaColeccion } from './coleccion.service';

// La seccion del buscador del panel (pestañas del inventario)
export type TipoBusqueda = 'cartas' | 'basicas' | 'tokens' | 'todas';

// Una oferta vista por el ADMIN: incluye al vendedor y las notas internas
export interface OfertaAdmin extends OfertaColeccion {
  adminNotes: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
  };
}

const PANEL = `${API_URL}/manacore-panel/api`;

// Respuesta al despachar: el pedido actualizado + el link de WhatsApp
// con el mensaje de despacho ya escrito (un clic y se abre el chat)
export interface RespuestaDespacho {
  pedido: Pedido;
  whatsappLink: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {

  private http = inject(HttpClient);

  // Buscador sobre TODO el censo (paginado: con 95k cartas es
  // obligatorio). tipo = la pestaña del panel (cartas/basicas/tokens);
  // numero = numero de coleccionista ("Island 234" -> numero 234)
  buscarCartas(nombre: string, set: string, numero: string, tipo: TipoBusqueda,
               page: number, size = 20): Observable<Pagina<Card>> {
    let params = new HttpParams()
      .set('nombre', nombre)
      .set('numero', numero)
      .set('tipo', tipo)
      .set('page', page)
      .set('size', size);
    if (set.trim()) params = params.set('set', set.trim());
    return this.http.get<Pagina<Card>>(`${PANEL}/cartas/buscar`, { params });
  }

  // Los sets donde existe lo buscado: el desplegable de sets se adapta
  // a lo que escribas (ej: "hallowed fountain" -> solo sus expansiones)
  setsDeBusqueda(nombre: string, tipo: TipoBusqueda): Observable<MtgSet[]> {
    return this.http.get<MtgSet[]>(`${PANEL}/cartas/sets-de`, {
      params: { nombre, tipo }
    });
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

  // Eliminar una variante agregada por error. El backend la protege:
  // si tiene ventas historicas, responde error (dejarla en stock 0).
  eliminarVariante(variantId: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${PANEL}/variantes/${variantId}`);
  }

  // --- Pedidos ---

  // Pagados y pendientes de despachar (la bandeja de trabajo diaria)
  pedidosPendientes(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${PANEL}/pedidos/pendientes`);
  }

  // Historial completo de pedidos de la tienda
  todosPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${PANEL}/pedidos/todos`);
  }

  // Despacha un pedido: guia + transportadora + foto/PDF opcional de
  // la guia. Va como FormData (multipart) por el archivo. El backend
  // ademas envia el CORREO al cliente y devuelve el link de WhatsApp.
  enviarPedido(orderNumber: string, trackingNumber: string, carrier: string,
               guia: File | null): Observable<RespuestaDespacho> {
    const datos = new FormData();
    datos.append('orderNumber', orderNumber);
    datos.append('trackingNumber', trackingNumber);
    datos.append('carrier', carrier);
    if (guia) datos.append('guia', guia);
    return this.http.post<RespuestaDespacho>(`${PANEL}/pedidos/enviar`, datos);
  }

  // Marca un pedido enviado como ENTREGADO
  entregarPedido(orderNumber: string): Observable<Pedido> {
    return this.http.put<Pedido>(`${PANEL}/pedidos/entregar`, { orderNumber });
  }

  // --- Ofertas de coleccion (vender coleccion) ---

  // Todas las ofertas, o solo las de un estado (ej: PENDIENTE para
  // el numerito de notificaciones del menu de admin)
  getOfertas(estado?: string): Observable<OfertaAdmin[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<OfertaAdmin[]>(`${PANEL}/ofertas-coleccion`, { params });
  }

  // Cambia el estado de una oferta y/o guarda notas internas
  actualizarOferta(id: number, estado: string, notas: string): Observable<OfertaAdmin> {
    return this.http.put<OfertaAdmin>(`${PANEL}/ofertas-coleccion/${id}`,
      { estado, notas });
  }

  // --- Configuracion de la tienda ---

  getConfig(): Observable<StoreConfig> {
    return this.http.get<StoreConfig>(`${PANEL}/configuracion`);
  }

  // Guarda la config completa (envio, pisos, datos de la tienda...).
  // El backend reemplaza los campos, asi que se manda el objeto entero.
  guardarConfig(config: StoreConfig): Observable<StoreConfig> {
    return this.http.put<StoreConfig>(`${PANEL}/configuracion`, config);
  }

  // Prende/apaga el modo mantenimiento (la tienda muestra un aviso y
  // el catalogo responde 503 mientras esta activo)
  toggleMantenimiento(activo: boolean, mensaje: string): Observable<StoreConfig> {
    return this.http.put<StoreConfig>(`${PANEL}/configuracion/mantenimiento`,
      { activo, mensaje });
  }

  // Cambia la TRM a mano (real y/o ajuste) y recalcula TODOS los precios
  setTrm(trmReal: number | null, ajuste: number | null): Observable<any> {
    const body: Record<string, number> = {};
    if (trmReal != null) body['trmReal'] = trmReal;
    if (ajuste != null) body['ajuste'] = ajuste;
    return this.http.put(`${PANEL}/trm`, body);
  }

  // Recalcula precios con la TRM actual (sin cambiar la TRM)
  recalcularPrecios(): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${PANEL}/cartas/recalcular-precios`, {});
  }

  // Variantes con stock bajo (1 a 3 unidades) para reponer
  getStockBajo(): Observable<CardVariant[]> {
    return this.http.get<CardVariant[]>(`${PANEL}/variantes/stock-bajo`);
  }
}
