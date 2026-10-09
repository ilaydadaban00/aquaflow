// POST /api/kargonomi/shipment — siparişi Kargonomi'de gönderi olarak oluşturur (sadece admin)
//
// Env Variables (Cloudflare Pages > Settings > Variables and Secrets, "Secret" olarak):
//   KARGONOMI_TOKEN   - Kargonomi destek mailindeki TOKEN
//   SENDER_NAME, SENDER_PHONE, SENDER_ADDRESS, SENDER_STATE, SENDER_CITY  (opsiyonel; yoksa Kargonomi'deki varsayılan depo kullanılır)
//   KARGONOMI_WAREHOUSE_ID  (opsiyonel: gönderici bilgisi depodan çekilir)
//
// Body: { order: { id, customerName, phone, city: "İl / İlçe", address, items:[{title,quantity}] }, desi?: number }
import { isAdmin, json } from '../../_lib/auth.js';

const BASE = 'https://app.kargonomi.com.tr/api/v1';

// Türkçe karakterleri sadeleştirip karşılaştır (İstanbul == istanbul == ISTANBUL)
const norm = (s) => String(s || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
  .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]/g, '');

async function kn(env, path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Authorization': `Bearer ${env.KARGONOMI_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

// Yanıt {data:[...]} ya da düz dizi olabilir — ikisini de destekle
const list = (b) => Array.isArray(b) ? b : (Array.isArray(b?.data) ? b.data : []);
const nameOf = (x) => x?.name ?? x?.title ?? '';

async function findId(env, path, wanted) {
  const r = await kn(env, path);
  if (!r.ok) throw new Error(`Kargonomi ${path} hata (${r.status})`);
  const w = norm(wanted);
  const hit = list(r.body).find(x => norm(nameOf(x)) === w);
  return hit ? hit.id : null;
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz' }, 401);
  if (!env.KARGONOMI_TOKEN) return json({ error: 'KARGONOMI_TOKEN eksik' }, 500);

  let payload;
  try { payload = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
  const o = payload.order || {};
  const desi = Number(payload.desi) > 0 ? Number(payload.desi) : 1;

  // Sipariş formunda il/ilçe "İstanbul / Kadıköy" olarak birleşik tutuluyor
  const [cityName, districtName] = String(o.city || '').split('/').map(s => s.trim());
  if (!o.customerName || !o.phone || !o.address || !cityName || !districtName) {
    return json({ error: 'Sipariş eksik: ad, telefon, adres, il/ilçe gerekli' }, 400);
  }

  const phone = String(o.phone).replace(/\D/g, '').slice(-10); // 10 hane, başında 0 yok
  if (phone.length !== 10) return json({ error: 'Telefon 10 haneli olmalı' }, 400);

  try {
    // Kargonomi: state = il, city = ilçe
    const stateId = await findId(env, '/states/1', cityName);
    if (!stateId) return json({ error: `İl bulunamadı: ${cityName}` }, 422);
    const cityId = await findId(env, `/cities/${stateId}`, districtName);
    if (!cityId) return json({ error: `İlçe bulunamadı: ${districtName}` }, 422);

    const shipment = {
      buyer_name: o.customerName,        // en az 2 kelime olmalı
      buyer_phone: phone,
      buyer_address: o.address,          // 10-512 karakter
      buyer_state_id: String(stateId),
      buyer_city_id: String(cityId),
      packages: [{
        content: (o.items || []).map(i => `${i.title} x${i.quantity}`).join(', ').slice(0, 250) || 'Aquaflow siparişi',
        desi: String(desi)
      }]
    };

    if (env.KARGONOMI_WAREHOUSE_ID) {
      shipment.warehouse_id = env.KARGONOMI_WAREHOUSE_ID;
    } else if (env.SENDER_NAME) {
      Object.assign(shipment, {
        sender_name: env.SENDER_NAME,
        sender_phone: env.SENDER_PHONE,
        sender_address: env.SENDER_ADDRESS,
        sender_state_id: env.SENDER_STATE,
        sender_city_id: env.SENDER_CITY
      });
    }

    const r = await kn(env, '/shipments', { method: 'POST', body: JSON.stringify({ shipment }) });
    if (!r.ok) return json({ error: 'Kargonomi gönderiyi reddetti', detail: r.body }, 502);

    const s = r.body?.data ?? r.body;
    return json({
      ok: true,
      shipmentId: s.id,
      status: s.status_label || s.status,
      trackingNo: s.shipping_webservice_tracking_code || null, // kargo firması seçilip onaylanınca dolar
      raw: s
    });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
}

// GET /api/kargonomi/shipment?id=123  → durum + takip kodu sorgula (sadece admin)
export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Yetkisiz' }, 401);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'id gerekli' }, 400);
  const r = await kn(env, `/shipments/${encodeURIComponent(id)}`);
  return json(r.body, r.ok ? 200 : 502);
}
