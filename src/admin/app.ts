// Panel de administración. Corre en el navegador contra Supabase con la clave pública;
// las políticas RLS (itw_admins) son las que deciden quién puede escribir.
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

type L = { es?: string; en?: string };
type LList = { es?: string[]; en?: string[] };
interface Option { id?: string; service_id?: string; key: string; sort: number; label: L; price: number; unit: 'persona' | 'vehiculo'; capacity: number | null }
interface Service {
  id?: string; slug: string; sort: number; published: boolean; image_480: string | null; image_960: string | null; round_trip: boolean;
  min_pax: number; max_pax: number; name: L; short: L; alt: L; from_unit: L; duration: L; includes: LList; excludes: LList;
  itw_service_options?: Option[];
}
interface ComboItem { service: string; option: string; roundTrip?: boolean }
interface Combo { id?: string; slug: string; sort: number; published: boolean; name: L; blurb: L; items: ComboItem[] }
interface Publish { id: number; requested_by: string; requested_at: string; status: string; detail: string }

const body = document.body;
const URL_ = body.dataset.supabaseUrl || '';
const KEY = body.dataset.supabaseKey || '';
const SITE = body.dataset.site || '/';
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
const panel = $('[data-panel]');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

let sb: SupabaseClient;
let services: Service[] = [];
let combos: Combo[] = [];
let settings: Record<string, any> = {};
let publishes: Publish[] = [];
let tab = 'tours';
let dirty = false;

// ---------- arranque y sesión ----------
if (!URL_ || !KEY) {
  $('[data-view="login"]').innerHTML = '<p class="msg err">Falta configurar PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY al construir el sitio.</p>';
} else {
  sb = createClient(URL_, KEY);
  boot();
}

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  await onSession(session);
  sb.auth.onAuthStateChange((_e, s) => { if (!s) showLogin(); });
  $('[data-login]').addEventListener('submit', async (e) => { e.preventDefault(); await login(false); });
  $('[data-signup]').addEventListener('click', () => login(true));
  $('[data-logout]').addEventListener('click', async () => { await sb.auth.signOut(); showLogin(); });
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab!)));
  $('[data-gopublish]').addEventListener('click', () => show('publish'));
}

async function login(signup: boolean) {
  const f = $('[data-login]') as HTMLFormElement;
  const email = (f.elements.namedItem('email') as HTMLInputElement).value.trim();
  const password = (f.elements.namedItem('password') as HTMLInputElement).value;
  const msg = $('[data-loginmsg]');
  msg.hidden = true;
  if (!email || password.length < 8) { msg.textContent = 'Escribe el correo y una contraseña de al menos 8 caracteres.'; msg.hidden = false; return; }
  const r = signup ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (r.error) { msg.textContent = traducirError(r.error.message); msg.hidden = false; return; }
  if (signup && !r.data.session) { msg.className = 'msg info'; msg.textContent = 'Cuenta creada. Revisa tu correo, confirma la cuenta y vuelve aquí a entrar.'; msg.hidden = false; return; }
  await onSession(r.data.session);
}

function traducirError(m: string): string {
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene cuenta: usa "Entrar".';
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar el correo. Abre el enlace que te llegó y vuelve a entrar.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.';
  return m;
}

function showLogin() {
  $('[data-view="login"]').hidden = false; $('[data-view="app"]').hidden = true; $('[data-who]').hidden = true; $('[data-dirty]').hidden = true;
}

async function onSession(session: Session | null) {
  if (!session) { showLogin(); return; }
  const { data: isAdmin, error } = await sb.rpc('itw_is_admin');
  if (error || !isAdmin) {
    const msg = $('[data-loginmsg]'); msg.className = 'msg err';
    msg.textContent = error ? 'No se pudo comprobar el permiso: ' + error.message : `La cuenta ${session.user.email} no tiene permiso de administración.`;
    msg.hidden = false; await sb.auth.signOut(); showLogin(); return;
  }
  $('[data-email]').textContent = session.user.email || '';
  await reload();
  $('[data-who]').hidden = false; $('[data-view="login"]').hidden = true; $('[data-view="app"]').hidden = false;
  show(tab);
}

async function reload() {
  const [s, c, st, p] = await Promise.all([
    sb.from('itw_services').select('*, itw_service_options(*)').order('sort').order('slug'),
    sb.from('itw_combos').select('*').order('sort').order('slug'),
    sb.from('itw_settings').select('key, value, updated_at'),
    sb.from('itw_publishes').select('*').order('id', { ascending: false }).limit(8),
  ]);
  const err = s.error || c.error || st.error || p.error;
  if (err) { global('No se pudo cargar el catálogo: ' + err.message, 'err'); return; }
  services = (s.data as Service[]).map((x) => ({ ...x, itw_service_options: (x.itw_service_options || []).sort((a, b) => a.sort - b.sort) }));
  combos = c.data as Combo[];
  settings = Object.fromEntries((st.data || []).map((r: any) => [r.key, r.value]));
  publishes = p.data as Publish[];
  // ¿Hay cambios posteriores a la última publicación enviada?
  const lastPub = publishes.find((x) => x.status === 'sent');
  const stamp = (x: any) => Date.parse(x.updated_at) || 0;
  const lastChange = Math.max(0, ...services.map(stamp), ...combos.map(stamp), ...(st.data || []).map(stamp));
  dirty = !lastPub || lastChange > Date.parse(lastPub.requested_at);
  $('[data-dirty]').hidden = !dirty;
}

function global(text: string, kind: 'ok' | 'err' | 'info' = 'info') {
  const m = $('[data-globalmsg]'); m.className = 'msg ' + kind; m.textContent = text; m.hidden = !text;
  if (kind === 'ok') setTimeout(() => { if (m.textContent === text) m.hidden = true; }, 4000);
}

function show(name: string) {
  tab = name;
  $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  global('');
  if (name === 'tours') renderTours();
  else if (name === 'combos') renderCombos();
  else if (name === 'settings') renderSettings();
  else if (name === 'publish') renderPublish();
  window.scrollTo({ top: 0 });
}

const fmtPrice = (n: number) => (Math.round(n * 100) / 100).toString();
const imgUrl = (p: string | null) => (!p ? '' : p.startsWith('http') ? p : SITE + p);

// ---------- Tours ----------
function renderTours() {
  panel.innerHTML = `
    <div class="card">
      <h2>Tours y precios</h2>
      <p class="sub">Lo que ves aquí es lo que sale en la página, en el mismo orden. Los precios son de venta al público, en USD.</p>
      <div class="list" data-list></div>
      <div class="actions"><button class="btn btn-primary" type="button" data-new>+ Nuevo tour</button></div>
    </div>`;
  const list = $('[data-list]', panel);
  if (!services.length) list.innerHTML = '<p class="sub">Todavía no hay tours.</p>';
  services.forEach((s, i) => {
    const opts = s.itw_service_options || [];
    const from = opts.length ? Math.min(...opts.map((o) => Number(o.price))) : 0;
    const el = document.createElement('div'); el.className = 'item';
    el.innerHTML = `
      ${s.image_480 ? `<img src="${esc(imgUrl(s.image_480))}" alt="" />` : '<div class="thumb">sin foto</div>'}
      <div><b>${esc(s.name.es || s.slug)}${s.published ? '' : '<span class="badge off">oculto</span>'}</b>
        <span class="meta">desde ${fmtPrice(from)} USD · ${opts.length} ${opts.length === 1 ? 'opción' : 'opciones'}: ${esc(opts.map((o) => `${o.label.es || o.key} ${fmtPrice(Number(o.price))}`).join(', '))}</span></div>
      <div class="ops">
        <button type="button" title="Subir" aria-label="Subir" data-up ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" title="Bajar" aria-label="Bajar" data-down ${i === services.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn btn-ghost btn-sm" type="button" data-edit>Editar</button>
      </div>`;
    $('[data-edit]', el).addEventListener('click', () => editTour(s));
    $('[data-up]', el).addEventListener('click', () => move('itw_services', services, i, -1).then(renderTours));
    $('[data-down]', el).addEventListener('click', () => move('itw_services', services, i, 1).then(renderTours));
    list.appendChild(el);
  });
  $('[data-new]', panel).addEventListener('click', () => editTour(null));
}

async function move(table: string, arr: any[], i: number, dir: 1 | -1) {
  const j = i + dir; if (j < 0 || j >= arr.length) return;
  const a = arr[i], b = arr[j];
  const sa = a.sort, sbb = b.sort;
  const newA = sa === sbb ? sbb + (dir > 0 ? 1 : -1) : sbb, newB = sa === sbb ? sa : sa;
  const r1 = await sb.from(table).update({ sort: newA }).eq('id', a.id);
  const r2 = await sb.from(table).update({ sort: newB }).eq('id', b.id);
  if (r1.error || r2.error) { global('No se pudo reordenar: ' + (r1.error || r2.error)!.message, 'err'); return; }
  await reload();
}

const lField = (label: string, name: string, v: L, kind: 'input' | 'textarea' = 'input', hint = '') => `
  <div class="lang2">
    <label class="field"><span>${label} ${hint ? `<small>${hint}</small>` : ''}</span>${kind === 'input' ? `<input type="text" name="${name}_es" value="${esc(v?.es)}" />` : `<textarea name="${name}_es">${esc(v?.es)}</textarea>`}</label>
    <label class="field"><span>${label}</span>${kind === 'input' ? `<input type="text" name="${name}_en" value="${esc(v?.en)}" />` : `<textarea name="${name}_en">${esc(v?.en)}</textarea>`}</label>
  </div>`;
const listField = (label: string, name: string, v: LList, hint: string) => `
  <div class="lang2">
    <label class="field"><span>${label} <small>${hint}</small></span><textarea name="${name}_es">${esc((v?.es || []).join('\n'))}</textarea></label>
    <label class="field"><span>${label}</span><textarea name="${name}_en">${esc((v?.en || []).join('\n'))}</textarea></label>
  </div>`;

function editTour(s: Service | null) {
  const isNew = !s;
  const t: Service = s ? JSON.parse(JSON.stringify(s)) : { slug: '', sort: (Math.max(0, ...services.map((x) => x.sort)) + 10), published: true, image_480: null, image_960: null, round_trip: false, min_pax: 1, max_pax: 20, name: {}, short: {}, alt: {}, from_unit: { es: 'por persona', en: 'per person' }, duration: {}, includes: { es: [], en: [] }, excludes: { es: [], en: [] }, itw_service_options: [] };
  let opts: Option[] = (t.itw_service_options || []).map((o) => ({ ...o }));
  if (!opts.length) opts.push({ key: '', sort: 0, label: {}, price: 0, unit: 'persona', capacity: null });
  let pendingPhoto: File | null = null;

  panel.innerHTML = `
    <form class="card" data-tourform novalidate>
      <h2>${isNew ? 'Nuevo tour' : 'Editar: ' + esc(t.name.es || t.slug)}</h2>
      <p class="sub">Lo de la izquierda es lo que ve el turista en español. El inglés es opcional: si lo dejas vacío se usa el español.</p>
      <p class="msg err" data-err hidden></p>

      <h3>Foto</h3>
      <div class="photo">
        <img data-preview src="${esc(imgUrl(t.image_960 || t.image_480))}" alt="" ${t.image_480 ? '' : 'hidden'} />
        <div><input type="file" name="photo" accept="image/*" /><br /><small class="sub">Horizontal, se recorta a 4:3 y se reduce sola. Material propio o con permiso.</small></div>
      </div>

      <h3>Datos</h3>
      ${lField('Nombre', 'name', t.name)}
      <div class="grid2">
        <label class="field"><span>Identificador en la URL <small>(solo minúsculas, números y guiones${isNew ? '' : '; no se cambia'})</small></span><input type="text" name="slug" value="${esc(t.slug)}" ${isNew ? '' : 'readonly'} /></label>
        <label class="check" style="margin-top:28px"><input type="checkbox" name="published" ${t.published ? 'checked' : ''} /> Visible en la página</label>
      </div>
      ${lField('Frase corta', 'short', t.short, 'input', '(una línea)')}
      ${lField('Duración y horario', 'duration', t.duration, 'input', '(ej. "3 a 4 horas · salidas en la mañana")')}
      ${listField('Incluye', 'includes', t.includes, '(una cosa por línea)')}
      ${listField('No incluye', 'excludes', t.excludes, '(una cosa por línea)')}
      ${lField('Descripción de la foto', 'alt', t.alt, 'input', '(para lectores de pantalla y Google)')}

      <h3>Precios</h3>
      <p class="sub">Cada opción es una tarifa. "Por persona" multiplica por la cantidad de personas; "por vehículo" cobra por vehículo según cuántas personas caben.</p>
      <table class="opts"><thead><tr><th>Clave</th><th>Nombre (es)</th><th>Nombre (en)</th><th>Precio USD</th><th>Cobro</th><th>Caben</th><th></th></tr></thead><tbody data-opts></tbody></table>
      <button class="link" type="button" data-addopt>+ Añadir opción</button>
      <div class="grid2" style="margin-top:14px">
        ${lField('Texto bajo el precio "desde"', 'from_unit', t.from_unit, 'input', '(ej. "por persona")')}
      </div>
      <div class="grid2">
        <label class="check"><input type="checkbox" name="round_trip" ${t.round_trip ? 'checked' : ''} /> Ofrecer "ida y vuelta" (cobra el doble)</label>
        <div class="grid2">
          <label class="field"><span>Mínimo de personas</span><input type="number" name="min_pax" min="1" value="${t.min_pax}" /></label>
          <label class="field"><span>Máximo de personas</span><input type="number" name="max_pax" min="1" value="${t.max_pax}" /></label>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="submit" data-save>Guardar</button>
        <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
        <span class="spacer"></span>
        ${isNew ? '' : '<button class="btn btn-danger" type="button" data-delete>Borrar tour</button>'}
      </div>
    </form>`;
  const form = $('[data-tourform]', panel) as HTMLFormElement;
  const tbody = $('[data-opts]', form);
  const renderOpts = () => {
    tbody.innerHTML = '';
    opts.forEach((o, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" data-k="key" value="${esc(o.key)}" placeholder="adulto" /></td>
        <td><input type="text" data-k="es" value="${esc(o.label.es)}" placeholder="Adulto" /></td>
        <td><input type="text" data-k="en" value="${esc(o.label.en)}" placeholder="Adult" /></td>
        <td><input type="number" data-k="price" min="0" step="0.01" value="${fmtPrice(Number(o.price))}" /></td>
        <td><select data-k="unit"><option value="persona" ${o.unit === 'persona' ? 'selected' : ''}>por persona</option><option value="vehiculo" ${o.unit === 'vehiculo' ? 'selected' : ''}>por vehículo</option></select></td>
        <td><input type="number" data-k="capacity" min="1" value="${o.capacity ?? ''}" placeholder="4" ${o.unit === 'vehiculo' ? '' : 'disabled'} /></td>
        <td class="rm"><button type="button" aria-label="Quitar opción" ${opts.length === 1 ? 'disabled' : ''}>×</button></td>`;
      $$('[data-k]', tr).forEach((inp) => inp.addEventListener('input', () => {
        const k = inp.dataset.k!, v = (inp as HTMLInputElement).value;
        if (k === 'key') o.key = slugify(v); else if (k === 'es') o.label.es = v; else if (k === 'en') o.label.en = v;
        else if (k === 'price') o.price = Number(v); else if (k === 'unit') { o.unit = v as Option['unit']; renderOpts(); }
        else if (k === 'capacity') o.capacity = v ? Number(v) : null;
      }));
      $('button', tr).addEventListener('click', () => { opts.splice(i, 1); renderOpts(); });
      tbody.appendChild(tr);
    });
  };
  renderOpts();
  $('[data-addopt]', form).addEventListener('click', () => { opts.push({ key: '', sort: opts.length * 10, label: {}, price: 0, unit: 'persona', capacity: null }); renderOpts(); });
  const nameEs = form.elements.namedItem('name_es') as HTMLInputElement;
  const slugInp = form.elements.namedItem('slug') as HTMLInputElement;
  if (isNew) nameEs.addEventListener('input', () => { if (!slugInp.dataset.touched) slugInp.value = slugify(nameEs.value); });
  slugInp.addEventListener('input', () => { slugInp.dataset.touched = '1'; slugInp.value = slugify(slugInp.value); });
  (form.elements.namedItem('photo') as HTMLInputElement).addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; pendingPhoto = f;
    const img = $('[data-preview]', form) as HTMLImageElement; img.src = URL.createObjectURL(f); img.hidden = false;
  });
  $('[data-cancel]', form).addEventListener('click', renderTours);
  const del = $('[data-delete]', form); if (del) del.addEventListener('click', () => deleteTour(t));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-err]', form); err.hidden = true;
    const v = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement)?.value ?? '').trim();
    const L2 = (n: string): L => ({ es: v(n + '_es'), en: v(n + '_en') });
    const LL = (n: string): LList => ({ es: v(n + '_es').split('\n').map((x) => x.trim()).filter(Boolean), en: v(n + '_en').split('\n').map((x) => x.trim()).filter(Boolean) });
    const slug = slugify(v('slug'));
    const problems: string[] = [];
    if (!v('name_es')) problems.push('Falta el nombre en español.');
    if (!SLUG.test(slug)) problems.push('El identificador debe tener solo minúsculas, números y guiones.');
    if (isNew && services.some((x) => x.slug === slug)) problems.push('Ya existe un tour con ese identificador.');
    const clean = opts.map((o, i) => ({ ...o, key: slugify(o.key), sort: i * 10, price: Number(o.price), capacity: o.unit === 'vehiculo' ? (o.capacity || 4) : null }));
    if (!clean.length) problems.push('Hace falta al menos una opción de precio.');
    clean.forEach((o, i) => {
      if (!SLUG.test(o.key)) problems.push(`Opción ${i + 1}: falta la clave (ej. "adulto").`);
      if (!o.label.es) problems.push(`Opción ${i + 1}: falta el nombre en español.`);
      if (!(o.price >= 0)) problems.push(`Opción ${i + 1}: precio inválido.`);
    });
    if (new Set(clean.map((o) => o.key)).size !== clean.length) problems.push('Hay dos opciones con la misma clave.');
    const minPax = Math.max(1, Number(v('min_pax')) || 1), maxPax = Math.max(minPax, Number(v('max_pax')) || minPax);
    if (problems.length) { err.innerHTML = problems.map(esc).join('<br />'); err.hidden = false; err.scrollIntoView({ block: 'center' }); return; }
    const save = $('[data-save]', form) as HTMLButtonElement; save.disabled = true; save.textContent = 'Guardando…';
    try {
      const row: Partial<Service> = {
        slug, published: (form.elements.namedItem('published') as HTMLInputElement).checked, round_trip: (form.elements.namedItem('round_trip') as HTMLInputElement).checked,
        min_pax: minPax, max_pax: maxPax, name: L2('name'), short: L2('short'), alt: L2('alt'), from_unit: L2('from_unit'), duration: L2('duration'), includes: LL('includes'), excludes: LL('excludes'), sort: t.sort,
      };
      if (pendingPhoto) {
        save.textContent = 'Subiendo foto…';
        const stamp = Date.now();
        const [b960, b480] = await Promise.all([resize(pendingPhoto, 960, 720), resize(pendingPhoto, 480, 360)]);
        row.image_960 = await upload(`tours/${slug}-960-${stamp}.webp`, b960);
        row.image_480 = await upload(`tours/${slug}-480-${stamp}.webp`, b480);
      }
      let id = t.id;
      if (isNew) { const r = await sb.from('itw_services').insert(row).select('id').single(); if (r.error) throw r.error; id = r.data.id; }
      else { const r = await sb.from('itw_services').update(row).eq('id', id!); if (r.error) throw r.error; }
      const keep = clean.map((o) => o.key);
      const d = await sb.from('itw_service_options').delete().eq('service_id', id!).not('key', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`); if (d.error) throw d.error;
      const u = await sb.from('itw_service_options').upsert(clean.map((o) => ({ service_id: id, key: o.key, sort: o.sort, label: o.label, price: o.price, unit: o.unit, capacity: o.capacity })), { onConflict: 'service_id,key' }); if (u.error) throw u.error;
      if (pendingPhoto) await removeImages([t.image_480, t.image_960]).catch(() => {});
      await reload(); renderTours(); global(`Tour "${row.name!.es}" guardado. Recuerda publicar para que salga en la página.`, 'ok');
    } catch (ex: any) {
      err.textContent = 'No se pudo guardar: ' + (ex.message || ex); err.hidden = false; save.disabled = false; save.textContent = 'Guardar';
    }
  });
}

async function deleteTour(t: Service) {
  const used = combos.filter((c) => c.items.some((i) => i.service === t.slug));
  if (used.length) { global(`No se puede borrar: lo usan los combos ${used.map((c) => `"${c.name.es || c.slug}"`).join(', ')}. Quítalo de esos combos primero, o déjalo oculto.`, 'err'); return; }
  if (!confirm(`¿Borrar el tour "${t.name.es || t.slug}" y sus precios? Si solo quieres que no se vea, desmarca "Visible" en vez de borrarlo.`)) return;
  const r = await sb.from('itw_services').delete().eq('id', t.id!);
  if (r.error) { global('No se pudo borrar: ' + r.error.message, 'err'); return; }
  await removeImages([t.image_480, t.image_960]).catch(() => {});
  await reload(); renderTours(); global('Tour borrado.', 'ok');
}

// Recorta a 4:3 (centrado) y reduce; devuelve WebP.
function resize(file: File, w: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.max(w / img.width, h / img.height); const sw = w / r, sh = h / r; const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/webp', 0.82);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen')); img.src = url;
  });
}
async function upload(path: string, blob: Blob): Promise<string> {
  const r = await sb.storage.from('itravelow').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
  if (r.error) throw new Error('foto: ' + r.error.message);
  return sb.storage.from('itravelow').getPublicUrl(path).data.publicUrl;
}
// Borra del bucket las fotos que ya no se usan (solo las que están en Storage; las de /img del sitio no se tocan).
async function removeImages(urls: (string | null | undefined)[]) {
  const paths = urls.map((u) => (u || '').split('/storage/v1/object/public/itravelow/')[1]).filter(Boolean) as string[];
  if (paths.length) await sb.storage.from('itravelow').remove(paths);
}

// ---------- Combos ----------
function renderCombos() {
  panel.innerHTML = `
    <div class="card">
      <h2>Combos</h2>
      <p class="sub">Un combo prellena la reserva con varios tours. El descuento no se fija aquí: sale de la pestaña "Descuentos" según cuántos tours lleve la reserva.</p>
      <div class="list" data-list></div>
      <div class="actions"><button class="btn btn-primary" type="button" data-new>+ Nuevo combo</button></div>
    </div>`;
  const list = $('[data-list]', panel);
  if (!combos.length) list.innerHTML = '<p class="sub">Todavía no hay combos.</p>';
  combos.forEach((c, i) => {
    const lines = c.items.map((it) => { const s = services.find((x) => x.slug === it.service); const o = s?.itw_service_options?.find((x) => x.key === it.option); return `${s?.name.es || it.service}: ${o?.label.es || it.option}${it.roundTrip ? ', ida y vuelta' : ''}`; });
    const broken = c.items.some((it) => { const s = services.find((x) => x.slug === it.service); return !s || !s.published || !s.itw_service_options?.some((x) => x.key === it.option); });
    const el = document.createElement('div'); el.className = 'item';
    el.innerHTML = `
      <div class="thumb">${c.items.length} tours</div>
      <div><b>${esc(c.name.es || c.slug)}${c.published ? '' : '<span class="badge off">oculto</span>'}${broken ? '<span class="badge off">usa un tour oculto o borrado</span>' : ''}</b><span class="meta">${esc(lines.join(' · '))}</span></div>
      <div class="ops">
        <button type="button" aria-label="Subir" data-up ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" aria-label="Bajar" data-down ${i === combos.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn btn-ghost btn-sm" type="button" data-edit>Editar</button>
      </div>`;
    $('[data-edit]', el).addEventListener('click', () => editCombo(c));
    $('[data-up]', el).addEventListener('click', () => move('itw_combos', combos, i, -1).then(renderCombos));
    $('[data-down]', el).addEventListener('click', () => move('itw_combos', combos, i, 1).then(renderCombos));
    list.appendChild(el);
  });
  $('[data-new]', panel).addEventListener('click', () => editCombo(null));
}

function editCombo(c: Combo | null) {
  const isNew = !c;
  const t: Combo = c ? JSON.parse(JSON.stringify(c)) : { slug: '', sort: Math.max(0, ...combos.map((x) => x.sort)) + 10, published: true, name: {}, blurb: {}, items: [] };
  panel.innerHTML = `
    <form class="card" data-comboform novalidate>
      <h2>${isNew ? 'Nuevo combo' : 'Editar: ' + esc(t.name.es || t.slug)}</h2>
      <p class="msg err" data-err hidden></p>
      ${lField('Nombre', 'name', t.name)}
      ${lField('Descripción', 'blurb', t.blurb, 'textarea')}
      <div class="grid2">
        <label class="field"><span>Identificador en la URL <small>(solo minúsculas, números y guiones${isNew ? '' : '; no se cambia'})</small></span><input type="text" name="slug" value="${esc(t.slug)}" ${isNew ? '' : 'readonly'} /></label>
        <label class="check" style="margin-top:28px"><input type="checkbox" name="published" ${t.published ? 'checked' : ''} /> Visible en la página</label>
      </div>
      <h3>Tours del combo</h3>
      <p class="sub">Marca los tours y elige la opción con la que se prellena. Mínimo dos.</p>
      <div class="combo-items" data-items></div>
      <div class="actions">
        <button class="btn btn-primary" type="submit" data-save>Guardar</button>
        <button class="btn btn-ghost" type="button" data-cancel>Cancelar</button>
        <span class="spacer"></span>
        ${isNew ? '' : '<button class="btn btn-danger" type="button" data-delete>Borrar combo</button>'}
      </div>
    </form>`;
  const form = $('[data-comboform]', panel) as HTMLFormElement;
  const box = $('[data-items]', form);
  services.forEach((s) => {
    const cur = t.items.find((i) => i.service === s.slug);
    const opts = s.itw_service_options || [];
    const row = document.createElement('div'); row.className = 'ci';
    row.innerHTML = `
      <label><input type="checkbox" data-on ${cur ? 'checked' : ''} /> <b>${esc(s.name.es || s.slug)}</b>${s.published ? '' : ' <span class="badge off">oculto</span>'}</label>
      <select data-opt ${cur ? '' : 'disabled'}>${opts.map((o) => `<option value="${esc(o.key)}" ${cur?.option === o.key ? 'selected' : ''}>${esc(o.label.es || o.key)} · ${fmtPrice(Number(o.price))} USD</option>`).join('')}</select>
      <label ${s.round_trip ? '' : 'hidden'}><input type="checkbox" data-rt ${cur?.roundTrip ? 'checked' : ''} ${cur ? '' : 'disabled'} /> ida y vuelta</label>`;
    const on = $('[data-on]', row) as HTMLInputElement, sel = $('[data-opt]', row) as HTMLSelectElement, rt = $('[data-rt]', row) as HTMLInputElement;
    on.addEventListener('change', () => { sel.disabled = !on.checked; rt.disabled = !on.checked; });
    row.dataset.slug = s.slug;
    box.appendChild(row);
  });
  const nameEs = form.elements.namedItem('name_es') as HTMLInputElement;
  const slugInp = form.elements.namedItem('slug') as HTMLInputElement;
  if (isNew) nameEs.addEventListener('input', () => { if (!slugInp.dataset.touched) slugInp.value = slugify(nameEs.value); });
  slugInp.addEventListener('input', () => { slugInp.dataset.touched = '1'; slugInp.value = slugify(slugInp.value); });
  $('[data-cancel]', form).addEventListener('click', renderCombos);
  const del = $('[data-delete]', form); if (del) del.addEventListener('click', async () => {
    if (!confirm(`¿Borrar el combo "${t.name.es || t.slug}"?`)) return;
    const r = await sb.from('itw_combos').delete().eq('id', t.id!);
    if (r.error) { global('No se pudo borrar: ' + r.error.message, 'err'); return; }
    await reload(); renderCombos(); global('Combo borrado.', 'ok');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-err]', form); err.hidden = true;
    const v = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement)?.value ?? '').trim();
    const slug = slugify(v('slug'));
    const items: ComboItem[] = $$('.ci', box).filter((r) => ($('[data-on]', r) as HTMLInputElement).checked).map((r) => {
      const it: ComboItem = { service: r.dataset.slug!, option: ($('[data-opt]', r) as HTMLSelectElement).value };
      if (($('[data-rt]', r) as HTMLInputElement).checked) it.roundTrip = true;
      return it;
    });
    const problems: string[] = [];
    if (!v('name_es')) problems.push('Falta el nombre en español.');
    if (!SLUG.test(slug)) problems.push('El identificador debe tener solo minúsculas, números y guiones.');
    if (isNew && combos.some((x) => x.slug === slug)) problems.push('Ya existe un combo con ese identificador.');
    if (items.length < 2) problems.push('Un combo necesita al menos dos tours.');
    if (problems.length) { err.innerHTML = problems.map(esc).join('<br />'); err.hidden = false; return; }
    const row = { slug, sort: t.sort, published: (form.elements.namedItem('published') as HTMLInputElement).checked, name: { es: v('name_es'), en: v('name_en') }, blurb: { es: v('blurb_es'), en: v('blurb_en') }, items };
    const r = isNew ? await sb.from('itw_combos').insert(row) : await sb.from('itw_combos').update(row).eq('id', t.id!);
    if (r.error) { err.textContent = 'No se pudo guardar: ' + r.error.message; err.hidden = false; return; }
    await reload(); renderCombos(); global(`Combo "${row.name.es}" guardado. Recuerda publicar.`, 'ok');
  });
}

// ---------- Descuentos y WhatsApp ----------
function renderSettings() {
  const d = settings.combo_discounts || {};
  const pct = (n: number) => d[n] != null ? Math.round(Number(d[n]) * 1000) / 10 : '';
  panel.innerHTML = `
    <form class="card" data-setform novalidate>
      <h2>Descuentos por combinar tours</h2>
      <p class="sub">Se aplican al total de la reserva según cuántos tours distintos lleve. Vacío o 0 = sin descuento en ese tramo. Los textos de la página ("Dos tours: 5 % menos…") se actualizan solos al publicar.</p>
      <p class="msg err" data-err hidden></p>
      <div class="grid2">
        <label class="field"><span>2 tours (%)</span><input type="number" name="d2" min="0" max="90" step="0.5" value="${pct(2)}" /></label>
        <label class="field"><span>3 tours (%)</span><input type="number" name="d3" min="0" max="90" step="0.5" value="${pct(3)}" /></label>
        <label class="field"><span>4 tours o más (%)</span><input type="number" name="d4" min="0" max="90" step="0.5" value="${pct(4)}" /></label>
      </div>
      <h2 style="margin-top:10px">WhatsApp de asistencia</h2>
      <p class="sub">Número internacional sin "+" ni espacios, ej. 18095551234. Vacío = el botón de asistencia muestra el correo.</p>
      <label class="field"><span>Número</span><input type="tel" name="whatsapp" value="${esc(settings.whatsapp || '')}" placeholder="18095551234" /></label>
      <div class="actions"><button class="btn btn-primary" type="submit" data-save>Guardar</button></div>
    </form>
    <form class="card" data-pwform novalidate>
      <h2>Tu contraseña</h2>
      <label class="field"><span>Nueva contraseña <small>(mínimo 8 caracteres)</small></span><input type="password" name="pw" autocomplete="new-password" minlength="8" /></label>
      <div class="actions"><button class="btn btn-ghost" type="submit">Cambiar contraseña</button></div>
    </form>`;
  const form = $('[data-setform]', panel) as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-err]', form); err.hidden = true;
    const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value.trim();
    const disc: Record<string, number> = {};
    const vals = [2, 3, 4].map((n) => Number(v('d' + n)) || 0);
    if (vals.some((x) => x < 0 || x > 90)) { err.textContent = 'Los descuentos van de 0 a 90 %.'; err.hidden = false; return; }
    if (vals[1] < vals[0] || vals[2] < vals[1]) { err.textContent = 'Cada tramo debería tener igual o más descuento que el anterior.'; err.hidden = false; return; }
    [2, 3, 4].forEach((n, i) => { if (vals[i] > 0) disc[n] = Math.round(vals[i] * 10) / 1000; });
    const wa = v('whatsapp').replace(/\D/g, '');
    const r = await sb.from('itw_settings').upsert([{ key: 'combo_discounts', value: disc }, { key: 'whatsapp', value: wa }]);
    if (r.error) { err.textContent = 'No se pudo guardar: ' + r.error.message; err.hidden = false; return; }
    await reload(); renderSettings(); global('Ajustes guardados. Recuerda publicar.', 'ok');
  });
  $('[data-pwform]', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = ($('[data-pwform] input', panel) as HTMLInputElement).value;
    if (pw.length < 8) { global('La contraseña debe tener al menos 8 caracteres.', 'err'); return; }
    const r = await sb.auth.updateUser({ password: pw });
    global(r.error ? 'No se pudo cambiar: ' + r.error.message : 'Contraseña cambiada.', r.error ? 'err' : 'ok');
  });
}

// ---------- Publicar ----------
function renderPublish() {
  const fmt = (iso: string) => new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  panel.innerHTML = `
    <div class="card">
      <h2>Publicar en itravelow.com</h2>
      <p class="sub">Guardar aquí no cambia la página de inmediato: el sitio se vuelve a construir con el catálogo y tarda unos 2 minutos en salir. Si el botón falla, igual se publica solo dos veces al día.</p>
      <p class="msg" data-pubmsg ${dirty ? 'class="msg info"' : 'hidden'}>${dirty ? 'Hay cambios guardados que todavía no están publicados.' : ''}</p>
      <div class="actions">
        <button class="btn btn-primary" type="button" data-publish>Publicar ahora</button>
        <a class="btn btn-ghost" href="${esc(SITE)}" target="_blank" rel="noopener">Ver la página</a>
        <a class="btn btn-ghost" href="https://github.com/itravelow/site/actions" target="_blank" rel="noopener">Ver el avance</a>
      </div>
      <h3>Últimas publicaciones</h3>
      <ul class="hist">${publishes.length ? publishes.map((p) => `<li><span>${fmt(p.requested_at)}</span><span class="badge ${p.status === 'sent' ? 'ok' : 'err'}">${p.status === 'sent' ? 'enviada' : 'error'}</span><span>${esc(p.detail || '')}</span></li>`).join('') : '<li>Todavía ninguna desde el panel.</li>'}</ul>
    </div>`;
  $('[data-publish]', panel).addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement; b.disabled = true; b.textContent = 'Enviando…';
    const { data, error } = await sb.functions.invoke('itw-publish', { body: {} });
    let text: string, kind: 'ok' | 'err';
    if (error) {
      let detail = '';
      try { const j = await (error as any).context?.json(); detail = j?.detail || j?.error || ''; } catch {}
      text = detail || 'No se pudo pedir la publicación: ' + error.message; kind = 'err';
    } else if (data?.status === 'sent') { text = 'Publicación en marcha. En unos 2 minutos los cambios estarán en la página.'; kind = 'ok'; }
    else { text = data?.detail || 'No se pudo publicar.'; kind = 'err'; }
    await reload(); renderPublish();
    const m = $('[data-pubmsg]', panel); m.className = 'msg ' + kind; m.textContent = text; m.hidden = false;
  });
}
