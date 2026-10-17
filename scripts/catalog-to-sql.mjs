// Genera el SQL de carga inicial (seed) del catálogo a partir de src/config.ts y src/i18n/*.ts.
// Uso: node scripts/catalog-to-sql.mjs > seed.sql   (se usó una vez, el 17 oct 2026; se conserva por si hay que recargar).
import { buildSync } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = buildSync({
  stdin: { contents: `export * from './src/config.ts'; export { DICTS } from './src/i18n/index.ts';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const tmp = join(mkdtempSync(join(tmpdir(), 'itw-')), 'catalog.mjs');
writeFileSync(tmp, out.outputFiles[0].text);
const { SERVICES, COMBOS, COMBO_DISCOUNTS, WHATSAPP_NUMBER, DICTS } = await import(pathToFileURL(tmp).href);

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const both = (pick) => ({ es: pick(DICTS.es), en: pick(DICTS.en) });
const lines = ['begin;'];
SERVICES.forEach((s, i) => {
  const tx = (d) => d.services[s.slug];
  lines.push(`insert into public.itw_services (slug, sort, published, image_480, image_960, round_trip, min_pax, max_pax, name, short, alt, from_unit, duration, includes, excludes) values (` +
    [q(s.slug), i * 10, true, q(s.image), q(s.image.replace('-480', '-960')), Boolean(s.roundTrip), s.minPax, s.maxPax,
      j(both((d) => tx(d).name)), j(both((d) => tx(d).short)), j(both((d) => tx(d).alt)), j(both((d) => tx(d).fromUnit)), j(both((d) => tx(d).time)),
      j(both((d) => tx(d).includes)), j(both((d) => tx(d).excludes))].join(', ') + ');');
  s.options.forEach((o, k) => {
    lines.push(`insert into public.itw_service_options (service_id, key, sort, label, price, unit, capacity) values ((select id from public.itw_services where slug = ${q(s.slug)}), ` +
      [q(o.id), k * 10, j(both((d) => tx(d).options[o.id])), o.price, q(o.unit === 'vehículo' ? 'vehiculo' : 'persona'), o.capacity ?? 'null'].join(', ') + ');');
  });
});
COMBOS.forEach((c, i) => {
  lines.push(`insert into public.itw_combos (slug, sort, published, name, blurb, items) values (` +
    [q(c.slug), i * 10, true, j(both((d) => d.combosText[c.slug].name)), j(both((d) => d.combosText[c.slug].blurb)), j(c.items)].join(', ') + ');');
});
lines.push(`insert into public.itw_settings (key, value) values ('combo_discounts', ${j(COMBO_DISCOUNTS)}), ('whatsapp', ${j(WHATSAPP_NUMBER)}) on conflict (key) do update set value = excluded.value;`);
lines.push('commit;');
process.stdout.write(lines.join('\n') + '\n');
