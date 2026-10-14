// /api/admin/discounts — sadece admin
//   GET                         -> kod listesi
//   POST   {amount, maxUses?}   -> rastgele kod üretir (AQ-XXXXXX)
//   PUT    {code, active}       -> aç / kapat
//   DELETE {code}               -> sil
import { isAdmin, json } from '../../_lib/auth.js';
import { ensureTable, genCode, normCode } from '../../_lib/discounts.js';

const guard = async (request, env) => {
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz' }, 401);
  if (!env.DB) return json({ error: 'DB bağlı değil' }, 500);
  await ensureTable(env);
  return null;
};

export async function onRequestGet({ request, env }) {
  const g = await guard(request, env); if (g) return g;
  const { results } = await env.DB.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all();
  return json({ ok: true, codes: results || [] });
}

export async function onRequestPost({ request, env }) {
  const g = await guard(request, env); if (g) return g;
  let b; try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
  const amount = Math.floor(Number(b.amount));
  const maxUses = b.maxUses === undefined || b.maxUses === '' ? 1 : Math.floor(Number(b.maxUses));
  if (!(amount >= 1 && amount <= 100000)) return json({ error: 'İndirim tutarı 1 - 100.000 TL arasında olmalı' }, 400);
  if (!(maxUses >= 1 && maxUses <= 100000)) return json({ error: 'Kullanım hakkı 1 veya daha fazla olmalı' }, 400);

  for (let i = 0; i < 8; i++) {
    const code = genCode();
    try {
      await env.DB.prepare(
        'INSERT INTO discount_codes (code, amount, max_uses, used_count, active, created_at) VALUES (?1, ?2, ?3, 0, 1, ?4)'
      ).bind(code, amount, maxUses, Date.now()).run();
      return json({ ok: true, code, amount, maxUses });
    } catch (e) { /* aynı kod çıkarsa yeniden dene */ }
  }
  return json({ error: 'Kod üretilemedi, tekrar deneyin' }, 500);
}

export async function onRequestPut({ request, env }) {
  const g = await guard(request, env); if (g) return g;
  const b = await request.json().catch(() => ({}));
  await env.DB.prepare('UPDATE discount_codes SET active = ?1 WHERE code = ?2').bind(b.active ? 1 : 0, normCode(b.code)).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  const g = await guard(request, env); if (g) return g;
  const b = await request.json().catch(() => ({}));
  await env.DB.prepare('DELETE FROM discount_codes WHERE code = ?1').bind(normCode(b.code)).run();
  return json({ ok: true });
}
