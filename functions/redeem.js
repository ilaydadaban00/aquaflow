// POST /api/discounts/redeem {code} -> {ok, code, amount}   (sipariş verilirken kullanım hakkını 1 düşürür)
import { json } from '../../_lib/auth.js';
import { redeemCode } from '../../_lib/discounts.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'DB bağlı değil' }, 500);
  let b; try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
  const r = await redeemCode(env, b.code);
  if (!r.ok) return json({ ok: false, error: r.error }, 422);
  return json({ ok: true, code: r.row.code, amount: r.row.amount });
}
