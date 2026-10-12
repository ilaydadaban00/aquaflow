// GET /api/products -> herkes ürünleri okur
import { json } from '../_lib/auth.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare('SELECT data FROM products ORDER BY updated_at DESC').all();
    if (!results || results.length === 0) {
      return json([]);
    }
    return json(results.map(r => JSON.parse(r.data)));
  } catch (err) {
    console.error('D1 products read error:', err);
    return json([], 200);
  }
}
