// Datos fijos del sitio: marca, contacto, pasarela, idiomas y destino.
// Los tours, sus precios, los combos, los descuentos y el WhatsApp se administran en /admin
// (Supabase) y llegan al sitio por src/lib/catalog.ts. Aquí solo hay precios de venta al público,
// nunca costos de operador: esos viven en el repositorio privado (docs/MODELO_NEGOCIO.md).
// Los textos (titulares, FAQ, pasos) viven en src/i18n/es.ts y src/i18n/en.ts.

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

// Enlace de WhatsApp. `number` en formato internacional sin "+", ej. "18095551234" (se edita en
// /admin → Ajustes). Vacío = el botón de asistencia muestra el correo mientras se activa el número.
export function waLink(number: string, message: string): string {
  const n = (number || '').replace(/\D/g, '');
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

// Pasarela de pago. 'pending' = aún no hay cuenta: la reserva se registra y el enlace de
// pago se envía a mano. Cuando exista cuenta se cambia a 'stripe' o 'paypal' y se despliega
// la función /api/checkout (ver docs/MODELO_NEGOCIO.md en el repo privado).
export const PAYMENTS: { provider: 'pending' | 'stripe' | 'paypal'; currency: 'USD' } = {
  provider: 'pending',
  currency: 'USD',
};
