/**
 * POST /api/paytr/callback — PayTR "Bildirim URL". PayTR panelinde şu adres girilmeli:
 *   https://www.aquaflowtr.com/api/paytr/callback
 * İmza doğrulanır, ödeme durumu D1'e yazılır, yöneticiye e-posta gider.
 * PayTR'a mutlaka düz "OK" metni dönmelidir.
 */
const enc = new TextEncoder();
async function hmacB64(message, key) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  let bin = ''; new Uint8Array(sig).forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestPost({ request, env }) {
  const text = (s, st = 200) => new Response(s, { status: st, headers: { 'Content-Type': 'text/plain' } });
  if (!env.PAYTR_MERCHANT_KEY || !env.PAYTR_MERCHANT_SALT || !env.DB) return text('config', 500);

  const f = await request.formData();
  const oid = String(f.get('merchant_oid') || '');
  const status = String(f.get('status') || '');
  const totalAmount = String(f.get('total_amount') || '');
  const hash = String(f.get('hash') || '');

  const expected = await hmacB64(oid + env.PAYTR_MERCHANT_SALT + status + totalAmount, env.PAYTR_MERCHANT_KEY);
  if (!same(expected, hash)) return text('PAYTR notification failed: bad hash', 400);

  const row = await env.DB.prepare('SELECT * FROM paytr_payments WHERE oid = ?1').bind(oid).first();
  if (!row) return text('OK'); // bilinmeyen sipariş: tekrar denemesin
  if (row.status !== 'pending') return text('OK'); // zaten işlendi

  const newStatus = status === 'success' ? 'paid' : 'failed';
  await env.DB.prepare('UPDATE paytr_payments SET status = ?1 WHERE oid = ?2').bind(newStatus, oid).run();

  if (newStatus === 'paid' && env.RESEND_API_KEY) {
    try {
      const o = JSON.parse(row.order_json || '{}');
      const lines = (o.basket || []).map(i => `<li>${esc(i[0])} × ${esc(i[2])} — ${esc(i[1])} ₺</li>`).join('');
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: `${env.MAIL_FROM_NAME || 'Aquaflow'} <noreply@aquaflowtr.com>`,
          to: [env.ADMIN_EMAIL || 'aquaflowymv@gmail.com'],
          subject: `💳 PayTR ödeme alındı — ${o.clientOrderId || oid} — ${(Number(totalAmount) / 100).toFixed(2)} TL`,
          html: `<p><b>Sipariş:</b> ${esc(o.clientOrderId || oid)}<br><b>Müşteri:</b> ${esc(o.name)} — ${esc(o.phone)} — ${esc(o.email)}<br><b>Adres:</b> ${esc(o.address)}</p><ul>${lines}</ul><p><b>Tahsil edilen:</b> ${(Number(totalAmount) / 100).toFixed(2)} TL</p>`
        })
      });
    } catch (e) { /* PayTR'a OK dönmeyi asla bozma */ }
  }
  return text('OK');
}
