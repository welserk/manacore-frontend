// ============================================================
// MODELOS DE DATOS
// Son la version TypeScript de las entidades del backend:
// definen que campos trae cada cosa que llega de la API.
// Si el backend agrega un campo, se agrega aqui tambien.
// ============================================================

// Una expansion de Magic (tabla mtg_sets del backend)
export interface MtgSet {
  id: number;
  code: string;          // "rvr", "dmu"...
  name: string;          // "Ravnica Remastered"
  releaseDate: string;   // "2024-01-12"
  setType: string;       // "expansion", "masters", "commander"...
  iconUrl: string;       // logo oficial del set (SVG de Scryfall)
  parentSetCode: string | null;
  // Set padre: las promos y masterpiece apuntan a su expansion madre
  // (ej: Mystical Archive -> stx). null = set principal
}

// Una impresion de carta (tabla cards). La imagen y los datos
// son de la impresion; el stock vive en sus variantes.
export interface Card {
  id: number;
  scryfallId: string;
  name: string;
  manaCost: string | null;
  cardType: string | null;
  oracleText: string | null;
  rarity: string | null;
  colors: string | null;         // "R,G" separado por comas
  colorIdentity: string | null;
  imageUrl: string | null;
  collectorNumber: string | null;
  format: string | null;         // "standard,modern" separado por comas
  priceUsd: number | null;
  priceUsdFoil: number | null;
  priceUsdEtched: number | null;
  priceCop: number | null;       // precio de venta normal
  priceCopFoil: number | null;   // precio de venta foil
  priceCopEtched: number | null; // precio de venta etched
  priceManual: boolean;
  token: boolean;                // true = es un token (seccion aparte)
  mtgSet: MtgSet;
}

// Una variante fisica vendible de una carta (tabla card_variants)
// El cliente compra ESTO: carta + acabado + idioma, con su stock
export interface CardVariant {
  id: number;
  card: Card;
  finish: 'normal' | 'foil' | 'etched';
  specialFoilType: string | null;  // "surgefoil", "serialized"... (solo informativo)
  manualPriceCop: number | null;   // si esta fijado, manda sobre el precio del Card
  language: string;                // "en", "es"...
  stock: number;
  stockedAt: string | null;        // cuando se le subio stock (para "Lo último")
}

// Un "tile" del catalogo: una carta + acabado, con los idiomas colapsados.
// El backend suma el stock de todos los idiomas y elige el precio del acabado.
// El idioma se escoge al entrar al detalle de la carta.
export interface CatalogoTile {
  cardId: number;
  name: string;
  imageUrl: string | null;
  setName: string;
  setCode: string;
  collectorNumber: string | null;
  manaCost: string | null;
  rarity: string | null;
  colors: string | null;
  finish: 'normal' | 'foil' | 'etched';
  specialFoilType: string | null;
  precio: number;
  stockTotal: number;
}

// Los idiomas en que Scryfall imprime cartas, con su nombre en
// español. Se usa en el detalle de carta y en el panel admin
// (selector de idioma al crear variantes).
export const NOMBRES_IDIOMA: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  pt: 'Portugués',
  ja: 'Japonés',
  ko: 'Coreano',
  ru: 'Ruso',
  zhs: 'Chino simplificado',
  zht: 'Chino tradicional',
  he: 'Hebreo',
  la: 'Latín',
  grc: 'Griego antiguo',
  ar: 'Árabe',
  sa: 'Sánscrito',
  ph: 'Phyrexiano'
};

// Configuracion de la tienda (entidad StoreConfig del backend).
// La edita el admin desde el panel de Configuracion.
export interface StoreConfig {
  id: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  storeName: string;
  storeEmail: string | null;
  storePhone: string | null;
  trmReal: number | null;         // TRM oficial (datos.gov.co)
  trmAdjustment: number | null;   // ajuste manual sumado a la TRM
  trmManacore: number | null;     // TRM efectiva de la tienda (real + ajuste)
  trmLastUpdated: string | null;
  priceFloorLow: number | null;   // piso cartas ≤ $0.50 USD (y tokens normales)
  priceFloorMid: number | null;   // piso cartas $0.51-$1 USD (y tokens foil)
  shippingNationalPrice: number | null;
  shippingLocalPrice: number | null;  // normalmente 0 (ciudad local)
  localCity: string;              // ciudad con envio gratis (Armenia)
  rewardThreshold: number | null;
}

// Respuesta paginada de Spring (para el buscador admin)
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;       // pagina actual (empieza en 0)
  size: number;
}
