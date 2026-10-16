import { defineConfig } from 'astro/config';

// Hosting: Cloudflare Pages (integración con Git: cada push a main publica).
// Comando de build: npm run build · Carpeta de salida: dist
export default defineConfig({
  site: 'https://itravelow.com',
  trailingSlash: 'never',
  build: { format: 'file' },
});
