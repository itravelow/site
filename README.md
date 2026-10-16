# iTravelow · sitio web

Sitio en Astro. Público, sin secretos. Hosting: **Cloudflare Pages** conectado a este
repositorio: cada push a `main` publica en https://itravelow.com.

- Build: `npm run build` · salida: `dist`
- Contacto y precios: un solo archivo, `src/config.ts`.
- Reglas de diseño y contenido: `docs/DESIGN_PRINCIPLES.md` del repositorio privado `itravelow/itravelow`.
- Cabeceras de seguridad y caché: `public/_headers`.

```
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

Próximo paso técnico (semana 2): páginas privadas (mis reservas, QR) con el adaptador
`@astrojs/cloudflare` y Supabase Auth.
