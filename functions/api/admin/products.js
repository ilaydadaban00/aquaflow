// POST /api/admin/products (ürün kaydet) | DELETE (ürün sil) — sadece admin
import { isAdmin, json } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz' }, 401);
  const p = await request.json();
  if (!p || !p.id) return json({ error: 'id gerekli' }, 400);
  const str = JSON.stringify(p);
  if (str.length > 1500000) return json({ error: 'Ürün verisi çok büyük' }, 413);
  await env.DB.prepare(
    'INSERT INTO products (id, data, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET data=?2, updated_at=?3'
  ).bind(p.id, str, Date.now()).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz' }, 401);
  const { id } = await request.json();
  await env.DB.prepare('DELETE FROM products WHERE id=?1').bind(id).run();
  return json({ ok: true });
}
