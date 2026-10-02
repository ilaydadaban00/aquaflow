/**
 * Cloudflare Pages Function: POST /api/email/verify-code
 * Stateless token doğrulama — KV gerekmez.
 *
 * Body: { email, code, token }
 */

async function verifyToken(token, email, code, secret) {
  try {
    const decoded = atob(token);
    const lastPipe = decoded.lastIndexOf('|');
    const sigHex = decoded.slice(lastPipe + 1);
    const data = decoded.slice(0, lastPipe);

    const parts = data.split('|');
    if (parts.length < 3) return { valid: false, reason: 'invalid_token' };

    const [tokenEmail, tokenCode, expiresAt] = parts;

    if (tokenEmail !== email) return { valid: false, reason: 'email_mismatch' };
    if (tokenCode !== String(code).trim()) return { valid: false, reason: 'code_mismatch' };
    if (Date.now() > parseInt(expiresAt)) return { valid: false, reason: 'expired' };

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret || 'aquaflow-secret-2025'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map(h => parseInt(h, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    return { valid, reason: valid ? 'ok' : 'bad_signature' };
  } catch (err) {
    return { valid: false, reason: 'parse_error' };
  }
}

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
  const code = String(body.code || '').trim();
  const token = String(body.token || '').trim();

  if (!email || !code || !token) {
    return new Response(JSON.stringify({ error: 'E-posta, kod ve token zorunludur.' }), { status: 400, headers: corsHeaders });
  }

  const result = await verifyToken(token, email, code, env.CODE_SECRET);

  if (!result.valid) {
    const messages = {
      expired: 'Doğrulama kodunun süresi dolmuş. Yeni kod talep edin.',
      code_mismatch: 'Doğrulama kodu hatalı. Lütfen kontrol edin.',
      email_mismatch: 'E-posta adresi eşleşmiyor.',
      bad_signature: 'Geçersiz token.',
      invalid_token: 'Geçersiz token formatı.',
      parse_error: 'Token işlenemedi.'
    };
    return new Response(
      JSON.stringify({ error: messages[result.reason] || 'Doğrulama başarısız.' }),
      { status: 400, headers: corsHeaders }
    );
  }

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
