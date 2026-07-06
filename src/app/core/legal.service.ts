// ============================================================
// SERVICIO DE DOCUMENTOS LEGALES
// Los terminos y condiciones viven en la BASE DE DATOS (no en el
// codigo): el dueño los edita desde el panel admin sin tocar la
// web. El backend los sirve publicos en /api/legal/{slug}.
// ============================================================
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './catalogo.service';

// Entidad LegalDocument del backend. El contenido es Markdown.
export interface DocumentoLegal {
  slug: string;      // "terminos"
  title: string;     // "Términos y Condiciones"
  content: string;   // el texto en Markdown
}

@Injectable({ providedIn: 'root' })
export class LegalService {

  private http = inject(HttpClient);

  getTerminos(): Observable<DocumentoLegal> {
    return this.http.get<DocumentoLegal>(`${API_URL}/api/legal/terminos`);
  }
}
