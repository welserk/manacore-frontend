// ============================================================
// INTERCEPTOR DE AUTENTICACION
// Se mete en TODAS las peticiones HTTP que salen de Angular y,
// si hay sesion iniciada, les agrega el encabezado:
//     Authorization: Bearer <token>
// que es lo que el JwtFilter del backend espera para saber
// quien esta llamando. Asi ningun servicio (pedidos, perfil...)
// tiene que acordarse de adjuntar el token a mano.
//
// Ademas, si el backend responde 401 (token vencido o invalido),
// cierra la sesion local: el usuario vera "Ingresar" de nuevo
// en vez de una app que falla en silencio.
// ============================================================
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const auth = inject(AuthService);
  const token = auth.token();

  // Si hay token, se clona la peticion agregando el encabezado.
  // (Las peticiones HTTP son inmutables en Angular: no se pueden
  // modificar, solo clonar con cambios.)
  const conToken = token
    ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : peticion;

  return siguiente(conToken).pipe(
    catchError(error => {
      // 401 = el backend rechazo el token (vencido o corrupto).
      // Se limpia la sesion local para que la web y la realidad
      // vuelvan a coincidir. El error sigue su curso por si el
      // componente quiere mostrar un mensaje.
      if (error.status === 401 && token) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
