# iTravelow · sitio web

Sitio estático en Astro. Público, sin secretos. Se publica en GitHub Pages desde la rama
`gh-pages` con `npm run deploy`. Cuando el token de GitHub tenga permiso `workflow`
(`gh auth refresh -h github.com -s workflow`), se puede activar el despliegue automático
copiando `deploy/github-actions-deploy.yml.example` a `.github/workflows/deploy.yml`.

- Contacto y precios: un solo archivo, `src/config.ts`.
- Reglas de diseño y contenido: `docs/DESIGN_PRINCIPLES.md` del repositorio privado `itravelow/itravelow`.
- Dominio: provisional en https://itravelow.github.io. Cuando exista itravelow.com: añadir
  `public/CNAME` con el dominio, cambiar `site` en `astro.config.mjs` y apuntar el DNS.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run deploy   # compila y publica en https://itravelow.github.io
```
