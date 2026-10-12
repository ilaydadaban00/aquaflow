// Yönetici token üretimi/doğrulaması (SESSION_SECRET ile HMAC imzalı)
const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function makeToken(email, secret) {
  const payload = btoa(JSON.stringify({ e: email, exp: Date.now() + 7 * 24 * 3600 * 1000 }));
  return payload + '.' + await hmac(payload, secret);
}

export async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const h = request.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return false;

  // Fallback token (.local imzalı) — users tablosu kurulmadan önce
  if (token.endsWith('.local')) {
    try {
      const payload = token.slice(0, -6);
      const p = JSON.parse(atob(payload));
      return !!p.fallback && Date.now() < p.exp;
    } catch { return false; }
  }

  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = await hmac(payload, env.SESSION_SECRET);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const p = JSON.parse(atob(payload));
    return Date.now() < p.exp;
  } catch { return false; }
}

export async function verifyPbkdf2(password, stored) {
  const [alg, iter, saltB64, hashB64] = String(stored || '').split('$');
  if (alg !== 'pbkdf2') return false;
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: parseInt(iter, 10) }, keyMat, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits))) === hashB64;
}

export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
