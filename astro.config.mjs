import { defineConfig } from 'astro/config';

// Dominio provisional (GitHub Pages). Cuando exista itravelow.com se cambia aquí y en CNAME.
export default defineConfig({
  site: 'https://itravelow.github.io',
  trailingSlash: 'never',
  build: { format: 'file' },
});
