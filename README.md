# iTravelow · sitio web

Sitio estático en Astro. Público, sin secretos. Se despliega solo en GitHub Pages con cada
push a `main` (ver `.github/workflows/deploy.yml`).

- Contacto y precios: un solo archivo, `src/config.ts`.
- Reglas de diseño y contenido: `docs/DESIGN_PRINCIPLES.md` del repositorio privado `itravelow/itravelow`.
- Dominio: provisional en https://itravelow.github.io. Cuando exista itravelow.com: añadir
  `public/CNAME` con el dominio, cambiar `site` en `astro.config.mjs` y apuntar el DNS.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```
