// ============================================================
// SERVICIO DE PEDIDOS Y PAGOS
// Los dos pasos finales de la compra:
//   1. crearPedido()   -> POST /api/pedidos/crear
//      Registra el pedido en el backend (queda AWAITING_PAYMENT,
//      el stock NO se descuenta todavia). El backend calcula el
//      envio real y el total; la identidad sale del token JWT.
//   2. crearCheckout() -> POST /api/pagos/checkout/{orderNumber}
//      Crea la preferencia en MercadoPago y devuelve el initPoint:
//      la URL de la pagina de pago a la que se redirige al cliente.
// El pedido pasa a PAID cuando MercadoPago confirma via webhook.
// ============================================================
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './catalogo.service';
import { CardVariant } from './modelos';

// Un renglon del pedido: la variante exacta y cuantas
export interface ItemPedido {
  variantId: number;
  quantity: number;
}

// Lo que se manda al crear el pedido (SIN userId: va en el token)
export interface DatosPedido {
  shippingAddress: string;
  shippingCity: string;
  notes?: string;           // observaciones del envio (opcional)
  linkedOrderId?: number;   // pedido padre si va adjunto (opcional)
  items: ItemPedido[];
}

// Lo que devuelve el backend al crear el pedido (entidad Order).
// Solo tipamos lo que el frontend usa.
export interface PedidoCreado {
  id: number;
  orderNumber: string;      // "MNC-2026-00001" — la llave para pagar
  status: string;           // "AWAITING_PAYMENT"
  totalCop: number;         // cartas + envio REAL calculado por el backend
  shippingCost: number;
}

// Respuesta del checkout de MercadoPago
export interface CheckoutPago {
  preferenceId: string;
  initPoint: string;        // URL de la pagina de pago
  orderNumber: string;
  total: number;
}

// Un renglon del HISTORIAL (entidad OrderItem del backend):
// guarda el precio al momento de la compra, aunque cambie despues
export interface ItemDePedido {
  id: number;
  variant: CardVariant;     // la variante exacta comprada (trae la carta)
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Un pedido del historial (entidad Order, lo que el cliente ve)
export interface Pedido {
  id: number;
  orderNumber: string;
  status: string;           // AWAITING_PAYMENT | PAID | SHIPPED | DELIVERED | CANCELLED
  totalCop: number;
  shippingCost: number;
  shippingAddress: string;
  shippingCity: string;
  notes: string | null;
  trackingNumber: string | null;   // numero de guia (cuando se despacha)
  shippingCarrier: string | null;  // transportadora
  guideFilePath: string | null;    // foto/PDF de la guia: /uploads/...
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  items: ItemDePedido[];
}

@Injectable({ providedIn: 'root' })
export class PedidoService {

  private http = inject(HttpClient);

  crearPedido(datos: DatosPedido): Observable<PedidoCreado> {
    return this.http.post<PedidoCreado>(`${API_URL}/api/pedidos/crear`, datos);
  }

  crearCheckout(orderNumber: string): Observable<CheckoutPago> {
    return this.http.post<CheckoutPago>(
      `${API_URL}/api/pagos/checkout/${orderNumber}`, {});
  }

  // Mi historial de pedidos (la identidad sale del token)
  misPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API_URL}/api/pedidos/mios`);
  }
}
