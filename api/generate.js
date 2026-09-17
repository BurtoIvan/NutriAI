// api/generate.js - Vercel Serverless Function (evita problemas de CORS en iPhone y protege la API Key)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { system, userPrompt, apiKey: userKey } = req.body || {};
    const key = userKey || process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

    if (!key) {
      return res.status(400).json({ error: "No se proporcionó una clave de API de Anthropic." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2500,
        system: system || "",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || `Error de Anthropic (${response.status})`;
      return res.status(response.status).json({ error: msg, details: data });
    }

    return res.status(200).json({ text: data.content?.[0]?.text || "" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
}
