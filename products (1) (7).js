// GET /api/products -> herkes ürünleri okur
import { json } from '../_lib/auth.js';
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT data FROM products ORDER BY updated_at DESC').all();
  return json(results.map(r => JSON.parse(r.data)));
}
