// ============================================================
// SERVICIO DEL PANEL DE ENVIOS (rol SHIPPER)
// Las llamadas a /envios/api/** viven aqui, SEPARADAS del
// AdminService a proposito: el empleado de envios solo puede
// ver pedidos pagados y marcarlos como enviados — nada de
// precios, stock ni configuracion. El backend permite estas
// rutas a SHIPPER y tambien a ADMIN (para supervisar).
// ============================================================
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './catalogo.service';
import { Pedido } from './pedido.service';

const ENVIOS = `${API_URL}/envios/api`;

// Respuesta al despachar: el pedido actualizado + el link de
// WhatsApp con el mensaje ya escrito (un clic y se abre el chat)
export interface RespuestaEnvio {
  pedido: Pedido;
  whatsappLink: string;
}

@Injectable({ providedIn: 'root' })
export class EnvioService {

  private http = inject(HttpClient);

  // Los pedidos PAGADOS que aun no se han enviado: la bandeja
  // de trabajo del empleado (lo que hay que empacar y despachar)
  pedidosPorEnviar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${ENVIOS}/pedidos`);
  }

  // Despacha un pedido: numero de guia + transportadora + foto/PDF
  // opcional de la guia. Va como FormData (multipart) por el archivo.
  // El backend ademas envia el correo al cliente automaticamente.
  enviarPedido(orderNumber: string, trackingNumber: string, carrier: string,
               guia: File | null): Observable<RespuestaEnvio> {
    const datos = new FormData();
    datos.append('trackingNumber', trackingNumber);
    datos.append('carrier', carrier);
    if (guia) datos.append('guia', guia);
    return this.http.post<RespuestaEnvio>(
      `${ENVIOS}/pedidos/${orderNumber}/enviar`, datos);
  }
}
