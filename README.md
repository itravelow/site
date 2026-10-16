# iTravelow · sitio web

Sitio en Astro. Público, sin secretos. Hosting: **Cloudflare Pages** (proyecto `itravelow`),
publicado con `npm run deploy` usando el token de Cloudflare del `.env` del repo privado
(variables `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`). Dominio: https://itravelow.com.

- Build: `npm run build` · salida: `dist`
- Contacto y precios: un solo archivo, `src/config.ts`.
- Reglas de diseño y contenido: `docs/DESIGN_PRINCIPLES.md` del repositorio privado `itravelow/itravelow`.
- Cabeceras de seguridad y caché: `public/_headers`.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run deploy   # compila y publica en Cloudflare Pages (requiere el token en el entorno)
```

Próximo paso técnico (semana 2): páginas privadas (mis reservas, QR) con el adaptador
`@astrojs/cloudflare` y Supabase Auth.
