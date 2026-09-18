// api/storage.js - Vercel Storage Endpoint (Postgres / KV / Upstash)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { KV_REST_API_URL, KV_REST_API_TOKEN, POSTGRES_URL } = process.env;

  // Verificamos si hay alguna base de Vercel conectada
  const hasKV = Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
  const hasPostgres = Boolean(POSTGRES_URL);

  if (!hasKV && !hasPostgres) {
    return res.status(200).json({
      enabled: false,
      message: "No hay base de datos de Vercel conectada aún. Se utiliza localStorage."
    });
  }

  const userId = req.query.userId || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: "Falta userId" });
  }

  // Si tiene Vercel KV (Upstash)
  if (hasKV) {
    const key = `user_data:${userId}`;

    if (req.method === "GET") {
      try {
        const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
        });
        const result = await response.json();
        const data = result.result ? JSON.parse(result.result) : null;
        return res.status(200).json({ enabled: true, type: "kv", data });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (req.method === "POST") {
      try {
        const payload = JSON.stringify(req.body.data || {});
        await fetch(`${KV_REST_API_URL}/set/${key}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
          body: payload
        });
        return res.status(200).json({ enabled: true, type: "kv", success: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  return res.status(200).json({ enabled: false, message: "Storage disponible pero no configurado" });
}
