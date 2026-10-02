/**
 * Cloudflare Pages Function: POST /api/email/send-code
 * Kayıt ve şifre sıfırlama için 6 haneli doğrulama kodu gönderir.
 * MailChannels üzerinden gönderim yapar (Cloudflare native, ücretsiz).
 *
 * Ortam Değişkeni (Cloudflare Dashboard > Settings > Environment Variables):
 *   MAIL_FROM_ADDRESS  - Gönderen adres, örn: aquaflowymv@gmail.com
 *   MAIL_FROM_NAME     - Gönderen adı, örn: Aquaflow
 */

// KV namespace adı: AQUAFLOW_CODES (Cloudflare Dashboard'dan bağlanmalı)
// Eğer KV yoksa, in-memory Map kullanılır (worker yeniden başladığında sıfırlanır)
const inMemoryCodes = new Map();

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
  const purpose = String(body.purpose || 'register'); // 'register' | 'reset'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Geçerli bir e-posta adresi giriniz.' }), { status: 400, headers: corsHeaders });
  }

  // Rate limiting: aynı e-posta için 60 saniye içinde tekrar gönderim engelle
  const rateLimitKey = `rl:${email}`;
  if (env.AQUAFLOW_CODES) {
    const last = await env.AQUAFLOW_CODES.get(rateLimitKey);
    if (last) {
      return new Response(JSON.stringify({ error: 'Yeni kod için lütfen 60 saniye bekleyiniz.', retryAfter: 60 }), { status: 429, headers: corsHeaders });
    }
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 dakika

  // Kodu sakla (KV varsa KV'ya, yoksa in-memory)
  const codeData = JSON.stringify({ code, expiresAt, purpose });
  if (env.AQUAFLOW_CODES) {
    await env.AQUAFLOW_CODES.put(`code:${email}`, codeData, { expirationTtl: 600 });
    await env.AQUAFLOW_CODES.put(rateLimitKey, '1', { expirationTtl: 60 });
  } else {
    inMemoryCodes.set(`code:${email}`, { code, expiresAt, purpose });
    setTimeout(() => inMemoryCodes.delete(`code:${email}`), 600000);
  }

  const fromAddress = env.MAIL_FROM_ADDRESS || 'aquaflowymv@gmail.com';
  const fromName = env.MAIL_FROM_NAME || 'Aquaflow';

  const subject = purpose === 'reset'
    ? 'Aquaflow Şifre Sıfırlama Kodu'
    : 'Aquaflow E-Posta Doğrulama Kodu';

  const htmlBody = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
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
            <div style="background:#f1f5f9;border-radius:12px;padding:24px;margin:0 auto 28px;display:inline-block;">
              <span style="font-size:36px;font-weight:900;letter-spacing:0.25em;color:#0f172a;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              Bu kod <strong>10 dakika</strong> geçerlidir. Kimseyle paylaşmayın.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">
              Bu e-postayı siz istemediyseniz dikkate almayınız. © 2025 Aquaflow™
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // MailChannels ile gönder
  try {
    const mcRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromAddress, name: fromName },
        subject,
        content: [
          { type: 'text/plain', value: `Aquaflow doğrulama kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir.` },
          { type: 'text/html', value: htmlBody }
        ]
      })
    });

    if (!mcRes.ok && mcRes.status !== 202) {
      const errText = await mcRes.text().catch(() => '');
      console.error('[MailChannels] Hata:', mcRes.status, errText);
      // MailChannels başarısız olursa kodu yine de döndür (geliştirici moduna düş)
      return new Response(JSON.stringify({
        ok: true,
        dev: true,
        code,
        resendAfter: 60,
        message: 'E-posta gönderilemedi (MailChannels hatası), geliştirici modunda devam ediliyor.'
      }), { status: 200, headers: corsHeaders });
    }
  } catch (err) {
    console.error('[MailChannels] Fetch hatası:', err);
    return new Response(JSON.stringify({
      ok: true,
      dev: true,
      code,
      resendAfter: 60,
      message: 'E-posta gönderilemedi, geliştirici modunda devam ediliyor.'
    }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, resendAfter: 60 }), { status: 200, headers: corsHeaders });
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
