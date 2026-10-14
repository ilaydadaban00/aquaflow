// POST /api/discounts/validate {code} -> {ok, code, amount}   (herkese açık; kullanım hakkını düşürmez)
import { json } from '../../_lib/auth.js';
import { findUsable } from '../../_lib/discounts.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'DB bağlı değil' }, 500);
  let b; try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
  const r = await findUsable(env, b.code);
  if (!r.ok) return json({ ok: false, error: r.error }, 422);
  return json({ ok: true, code: r.row.code, amount: r.row.amount });
}
