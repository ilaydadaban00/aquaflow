/**
 * Cloudflare Pages Function: POST /api/email/send-code
 * Resend.com API ile doğrulama kodu gönderir.
 * Stateless token — KV gerekmez.
 *
 * Env Variables (Cloudflare Dashboard > Settings > Environment Variables):
 *   RESEND_API_KEY   - Resend API anahtarı (re_...)
 *   CODE_SECRET      - İmza için gizli anahtar (istediğiniz rastgele string)
 *   MAIL_FROM_NAME   - Gönderen adı (örn: Aquaflow)
 */

async function signToken(email, code, expiresAt, secret) {
  const data = `${email}|${code}|${expiresAt}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret || 'aquaflow-secret-2025'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${data}|${sigHex}`);
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  const purpose = String(body.purpose || 'register');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Geçerli bir e-posta adresi giriniz.' }), { status: 400, headers: corsHeaders });
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 dakika
  const token = await signToken(email, code, expiresAt, env.CODE_SECRET);

  const fromName = env.MAIL_FROM_NAME || 'Aquaflow';
  const fromAddress = `noreply@aquaflowtr.com`; // Verified domain

  const subject = purpose === 'reset'
    ? 'Aquaflow Şifre Sıfırlama Kodu'
    : 'Aquaflow E-Posta Doğrulama Kodu';

  const htmlBody = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0f172a;padding:28px 32px;text-align:center;">
            <span style="font-size:24px;font-weight:900;letter-spacing:0.15em;color:#ffffff;">
              AQUA<span style="color:#38bdf8;">FLOW</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">
              ${purpose === 'reset' ? '🔑 Şifre Sıfırlama' : '✉️ E-Posta Doğrulama'}
            </h2>
            <p style="color:#64748b;font-size:14px;margin:0 0 28px;">
              ${purpose === 'reset'
                ? 'Şifrenizi sıfırlamak için aşağıdaki kodu kullanın.'
                : 'Hesabınızı doğrulamak için aşağıdaki kodu kullanın.'}
            </p>
            <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin:0 auto 28px;">
              <span style="font-size:40px;font-weight:900;letter-spacing:0.3em;color:#0f172a;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              Bu kod <strong>10 dakika</strong> geçerlidir. Kimseyle paylaşmayın.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">© 2025 Aquaflow™ — Bu maili siz istemediyseniz dikkate almayınız.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Resend API ile gönder
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'Sunucu yapılandırma hatası: RESEND_API_KEY eksik.' }), { status: 500, headers: corsHeaders });
  }

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: [email],
      subject,
      html: htmlBody,
      text: `Aquaflow doğrulama kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir. Kimseyle paylaşmayın.`
    })
  });

  if (!sendRes.ok) {
    const errBody = await sendRes.json().catch(() => ({}));
    console.error('[Resend] Hata:', sendRes.status, JSON.stringify(errBody));
    // Email gitmese bile token'ı döndür — doğrulama akışı kesilmesin
    // Frontend'e emailFailed bildirimi gönder
    return new Response(JSON.stringify({ ok: true, token, resendAfter: 60, emailFailed: true, emailError: errBody?.message || String(sendRes.status) }), { status: 200, headers: corsHeaders });
  }

  // Token'ı client'a gönder (stateless — sunucuda saklama yok)
  return new Response(JSON.stringify({ ok: true, token, resendAfter: 60 }), { status: 200, headers: corsHeaders });
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
