// GET /api/email/unsubscribe?e=<email>&t=<imza> — aylık filtre hatırlatmasından çık
import { ensureTable, signEmail } from '../../_lib/reminders.js';

const page = (msg) => new Response(
  `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aquaflow</title></head>
   <body style="font-family:Arial,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
   <div style="background:#fff;padding:32px;border-radius:16px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)">
   <h2 style="color:#0f172a">AQUA<span style="color:#38bdf8">FLOW</span></h2><p style="color:#334155">${msg}</p></div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const email = String(u.searchParams.get('e') || '').toLowerCase();
  const sig = u.searchParams.get('t') || '';
  if (!email || sig !== await signEmail(email, env.CODE_SECRET)) return page('Geçersiz bağlantı.');
  if (!env.DB) return page('Şu an işlem yapılamıyor.');
  await ensureTable(env);
  await env.DB.prepare(
    `INSERT INTO reminders (email, unsubscribed) VALUES (?1, 1)
     ON CONFLICT(email) DO UPDATE SET unsubscribed = 1`
  ).bind(email).run();
  return page('Filtre hatırlatma e-postalarından çıkarıldınız. Bir daha mail göndermeyeceğiz.');
}
