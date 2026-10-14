// İndirim kodu yardımcıları (Cloudflare D1: discount_codes tablosu)
export async function ensureTable(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS discount_codes (
       code TEXT PRIMARY KEY,
       amount INTEGER NOT NULL,
       max_uses INTEGER NOT NULL DEFAULT 1,
       used_count INTEGER NOT NULL DEFAULT 0,
       active INTEGER NOT NULL DEFAULT 1,
       created_at INTEGER)`
  ).run();
}

// "aq 7k3m9p" / "AQ7K3M9P" / "aq-7k3m9p" -> "AQ-7K3M9P"
export function normCode(c) {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.startsWith('AQ') && s.length === 8 ? 'AQ-' + s.slice(2) : s;
}

// Karışmayan harf/rakamlarla rastgele kod: AQ-XXXXXX
export function genCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 karakter (0,O,1,I,L yok)
  let out = '';
  while (out.length < 6) {
    const b = crypto.getRandomValues(new Uint8Array(1))[0];
    if (b < 248) out += alphabet[b % 31]; // 248 = 31*8 -> eşit dağılım
  }
  return 'AQ-' + out;
}

// Kod kullanılabilir mi? (kullanım hakkını düşürmez)
export async function findUsable(env, rawCode) {
  await ensureTable(env);
  const code = normCode(rawCode);
  if (!code) return { ok: false, error: 'Lütfen indirim kodunu girin.' };
  const row = await env.DB.prepare('SELECT * FROM discount_codes WHERE code = ?1').bind(code).first();
  if (!row) return { ok: false, error: 'Geçersiz indirim kodu.' };
  if (!row.active) return { ok: false, error: 'Bu indirim kodu artık geçerli değil.' };
  if (row.used_count >= row.max_uses) return { ok: false, error: 'Bu indirim kodunun kullanım hakkı dolmuş.' };
  return { ok: true, row };
}

// Kullanım hakkını atomik olarak 1 düşür (iki kişi aynı anda kullanamaz)
export async function redeemCode(env, rawCode) {
  await ensureTable(env);
  const code = normCode(rawCode);
  const r = await env.DB.prepare(
    'UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?1 AND active = 1 AND used_count < max_uses'
  ).bind(code).run();
  if (!r.meta || !r.meta.changes) {
    const f = await findUsable(env, code);
    return f.ok ? { ok: false, error: 'İndirim kodu kullanılamadı.' } : f;
  }
  const row = await env.DB.prepare('SELECT * FROM discount_codes WHERE code = ?1').bind(code).first();
  return { ok: true, row };
}
