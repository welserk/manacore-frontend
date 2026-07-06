// ============================================================
// SERVICIO DE VENTA DE COLECCIONES
// El cliente ofrece su coleccion a la tienda: manda la lista de
// cartas (texto), un telefono de contacto y opcionalmente un
// archivo (foto, Excel, CSV, PDF). La tienda la revisa y lo
// contacta. Requiere cuenta (la identidad sale del token).
//
// Como viaja un ARCHIVO, no se manda JSON sino FormData
// (multipart/form-data): el mismo formato de un formulario HTML
// clasico con <input type="file">.
// ============================================================
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './catalogo.service';

// Una oferta enviada (entidad CollectionOffer del backend)
export interface OfertaColeccion {
  id: number;
  listText: string;           // la lista de cartas que ofrecio
  contactPhone: string;
  attachmentPath: string | null;  // /uploads/ofertas/... si adjunto algo
  status: string;             // PENDIENTE | REVISADA | CONTACTADO | RECHAZADA
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ColeccionService {

  private http = inject(HttpClient);

  // Envia la oferta. El archivo es opcional: solo se agrega al
  // FormData si el cliente eligio uno.
  crearOferta(lista: string, telefono: string, archivo: File | null): Observable<OfertaColeccion> {
    const datos = new FormData();
    datos.append('lista', lista);
    datos.append('telefono', telefono);
    if (archivo) {
      datos.append('archivo', archivo);
    }
    return this.http.post<OfertaColeccion>(`${API_URL}/api/vender-coleccion`, datos);
  }

  // Mis ofertas enviadas y en que estado van (mas recientes primero,
  // el backend ya las ordena asi)
  misOfertas(): Observable<OfertaColeccion[]> {
    return this.http.get<OfertaColeccion[]>(`${API_URL}/api/vender-coleccion/mias`);
  }
}
