// Único lugar donde se cambian datos de contacto, precios, pasarela de pago e idiomas.
// Aquí van SOLO precios de venta al público. Los costos que pagamos a cada operador son
// privados y viven en el repositorio privado (docs/MODELO_NEGOCIO.md), nunca aquí.
// Los textos (nombres, descripciones, FAQ) viven en src/i18n/es.ts y src/i18n/en.ts.

export const BRAND = 'iTravelow';
export const SITE_URL = 'https://itravelow.com';
export const EMAIL = 'hola@itravelow.com';

// Idiomas. `public` decide cuáles se enlazan y se indexan. Mientras el inglés no esté en
// `public`, /en existe para revisarlo pero lleva noindex y no aparece en el menú.
export type Lang = 'es' | 'en';
export const LOCALES: { default: Lang; public: Lang[] } = { default: 'es', public: ['es'] };

// Destino actual. El plan es repetir el modelo en otros destinos (Aruba, etc.): cada uno
// tendrá su propio catálogo y sus textos; este objeto es el que cambia.
export const DESTINATION = { slug: 'punta-cana', name: 'Punta Cana', country: { es: 'República Dominicana', en: 'Dominican Republic' }, airport: 'PUJ', timezone: 'America/Santo_Domingo' };

// WhatsApp de asistencia (chat 24/7). Formato internacional sin "+", ej. "18095551234".
// Vacío = el botón de asistencia muestra el correo mientras se activa el número.
export const WHATSAPP_NUMBER = '';

export function waLink(message: string): string {
  if (!WHATSAPP_NUMBER) return '';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Pasarela de pago. 'pending' = aún no hay cuenta: la reserva se registra y el enlace de
// pago se envía a mano. Cuando exista cuenta se cambia a 'stripe' o 'paypal' y se despliega
// la función /api/checkout (ver docs/MODELO_NEGOCIO.md en el repo privado).
export const PAYMENTS: { provider: 'pending' | 'stripe' | 'paypal'; currency: 'USD' } = {
  provider: 'pending',
  currency: 'USD',
};

export type Unit = 'persona' | 'vehículo';

export interface ServiceOption {
  id: string;
  price: number; // USD por unidad
  unit: Unit;
  capacity?: number; // solo para unit = 'vehículo': personas por vehículo
}

export interface ServiceData {
  slug: string;
  image: string;
  from: number; // precio más bajo entre las opciones, para "desde"
  options: ServiceOption[];
  roundTrip?: boolean; // si aplica la opción "ida y vuelta" (x2)
  minPax: number;
  maxPax: number;
}

// Precios de referencia pública (oct 2026). Se ajustan cuando cada operador confirme tarifa.
export const SERVICES: ServiceData[] = [
  {
    slug: 'traslados',
    image: '/img/traslado-480.webp',
    from: 35,
    options: [
      { id: 'auto', price: 35, unit: 'vehículo', capacity: 4 },
      { id: 'van', price: 60, unit: 'vehículo', capacity: 8 },
    ],
    roundTrip: true,
    minPax: 1,
    maxPax: 16,
  },
  {
    slug: 'buggies',
    image: '/img/buggies-480.webp',
    from: 45,
    options: [
      { id: 'doble', price: 50, unit: 'persona' },
      { id: 'familiar', price: 45, unit: 'persona' },
    ],
    minPax: 1,
    maxPax: 12,
  },
  {
    slug: 'saona',
    image: '/img/saona-480.webp',
    from: 69,
    options: [
      { id: 'adulto', price: 69, unit: 'persona' },
      { id: 'nino', price: 45, unit: 'persona' },
    ],
    minPax: 1,
    maxPax: 20,
  },
  {
    slug: 'coco-bongo',
    image: '/img/cocobongo-480.webp',
    from: 90,
    options: [
      { id: 'regular', price: 90, unit: 'persona' },
      { id: 'gold', price: 140, unit: 'persona' },
    ],
    minPax: 1,
    maxPax: 20,
  },
];

// Descuento por combinar varios tours en una misma reserva (poco, pero visible).
export const COMBO_DISCOUNTS: Record<number, number> = { 2: 0.05, 3: 0.08, 4: 0.1 };

export interface ComboData {
  slug: string;
  items: { service: string; option: string; roundTrip?: boolean }[];
}

// Combos sugeridos: prellenan el carrito; el descuento sale de COMBO_DISCOUNTS según cuántos tours lleve.
export const COMBOS: ComboData[] = [
  { slug: 'llegada-saona', items: [{ service: 'traslados', option: 'auto', roundTrip: true }, { service: 'saona', option: 'adulto' }] },
  { slug: 'aventura', items: [{ service: 'traslados', option: 'auto', roundTrip: true }, { service: 'buggies', option: 'doble' }, { service: 'saona', option: 'adulto' }] },
  { slug: 'todo', items: [{ service: 'traslados', option: 'auto', roundTrip: true }, { service: 'buggies', option: 'doble' }, { service: 'saona', option: 'adulto' }, { service: 'coco-bongo', option: 'regular' }] },
];
