// Aylık filtre hatırlatma — müşteri listesi (D1) + imzalı "abonelikten çık" linki
const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

export async function ensureTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS reminders (
       email TEXT PRIMARY KEY,
       name TEXT,
       last_order_at INTEGER,
       last_sent_at INTEGER,
       unsubscribed INTEGER DEFAULT 0
     )`
  ).run();
}

// Müşteriyi listeye ekle/güncelle. Abonelikten çıkmış biri tekrar eklenmez (unsubscribed korunur).
export async function addCustomer(env, email, name) {
  if (!env.DB || !email) return;
  email = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
  try {
    await ensureTable(env);
    await env.DB.prepare(
      `INSERT INTO reminders (email, name, last_order_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(email) DO UPDATE SET name = COALESCE(?2, name), last_order_at = ?3`
    ).bind(email, name || null, Date.now()).run();
  } catch (e) { /* mail akışını asla bozma */ }
}

export async function signEmail(email, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret || 'aquaflow-secret-2025'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode('unsub|' + email)));
}
