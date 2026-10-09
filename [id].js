// GET /api/media/[id] -> yüklenen görsel/video
export async function onRequestGet({ env, params }) {
  const row = await env.DB.prepare('SELECT data FROM media WHERE id=?1').bind(params.id).first();
  if (!row) return new Response('Yok', { status: 404 });
  const m = /^data:([^;]+);base64,(.*)$/s.exec(row.data);
  if (!m) return new Response('Bozuk', { status: 500 });
  const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
