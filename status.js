// GET /api/paytr/status?oid=... → { status: 'pending' | 'paid' | 'failed' | 'unknown' }
export async function onRequestGet({ request, env }) {
  const oid = new URL(request.url).searchParams.get('oid') || '';
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (!oid || !env.DB) return new Response(JSON.stringify({ status: 'unknown' }), { headers: h });
  try {
    const row = await env.DB.prepare('SELECT status FROM paytr_payments WHERE oid = ?1').bind(oid).first();
    return new Response(JSON.stringify({ status: row ? row.status : 'unknown' }), { headers: h });
  } catch { return new Response(JSON.stringify({ status: 'unknown' }), { headers: h }); }
}
