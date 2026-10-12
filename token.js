/**
 * POST /api/paytr/token — PayTR iFrame API için ödeme token'ı üretir.
 * Tutarı SUNUCU hesaplar (ürün fiyatları D1'den), istemciden gelen fiyata güvenilmez.
 *
 * Env: PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT
 *      PAYTR_TEST_MODE  ("1" = test, boş/0 = canlı)
 *      SITE_URL         (örn. https://www.aquaflowtr.com)
 */
const enc = new TextEncoder();
const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });

async function hmacB64(message, key) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  let bin = ''; new Uint8Array(sig).forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}
const b64Utf8 = (s) => { const u = enc.encode(s); let bin = ''; u.forEach(b => bin += String.fromCharCode(b)); return btoa(bin); };

export async function onRequestPost({ request, env }) {
  const { PAYTR_MERCHANT_ID: mid, PAYTR_MERCHANT_KEY: mkey, PAYTR_MERCHANT_SALT: salt } = env;
  if (!mid || !mkey || !salt) return j({ error: 'PayTR ayarları eksik (PAYTR_MERCHANT_ID / KEY / SALT)' }, 500);
  if (!env.DB) return j({ error: 'DB bağlı değil' }, 500);

  let b;
  try { b = await request.json(); } catch { return j({ error: 'Geçersiz istek' }, 400); }
  const items = Array.isArray(b.items) ? b.items : [];
  const email = String(b.email || '').trim();
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').trim();
  const address = String(b.address || '').trim();
  if (!items.length || !email || !name || !phone || !address) return j({ error: 'Eksik bilgi' }, 400);

  // Ürün fiyatlarını D1'den al
  const { results } = await env.DB.prepare('SELECT data FROM products').all();
  const catalog = {};
  for (const r of results || []) { try { const p = JSON.parse(r.data); catalog[p.id] = p; } catch {} }

  const basket = [];
  let subtotal = 0;
  for (const it of items) {
    const p = catalog[it.productId];
    const qty = Math.max(1, Math.min(50, parseInt(it.quantity, 10) || 1));
    if (!p) return j({ error: `Ürün bulunamadı: ${it.productId}` }, 422);
    const price = Number(p.price);
    subtotal += price * qty;
    basket.push([String(p.title || it.productId).slice(0, 100) + (it.variant ? ` (${it.variant})` : ''), price.toFixed(2), qty]);
  }
  const shipping = subtotal > 0 && subtotal < 500 ? 39 : 0; // app.js ile aynı kural
  if (shipping) basket.push(['Kargo', shipping.toFixed(2), 1]);
  const total = subtotal + shipping;
  const paymentAmount = String(Math.round(total * 100)); // kuruş

  const clientOrderId = String(b.orderId || '');
  const base = clientOrderId.replace(/[^A-Za-z0-9]/g, '') || 'AQ';
  const oid = base + Date.now().toString(36).toUpperCase(); // sadece harf+rakam olmalı
  const userIp = request.headers.get('CF-Connecting-IP') || '1.1.1.1';
  const site = (env.SITE_URL || 'https://www.aquaflowtr.com').replace(/\/$/, '');
  const testMode = env.PAYTR_TEST_MODE === '1' ? '1' : '0';
  const userBasket = b64Utf8(JSON.stringify(basket));
  const noInstallment = '0', maxInstallment = '0', currency = 'TL';

  const hashStr = mid + userIp + oid + email + paymentAmount + userBasket + noInstallment + maxInstallment + currency + testMode;
  const paytrToken = await hmacB64(hashStr + salt, mkey);

  const form = new URLSearchParams({
    merchant_id: mid, user_ip: userIp, merchant_oid: oid, email, payment_amount: paymentAmount,
    paytr_token: paytrToken, user_basket: userBasket, debug_on: testMode, no_installment: noInstallment,
    max_installment: maxInstallment, user_name: name, user_address: address, user_phone: phone,
    merchant_ok_url: `${site}/?paytr=ok&oid=${oid}`, merchant_fail_url: `${site}/?paytr=fail&oid=${oid}`,
    timeout_limit: '30', currency, test_mode: testMode, lang: 'tr'
  });

  const r = await fetch('https://www.paytr.com/odeme/api/get-token', { method: 'POST', body: form });
  const res = await r.json().catch(() => ({}));
  if (res.status !== 'success') return j({ error: 'PayTR token alınamadı', reason: res.reason || 'bilinmiyor' }, 502);

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS paytr_payments (
       oid TEXT PRIMARY KEY, amount INTEGER, status TEXT, order_json TEXT, created_at INTEGER)`
  ).run();
  await env.DB.prepare(
    `INSERT INTO paytr_payments (oid, amount, status, order_json, created_at) VALUES (?1, ?2, 'pending', ?3, ?4)`
  ).bind(oid, Number(paymentAmount), JSON.stringify({ clientOrderId, name, email, phone, address, basket, total }), Date.now()).run();

  return j({ ok: true, token: res.token, oid });
}
