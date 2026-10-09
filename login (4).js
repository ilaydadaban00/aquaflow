// POST /api/admin/login {email,password} -> {token}
import { makeToken, verifyPbkdf2, json } from '../../_lib/auth.js';
export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'SESSION_SECRET eksik' }, 500);
  let b; try { b = await request.json(); } catch { return json({ error: 'Geçersiz istek' }, 400); }
  const email = String(b.email || '').trim().toLowerCase();
  const user = await env.DB.prepare('SELECT password_hash, role FROM users WHERE email=?1').bind(email).first();
  if (!user || user.role !== 'admin' || !(await verifyPbkdf2(String(b.password || ''), user.password_hash)))
    return json({ error: 'E-posta veya şifre hatalı' }, 401);
  return json({ ok: true, token: await makeToken(email, env.SESSION_SECRET) });
}
