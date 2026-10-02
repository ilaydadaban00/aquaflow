/**
 * Cloudflare Pages Function: POST /api/email/send-order
 * Sipariş onay maili gönderir (müşteriye + admin'e).
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  let order;
  try {
    order = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Geçersiz istek.' }), { status: 400, headers: corsHeaders });
  }

  const fromAddress = env.MAIL_FROM_ADDRESS || 'aquaflowymv@gmail.com';
  const fromName = env.MAIL_FROM_NAME || 'Aquaflow';
  const adminEmail = env.ADMIN_EMAIL || 'aquaflowymv@gmail.com';

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;">${item.title}${item.variant ? ` (${item.variant})` : ''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${Math.round(item.price * item.quantity).toLocaleString('tr-TR')} ₺</td>
    </tr>
  `).join('');

  const customerHtml = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0f172a;padding:28px 32px;text-align:center;">
            <span style="font-size:24px;font-weight:900;letter-spacing:0.15em;color:#ffffff;">
              AQUA<span style="color:#38bdf8;">FLOW</span>
            </span>
            <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Sipariş Onayı</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;">✅ Siparişiniz Alındı!</h2>
            <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Sayın <strong>${order.fullname || ''}</strong>, siparişiniz başarıyla kaydedildi ve hazırlanmaya başladı.</p>
            
            <div style="background:#f1f5f9;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Sipariş No</p>
              <p style="margin:0;font-size:18px;font-weight:900;color:#0f172a;font-family:monospace;">#${order.id || ''}</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <thead>
                <tr>
                  <th style="text-align:left;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">Ürün</th>
                  <th style="text-align:center;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">Adet</th>
                  <th style="text-align:right;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">Tutar</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="text-align:right;margin-bottom:24px;">
              <p style="margin:4px 0;font-size:13px;color:#64748b;">Ara Toplam: <strong>${Math.round(order.subtotal || 0).toLocaleString('tr-TR')} ₺</strong></p>
              <p style="margin:4px 0;font-size:13px;color:#64748b;">Kargo: <strong>${Math.round(order.shipping || 0).toLocaleString('tr-TR')} ₺</strong></p>
              <p style="margin:8px 0 0;font-size:16px;font-weight:900;color:#0f172a;">Toplam: ${Math.round(order.total || 0).toLocaleString('tr-TR')} ₺</p>
            </div>

            <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;border-left:3px solid #38bdf8;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Teslimat Adresi</p>
              <p style="margin:0;font-size:13px;color:#334155;">${order.fullname || ''} &bull; ${order.phone || ''}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#334155;">${order.city || ''} / ${order.district || ''}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#334155;">${order.address || ''}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Ödeme: ${order.paymentMethod === 'kapida' ? '🚪 Kapıda Ödeme' : '💳 Kredi/Banka Kartı'}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:11px;margin:0;">Siparişlerinizi <strong>aquaflowymv@gmail.com</strong> adresiyle veya 0551 688 9214 numarasıyla takip edebilirsiniz.</p>
            <p style="color:#94a3b8;font-size:11px;margin:6px 0 0;">© 2025 Aquaflow™ — Tüm hakları saklıdır.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const adminHtml = `
<html><body style="font-family:Arial,sans-serif;padding:20px;color:#334155;">
  <h2>🛒 Yeni Sipariş Geldi! #${order.id}</h2>
  <p><strong>Müşteri:</strong> ${order.fullname} — ${order.phone} — ${order.email || ''}</p>
  <p><strong>Adres:</strong> ${order.city} / ${order.district} — ${order.address}</p>
  <p><strong>Ödeme:</strong> ${order.paymentMethod === 'kapida' ? 'Kapıda Ödeme' : 'Kredi/Banka Kartı'}</p>
  <p><strong>Toplam:</strong> ${Math.round(order.total || 0).toLocaleString('tr-TR')} ₺</p>
  <hr/>
  <ul>${(order.items || []).map(i => `<li>${i.title} x${i.quantity} — ${Math.round(i.price * i.quantity).toLocaleString('tr-TR')} ₺</li>`).join('')}</ul>
</body></html>`;

  const recipients = [{ email: order.email }];
  // Eğer müşteri e-postası varsa admin'e de gönder
  const adminRecipients = [{ email: adminEmail }];

  async function sendMail(to, subject, html, text) {
    return fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to }],
        from: { email: fromAddress, name: fromName },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html }
        ]
      })
    });
  }

  const promises = [];

  // Müşteriye gönder (email varsa)
  if (order.email) {
    promises.push(sendMail(
      recipients,
      `Aquaflow Sipariş Onayı #${order.id}`,
      customerHtml,
      `Siparişiniz alındı! Sipariş No: #${order.id}. Toplam: ${Math.round(order.total || 0)} TL`
    ));
  }

  // Admin'e bildirim gönder
  promises.push(sendMail(
    adminRecipients,
    `🛒 Yeni Sipariş #${order.id} — ${Math.round(order.total || 0)} TL`,
    adminHtml,
    `Yeni sipariş: #${order.id} — ${order.fullname} — ${Math.round(order.total || 0)} TL`
  ));

  await Promise.allSettled(promises);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
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
