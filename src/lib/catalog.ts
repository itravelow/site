// Catálogo (tours, opciones, combos, descuentos, WhatsApp). La fuente de verdad es Supabase,
// que Andrés edita desde /admin. El sitio es estático: lee el catálogo al construirse
// (GitHub Actions o `npm run deploy`). Si no hay acceso a Supabase usa src/data/catalog.json,
// una copia que se refresca con `node scripts/snapshot-catalog.mjs`.
// Aquí solo hay precios de venta al público; los costos de operador nunca pasan por el sitio.
import type { Lang } from '../config';

export type Unit = 'persona' | 'vehículo';
export interface L { es?: string; en?: string }
export interface LList { es?: string[]; en?: string[] }

export interface CatalogOption { id: string; label: L; price: number; unit: Unit; capacity?: number }
export interface CatalogService {
  slug: string; sort: number; image480: string; image960: string;
  roundTrip: boolean; minPax: number; maxPax: number;
  name: L; short: L; alt: L; fromUnit: L; duration: L; includes: LList; excludes: LList;
  options: CatalogOption[];
}
export interface CatalogCombo { slug: string; sort: number; name: L; blurb: L; items: { service: string; option: string; roundTrip?: boolean }[] }
export interface Catalog {
  services: CatalogService[];
  combos: CatalogCombo[];
  discounts: Record<number, number>; // nº de tours → descuento (0.05 = 5 %); aplica el umbral más alto alcanzado
  whatsapp: string; // internacional sin "+", vacío = aún no activo
  source: 'supabase' | 'snapshot';
  fetchedAt: string;
}

export function pick(l: L | undefined, lang: Lang): string { return (l && (l[lang] || l.es)) || ''; }
export function pickList(l: LList | undefined, lang: Lang): string[] { const a = l && l[lang]; return (a && a.length ? a : l && l.es) || []; }
export function discountFor(discounts: Record<number, number>, n: number): number {
  let d = 0;
  Object.keys(discounts).map(Number).sort((a, b) => a - b).forEach((k) => { if (n >= k) d = discounts[k]; });
  return d;
}

type Row = Record<string, any>;
const toUnit = (u: string): Unit => (u === 'vehiculo' ? 'vehículo' : 'persona');

// GET con node:https sin keep-alive. Con fetch (undici), Node 24 en Windows a veces aborta al
// salir ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)") y el deploy no sigue.
async function getJson(fullUrl: string, headers: Record<string, string>): Promise<Row[]> {
  const https = await import('node:https');
  return new Promise((resolve, reject) => {
    const req = https.get(fullUrl, { headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if ((res.statusCode || 500) >= 400) reject(new Error(`${res.statusCode} ${body.slice(0, 300)}`));
        else { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

export async function fetchCatalog(url: string, key: string): Promise<Catalog> {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (path: string): Promise<Row[]> => {
    try { return await getJson(`${url}/rest/v1/${path}`, headers); }
    catch (e) { throw new Error(`Supabase ${path}: ${(e as Error).message}`); }
  };
  const [services, combos, settings] = await Promise.all([
    get('itw_services?select=*,itw_service_options(*)&published=is.true&order=sort.asc,slug.asc&itw_service_options.order=sort.asc'),
    get('itw_combos?select=*&published=is.true&order=sort.asc,slug.asc'),
    get('itw_settings?select=key,value'),
  ]);
  const setting = (k: string, fallback: any) => { const row = settings.find((s) => s.key === k); return row ? row.value : fallback; };
  const rawDisc = (setting('combo_discounts', {}) || {}) as Record<string, number>;
  const discounts: Record<number, number> = {};
  Object.keys(rawDisc).forEach((k) => { const n = Number(k); const v = Number(rawDisc[k]); if (n >= 2 && v > 0) discounts[n] = v; });
  return {
    services: services.map((s): CatalogService => ({
      slug: s.slug, sort: s.sort, image480: s.image_480 || '', image960: s.image_960 || s.image_480 || '',
      roundTrip: Boolean(s.round_trip), minPax: s.min_pax, maxPax: s.max_pax,
      name: s.name, short: s.short, alt: s.alt, fromUnit: s.from_unit, duration: s.duration, includes: s.includes, excludes: s.excludes,
      options: (s.itw_service_options || []).map((o: Row): CatalogOption => ({ id: o.key, label: o.label, price: Number(o.price), unit: toUnit(o.unit), capacity: o.capacity || undefined })),
    })).filter((s) => s.options.length > 0),
    combos: combos.map((c): CatalogCombo => ({ slug: c.slug, sort: c.sort, name: c.name, blurb: c.blurb, items: c.items || [] })),
    discounts,
    whatsapp: String(setting('whatsapp', '') || ''),
    source: 'supabase',
    fetchedAt: new Date().toISOString(),
  };
}

let cached: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (!cached) cached = load();
  return cached;
}

async function load(): Promise<Catalog> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const c = await fetchCatalog(url, key);
      console.log(`[catalog] ${c.services.length} tours y ${c.combos.length} combos desde Supabase`);
      return c;
    } catch (e) {
      console.warn('[catalog] No se pudo leer Supabase, se usa la copia local:', (e as Error).message);
    }
  } else {
    console.warn('[catalog] Sin PUBLIC_SUPABASE_URL/KEY: se usa la copia local src/data/catalog.json');
  }
  const snap = (await import('../data/catalog.json')).default as Catalog;
  return { ...snap, source: 'snapshot' };
}
