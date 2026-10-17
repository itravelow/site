// Función "Publicar" del panel: comprueba que quien llama es administrador y le pide a GitHub
// que vuelva a construir y publicar el sitio (repository_dispatch → .github/workflows/deploy.yml).
// Secretos (en Supabase → Edge Functions → Secrets, nunca en el repo):
//   GITHUB_TOKEN  token fine-grained del repo itravelow/site con permiso Contents: read and write
//   GITHUB_REPO   opcional, por defecto "itravelow/site"
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(jwt);
  if (!user) return json({ error: 'Sin sesión' }, 401);
  const { data: isAdmin } = await sb.rpc('itw_is_admin');
  if (!isAdmin) return json({ error: 'Esta cuenta no es administradora' }, 403);

  const token = Deno.env.get('GITHUB_TOKEN');
  const repo = Deno.env.get('GITHUB_REPO') ?? 'itravelow/site';
  let status: 'sent' | 'error' = 'sent';
  let detail = '';
  if (!token) {
    status = 'error';
    detail = 'Falta el secreto GITHUB_TOKEN en la función itw-publish. Los cambios ya están guardados y saldrán en la próxima publicación automática.';
  } else {
    const r = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'itravelow-admin' },
      body: JSON.stringify({ event_type: 'publish', client_payload: { by: user.email ?? '' } }),
    });
    if (r.status !== 204) { status = 'error'; detail = `GitHub respondió ${r.status}: ${(await r.text()).slice(0, 300)}`; }
  }
  await sb.from('itw_publishes').insert({ requested_by: user.email ?? '', status, detail });
  return json({ status, detail }, status === 'sent' ? 200 : 502);
});
