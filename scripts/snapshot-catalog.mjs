// Guarda en src/data/catalog.json una copia del catálogo de Supabase (respaldo para construir sin red).
// Uso: node scripts/snapshot-catalog.mjs   (lee PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY de .env)
import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const env = existsSync('.env')
  ? Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split('=', 2).map((s) => s.trim())))
  : {};
const url = process.env.PUBLIC_SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Faltan PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY'); process.exit(1); }

const out = buildSync({ entryPoints: ['src/lib/catalog.ts'], bundle: true, platform: 'node', format: 'esm', write: false, external: ['../data/catalog.json'] });
const tmp = join(mkdtempSync(join(tmpdir(), 'itw-')), 'catalog.mjs');
writeFileSync(tmp, out.outputFiles[0].text);
const { fetchCatalog } = await import(pathToFileURL(tmp).href);
const c = await fetchCatalog(url, key);
writeFileSync('src/data/catalog.json', JSON.stringify(c, null, 2) + '\n');
console.log(`src/data/catalog.json: ${c.services.length} tours, ${c.combos.length} combos, descuentos ${JSON.stringify(c.discounts)}`);
