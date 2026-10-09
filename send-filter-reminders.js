/**
 * POST /api/email/send-filter-reminders — ayda 1 "filtrenizi yenilemek ister misiniz?" maili
 * GitHub Actions (.github/workflows/monthly-filter.yml) her ayın 1'inde çağırır.
 *
 * Env Variables:
 *   CRON_SECRET     - Bu endpoint'i korur (GitHub Secret'taki ile aynı olmalı)
 *   RESEND_API_KEY, CODE_SECRET, MAIL_FROM_NAME (mevcut)
 *   SITE_URL        - Site adresi (varsayılan https://aquaflowtr.com)
 */
import { ensureTable, signEmail } from '../../_lib/reminders.js';

const DAY = 24 * 3600 * 1000;
const MAX_PER_RUN = 80; // Resend ücretsiz plan günlük 100 mail sınırı; kalanlar sonraki çalışmada gider

const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

  const auth = request.headers.get('Authorization') || '';
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) return json({ error: 'Yetkisiz' }, 401);
  if (!env.RESEND_API_KEY) return json({ error: 'RESEND_API_KEY eksik' }, 500);
  if (!env.DB) return json({ error: 'DB bağlı değil' }, 500);

  const site = (env.SITE_URL || 'https://aquaflowtr.com').replace(/\/$/, '');
  const fromName = env.MAIL_FROM_NAME || 'Aquaflow';
  const cutoff = Date.now() - 30 * DAY;

  await ensureTable(env);
  const { results } = await env.DB.prepare(
    `SELECT email, name FROM reminders
     WHERE COALESCE(unsubscribed,0) = 0
       AND (last_order_at IS NULL OR last_order_at < ?1)
       AND (last_sent_at IS NULL OR last_sent_at < ?1)
     LIMIT ?2`
  ).bind(cutoff, MAX_PER_RUN).all();

  let sent = 0, failed = 0;
  for (const c of results || []) {
    const sig = await signEmail(c.email, env.CODE_SECRET);
    const unsub = `${site}/api/email/unsubscribe?e=${encodeURIComponent(c.email)}&t=${sig}`;
    const hello = c.name ? `Merhaba ${esc(c.name)},` : 'Merhaba,';
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
<tr><td style="background:#0f172a;padding:28px 32px;text-align:center;"><span style="font-size:24px;font-weight:900;letter-spacing:.15em;color:#fff;">AQUA<span style="color:#38bdf8;">FLOW</span></span></td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">💧 Filtrenizi yenilemek ister misiniz?</h2>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">${hello}<br>Temiz ve sağlıklı su için filtrelerin düzenli değiştirilmesi önemlidir. Filtre değişim zamanınız geldiyse size uygun ürünleri aşağıdan inceleyebilirsiniz.</p>
<div style="text-align:center;margin-bottom:8px;"><a href="${site}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;">Aquaflow'a Git</a></div>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:11px;margin:0;">Tel: 0551 688 9214 • aquaflowymv@gmail.com</p>
<p style="color:#94a3b8;font-size:11px;margin:8px 0 0;">Bu e-postayı almak istemiyorsanız <a href="${unsub}" style="color:#64748b;">buradan çıkabilirsiniz</a>.</p>
</td></tr></table></td></tr></table></body></html>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${fromName} <noreply@aquaflowtr.com>`,
        to: [c.email],
        subject: 'Filtrenizi yenilemek ister misiniz? 💧',
        html,
        text: `${c.name ? 'Merhaba ' + c.name + ',' : 'Merhaba,'}\nFiltrenizi yenilemek ister misiniz? Ürünlerimiz: ${site}\n\nÇıkmak için: ${unsub}`,
        headers: { 'List-Unsubscribe': `<${unsub}>` }
      })
    });
    if (r.ok) {
      sent++;
      await env.DB.prepare('UPDATE reminders SET last_sent_at = ?1 WHERE email = ?2').bind(Date.now(), c.email).run();
    } else {
      failed++;
    }
  }
  return json({ ok: true, sent, failed, remainingBatch: (results || []).length === MAX_PER_RUN });
}
