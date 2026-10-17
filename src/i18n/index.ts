// Textos del sitio por idioma. Los precios y la estructura viven en src/config.ts.
import { SERVICES, COMBOS, type Lang, type ServiceData, type ComboData } from '../config';
import { es } from './es';
import { en } from './en';

export interface ServiceText {
  name: string;
  short: string;
  alt: string;
  fromUnit: string;
  time: string;
  includes: string[];
  excludes: string[];
  options: Record<string, string>; // id de opción → etiqueta
}

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
  combos: { h2: string; sub: string; off: string; for2: string; book: string };
  how: { h2: string; sub: string; steps: { t: string; p: string }[]; confirmAria: string; confirmKicker: string; confirmStatus: string; rows: [string, string][]; foot: string };
  trust: { h2: string; sub: string; items: { t: string; p: string }[] };
  who: { h2: string; photoSoon: string; p1: string; p2: string };
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
  services: Record<string, ServiceText>;
  combosText: Record<string, { name: string; blurb: string }>;
}

export const DICTS: Record<Lang, Dict> = { es, en };

export interface Service extends ServiceData, Omit<ServiceText, 'options'> {
  optionLabel: (id: string) => string;
}

export function getServices(lang: Lang): Service[] {
  const t = DICTS[lang];
  return SERVICES.map((s) => {
    const tx = t.services[s.slug];
    if (!tx) throw new Error(`Falta el texto de "${s.slug}" en i18n/${lang}.ts`);
    const { options: labels, ...text } = tx;
    return { ...s, ...text, optionLabel: (id: string) => labels[id] ?? id };
  });
}

export interface Combo extends ComboData { name: string; blurb: string }

export function getCombos(lang: Lang): Combo[] {
  const t = DICTS[lang];
  return COMBOS.map((c) => {
    const tx = t.combosText[c.slug];
    if (!tx) throw new Error(`Falta el texto del combo "${c.slug}" en i18n/${lang}.ts`);
    return { ...c, ...tx };
  });
}

// Reemplaza {clave} en una cadena: fill('Hola {n}', { n: 2 }) → 'Hola 2'.
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
