// ============================================================
// SERVICIO DEL CARRITO
// Guarda las cartas que el cliente va a comprar. Vive en el
// navegador (localStorage) para que el carrito NO se pierda al
// recargar la pagina. No requiere cuenta: el login se pide
// recien al momento de pagar.
//
// Cada item es una VARIANTE exacta (carta + acabado + idioma),
// porque eso es lo que se vende y lo que el pedido necesita.
// ============================================================
import { Injectable, computed, effect, signal } from '@angular/core';

export interface ItemCarrito {
  variantId: number;
  cardId: number;
  nombre: string;
  imageUrl: string | null;
  setName: string;
  finish: string;
  language: string;
  precio: number;
  cantidad: number;
  stock: number;      // maximo disponible (no se puede pedir mas)
}

const CLAVE_STORAGE = 'manacore_carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {

  // Los items del carrito. Se cargan de localStorage al iniciar.
  items = signal<ItemCarrito[]>(this.cargarDeStorage());

  // Si el panel lateral esta abierto o cerrado
  abierto = signal(false);

  // Cuantas unidades hay en total (para el numerito del icono)
  cantidadTotal = computed(() =>
    this.items().reduce((suma, i) => suma + i.cantidad, 0));

  // Total en pesos de todo el carrito
  total = computed(() =>
    this.items().reduce((suma, i) => suma + i.precio * i.cantidad, 0));

  constructor() {
    // Cada vez que cambian los items, se guardan en el navegador
    effect(() => localStorage.setItem(CLAVE_STORAGE, JSON.stringify(this.items())));
  }

  // Agrega una variante. Si ya estaba, sube la cantidad (sin pasar el stock).
  agregar(item: Omit<ItemCarrito, 'cantidad'>, cantidad = 1) {
    this.items.update(actuales => {
      const existente = actuales.find(i => i.variantId === item.variantId);
      if (existente) {
        const nueva = Math.min(existente.cantidad + cantidad, item.stock);
        return actuales.map(i =>
          i.variantId === item.variantId ? { ...i, cantidad: nueva } : i);
      }
      return [...actuales, { ...item, cantidad: Math.min(cantidad, item.stock) }];
    });
    this.abierto.set(true);   // abre el panel para confirmar que se agrego
  }

  // Cambia la cantidad de un item (+1 o -1). Si llega a 0, se quita.
  cambiarCantidad(variantId: number, delta: number) {
    this.items.update(actuales =>
      actuales
        .map(i => i.variantId === variantId
          ? { ...i, cantidad: Math.min(Math.max(i.cantidad + delta, 0), i.stock) }
          : i)
        .filter(i => i.cantidad > 0));
  }

  quitar(variantId: number) {
    this.items.update(actuales => actuales.filter(i => i.variantId !== variantId));
  }

  vaciar() {
    this.items.set([]);
  }

  abrir() { this.abierto.set(true); }
  cerrar() { this.abierto.set(false); }

  private cargarDeStorage(): ItemCarrito[] {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  }
}
