// api/storage.js - Vercel Storage Endpoint con Neon Postgres y KV
import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;

  const hasPostgres = Boolean(dbUrl);
  const hasKV = Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);

  if (!hasPostgres && !hasKV) {
    return res.status(200).json({
      enabled: false,
      message: "No hay base de datos de Vercel conectada aún. Se utiliza localStorage."
    });
  }

  const userId = req.query.userId || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ error: "Falta userId" });
  }

  // 1. Integración con Neon Postgres
  if (hasPostgres) {
    try {
      const sql = neon(dbUrl);

      // Crear tabla automáticamente si es la primera vez
      await sql`
        CREATE TABLE IF NOT EXISTS user_nutri_data (
          user_id TEXT PRIMARY KEY,
          profile JSONB,
          recipes JSONB,
          shop_list JSONB,
          semana_data JSONB,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      if (req.method === "GET") {
        const rows = await sql`
          SELECT profile, recipes, shop_list, semana_data 
          FROM user_nutri_data 
          WHERE user_id = ${userId}
        `;

        if (rows.length > 0) {
          return res.status(200).json({
            enabled: true,
            type: "neon-postgres",
            data: {
              profile: rows[0].profile,
              recipes: rows[0].recipes,
              shopList: rows[0].shop_list,
              semanaData: rows[0].semana_data,
            }
          });
        }
        return res.status(200).json({ enabled: true, type: "neon-postgres", data: null });
      }

      if (req.method === "POST") {
        const { profile, recipes, shopList, semanaData } = req.body || {};

        const pVal = profile !== undefined ? JSON.stringify(profile) : null;
        const rVal = recipes !== undefined ? JSON.stringify(recipes) : null;
        const sVal = shopList !== undefined ? JSON.stringify(shopList) : null;
        const wVal = semanaData !== undefined ? JSON.stringify(semanaData) : null;

        await sql`
          INSERT INTO user_nutri_data (user_id, profile, recipes, shop_list, semana_data, updated_at)
          VALUES (
            ${userId},
            COALESCE(${pVal}::jsonb, '{}'::jsonb),
            COALESCE(${rVal}::jsonb, '[]'::jsonb),
            COALESCE(${sVal}::jsonb, '[]'::jsonb),
            COALESCE(${wVal}::jsonb, '[]'::jsonb),
            NOW()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            profile = COALESCE(${pVal}::jsonb, user_nutri_data.profile),
            recipes = COALESCE(${rVal}::jsonb, user_nutri_data.recipes),
            shop_list = COALESCE(${sVal}::jsonb, user_nutri_data.shop_list),
            semana_data = COALESCE(${wVal}::jsonb, user_nutri_data.semana_data),
            updated_at = NOW();
        `;

        return res.status(200).json({ enabled: true, type: "neon-postgres", success: true });
      }
    } catch (err) {
      console.error("Error Neon Postgres:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Fallback KV (Upstash)
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
        const payload = JSON.stringify(req.body || {});
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

  return res.status(200).json({ enabled: false, message: "Storage no activo" });
}
