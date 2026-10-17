// Textos del sitio por idioma. Los tours, precios y combos vienen del catálogo (src/lib/catalog.ts),
// con sus nombres y descripciones en los dos idiomas; si falta el inglés se muestra el español.
import type { Lang } from '../config';
import { pick, pickList, type Catalog, type Unit } from '../lib/catalog';
import { es } from './es';
import { en } from './en';

export interface Dict {
  lang: Lang;
  ogLocale: string;
  title: string;
  description: string;
  ogTitle: string;
  tagline: string;
  nav: { sections: string; tours: string; combos: string; how: string; trust: string; faq: string; book: string; lang: string; langShort: string };
  hero: { h1: string; lead: string; cta1: string; cta2: string; note: string; hint: string; phoneAria: string; captions: Record<string, string> };
  units: { persona: string; personas: string; vehiculo: string; vehiculos: string; of: string; roundTrip: string; usd: string };
  tours: { h2: string; sub: string; from: string; notIncluded: string; book: string };
  // Los textos con {d2} {d3} {d4} reciben los descuentos (en %) por 2, 3 y 4 o más tours.
  combos: { h2: string; sub: string; off: string; for2: string; book: string };
  how: { h2: string; sub: string; steps: { t: string; p: string }[]; confirmAria: string; confirmKicker: string; confirmStatus: string; rows: [string, string][]; foot: string };
  trust: { h2: string; sub: string; items: { t: string; p: string }[] };
  who: { h2: string; photoAlt: string; p1: string; p2: string };
  faq: { h2: string; sub: string; items: { q: string; a: string }[] };
  contact: { h2: string; before: string; after: string };
  footer: { copy: string; note: string };
  support: { title: string; waText: string; noWaBefore: string; noWaAfter: string; openWa: string; bubble: string; waMessage: string };
  checkout: {
    title: string; close: string; option: string; date: string; people: string; less: string; more: string; roundTrip: string; errDate: string;
    thisTour: string; back: string; next: string; cartTitle: string; cartTitleN: string; change: string; remove: string; addUp: string; addMore: string;
    hotel: string; hotelPh: string; errHotel: string; total: string; oneTour: string; discountLine: string; tourXofN: string;
    name: string; whatsapp: string; whatsappPh: string; email: string; errContact: string; confirm: string; pay: string; hintPending: string; hintPay: string;
    doneTitle: string; doneMsg: string; doneMailto: string; copy: string; copied: string; done: string; summaryAria: string;
    sumPeople: string; sumHotel: string; sumDiscount: string; sumTotal: string; sumName: string; sumWhatsapp: string; sumEmail: string; summaryHeader: string; subject: string; months: string[];
  };
}

export const DICTS: Record<Lang, Dict> = { es, en };

export interface ServiceOption { id: string; label: string; price: number; unit: Unit; capacity?: number }
export interface Service {
  slug: string; image480: string; image960: string; from: number; options: ServiceOption[];
  roundTrip: boolean; minPax: number; maxPax: number;
  name: string; short: string; alt: string; fromUnit: string; time: string; includes: string[]; excludes: string[];
  optionLabel: (id: string) => string;
}

// Catálogo en un idioma: textos resueltos y "desde" calculado (la opción más barata).
export function getServices(cat: Catalog, lang: Lang): Service[] {
  return cat.services.map((s) => {
    const options = s.options.map((o) => ({ id: o.id, label: pick(o.label, lang) || o.id, price: o.price, unit: o.unit, capacity: o.capacity }));
    return {
      slug: s.slug, image480: s.image480, image960: s.image960 || s.image480,
      from: Math.min(...options.map((o) => o.price)), options,
      roundTrip: s.roundTrip, minPax: s.minPax, maxPax: s.maxPax,
      name: pick(s.name, lang), short: pick(s.short, lang), alt: pick(s.alt, lang), fromUnit: pick(s.fromUnit, lang), time: pick(s.duration, lang),
      includes: pickList(s.includes, lang), excludes: pickList(s.excludes, lang),
      optionLabel: (id: string) => (options.find((o) => o.id === id) || { label: id }).label,
    };
  });
}

export interface Combo { slug: string; name: string; blurb: string; items: { service: string; option: string; roundTrip?: boolean }[] }

// Solo combos cuyos tours y opciones existen (si un tour se despublica, el combo que lo usa se oculta).
export function getCombos(cat: Catalog, lang: Lang, services: Service[]): Combo[] {
  return cat.combos
    .filter((c) => c.items.length > 0 && c.items.every((i) => { const s = services.find((x) => x.slug === i.service); return s && s.options.some((o) => o.id === i.option); }))
    .map((c) => ({ slug: c.slug, name: pick(c.name, lang), blurb: pick(c.blurb, lang), items: c.items }));
}

// Reemplaza {clave} en una cadena: fill('Hola {n}', { n: 2 }) → 'Hola 2'.
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
