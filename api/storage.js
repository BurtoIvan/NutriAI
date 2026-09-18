// api/storage.js - Vercel Storage Endpoint con Neon Postgres y KV
import { neon } from "@neondatabase/serverless";

// Cache a nivel de contenedor serverless para evitar DDL en cada request
let isSchemaReady = false;

async function ensureSchema(sql) {
  if (isSchemaReady) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_nutri_data (
        user_id TEXT PRIMARY KEY,
        profile JSONB DEFAULT '{}'::jsonb,
        recipes JSONB DEFAULT '[]'::jsonb,
        shop_list JSONB DEFAULT '[]'::jsonb,
        semana_data JSONB DEFAULT '[]'::jsonb,
        extras JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE user_nutri_data ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '[]'::jsonb;`;
    isSchemaReady = true;
  } catch (err) {
    console.warn("[Schema Init Warning]:", err.message);
  }
}

export default async function handler(req, res) {
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
      message: "No hay base de datos conectada. Usando almacenamiento local."
    });
  }

  // Validación y normalización estricta del userId
  const rawId = req.query.userId || req.body?.userId;
  if (!rawId || typeof rawId !== "string" || !rawId.trim()) {
    return res.status(400).json({ error: "Falta userId válido" });
  }
  const userId = rawId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  if (userId.length < 2) {
    return res.status(400).json({ error: "El userId debe tener al menos 2 caracteres" });
  }

  // 1. Integración con Neon Postgres
  if (hasPostgres) {
    try {
      const sql = neon(dbUrl);
      await ensureSchema(sql);

      if (req.method === "GET") {
        const rows = await sql`
          SELECT profile, recipes, shop_list, semana_data, extras 
          FROM user_nutri_data 
          WHERE user_id = ${userId}
        `;

        if (rows.length > 0) {
          return res.status(200).json({
            enabled: true,
            type: "neon-postgres",
            data: {
              profile: rows[0].profile || null,
              recipes: rows[0].recipes || [],
              shopList: rows[0].shop_list || [],
              semanaData: rows[0].semana_data || [],
              extras: rows[0].extras || [],
            }
          });
        }
        return res.status(200).json({ enabled: true, type: "neon-postgres", data: null });
      }

      if (req.method === "POST") {
        const { profile, recipes, shopList, semanaData, extras } = req.body || {};

        const pVal = profile !== undefined ? JSON.stringify(profile) : null;
        const rVal = recipes !== undefined ? JSON.stringify(recipes) : null;
        const sVal = shopList !== undefined ? JSON.stringify(shopList) : null;
        const wVal = semanaData !== undefined ? JSON.stringify(semanaData) : null;
        const eVal = extras !== undefined ? JSON.stringify(extras) : null;

        await sql`
          INSERT INTO user_nutri_data (user_id, profile, recipes, shop_list, semana_data, extras, updated_at)
          VALUES (
            ${userId},
            COALESCE(${pVal}::jsonb, '{}'::jsonb),
            COALESCE(${rVal}::jsonb, '[]'::jsonb),
            COALESCE(${sVal}::jsonb, '[]'::jsonb),
            COALESCE(${wVal}::jsonb, '[]'::jsonb),
            COALESCE(${eVal}::jsonb, '[]'::jsonb),
            NOW()
          )
          ON CONFLICT (user_id) DO UPDATE SET
            profile = COALESCE(${pVal}::jsonb, user_nutri_data.profile),
            recipes = COALESCE(${rVal}::jsonb, user_nutri_data.recipes),
            shop_list = COALESCE(${sVal}::jsonb, user_nutri_data.shop_list),
            semana_data = COALESCE(${wVal}::jsonb, user_nutri_data.semana_data),
            extras = COALESCE(${eVal}::jsonb, user_nutri_data.extras),
            updated_at = NOW();
        `;

        return res.status(200).json({ enabled: true, type: "neon-postgres", success: true });
      }
    } catch (err) {
      console.error("[Neon Postgres Error]:", err);
      return res.status(500).json({ error: "Error de servidor al acceder a la base de datos." });
    }
  }

  // 2. Fallback KV (Upstash)
  if (hasKV) {
    const key = `user_data:${encodeURIComponent(userId)}`;
    if (req.method === "GET") {
      try {
        const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
        });
        const result = await response.json();
        const data = result.result ? JSON.parse(result.result) : null;
        return res.status(200).json({ enabled: true, type: "kv", data });
      } catch (err) {
        console.error("[KV Read Error]:", err);
        return res.status(500).json({ error: "Error al leer datos remotos." });
      }
    }

    if (req.method === "POST") {
      try {
        let existing = {};
        try {
          const resExisting = await fetch(`${KV_REST_API_URL}/get/${key}`, {
            headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
          });
          const parsed = await resExisting.json();
          if (parsed.result) existing = JSON.parse(parsed.result);
        } catch {}

        const merged = { ...existing, ...req.body };
        const payload = JSON.stringify(merged);
        await fetch(`${KV_REST_API_URL}/set/${key}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
          body: payload
        });
        return res.status(200).json({ enabled: true, type: "kv", success: true });
      } catch (err) {
        console.error("[KV Write Error]:", err);
        return res.status(500).json({ error: "Error al guardar datos remotos." });
      }
    }
  }

  return res.status(405).json({ error: "Método no permitido" });
}
