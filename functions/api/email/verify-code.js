/**
 * Cloudflare Pages Function: POST /api/email/verify-code
 * 6 haneli doğrulama kodunu kontrol eder.
 */

const inMemoryCodes = new Map();

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz istek.' }), { status: 400, headers: corsHeaders });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const inputCode = String(body.code || '').trim();

  if (!email || !inputCode) {
    return new Response(JSON.stringify({ error: 'E-posta ve kod zorunludur.' }), { status: 400, headers: corsHeaders });
  }

  let storedData;
  if (env.AQUAFLOW_CODES) {
    const raw = await env.AQUAFLOW_CODES.get(`code:${email}`);
    storedData = raw ? JSON.parse(raw) : null;
  } else {
    storedData = inMemoryCodes.get(`code:${email}`) || null;
  }

  if (!storedData) {
    return new Response(JSON.stringify({ error: 'Doğrulama kodu bulunamadı veya süresi dolmuş.' }), { status: 400, headers: corsHeaders });
  }

  if (Date.now() > storedData.expiresAt) {
    if (env.AQUAFLOW_CODES) await env.AQUAFLOW_CODES.delete(`code:${email}`);
    else inMemoryCodes.delete(`code:${email}`);
    return new Response(JSON.stringify({ error: 'Doğrulama kodunun süresi dolmuş. Yeni kod talep edin.' }), { status: 400, headers: corsHeaders });
  }

  if (storedData.code !== inputCode) {
    return new Response(JSON.stringify({ error: 'Doğrulama kodu hatalı.' }), { status: 400, headers: corsHeaders });
  }

  // Başarılı — kodu sil (tek kullanım)
  if (env.AQUAFLOW_CODES) await env.AQUAFLOW_CODES.delete(`code:${email}`);
  else inMemoryCodes.delete(`code:${email}`);

  return new Response(JSON.stringify({ ok: true, verified: true }), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
