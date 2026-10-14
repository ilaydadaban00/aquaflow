// POST /api/admin/media {dataUrl} -> {url}
import { isAdmin, json } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz' }, 401);
  const { dataUrl } = await request.json();
  if (!/^data:(image|video)\/[\w.+-]+;base64,/.test(dataUrl || '')) return json({ error: 'Geçersiz dosya' }, 400);
  if (dataUrl.length > 1900000) return json({ error: 'Dosya çok büyük (en fazla ~1.4 MB)' }, 413);
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO media (id, data, created_at) VALUES (?1, ?2, ?3)').bind(id, dataUrl, Date.now()).run();
  return json({ ok: true, url: '/api/media/' + id });
}
