// api/generate.js - Vercel Serverless Function con auto-fallback de modelos
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
    const { system, userPrompt, apiKey: userKey, max_tokens: reqTokens, model: requestedModel } = req.body || {};
    const key = userKey || process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

    if (!key) {
      return res.status(400).json({ error: "No se proporcionó una clave de API de Anthropic." });
    }

    // Modelos reales y verificados, priorizando el más rápido para evitar límites de tiempo en Serverless
    const baseModels = [
      "claude-3-5-haiku-20241022",
      "claude-3-haiku-20240307",
      "claude-3-5-sonnet-20241022",
      "claude-3-7-sonnet-20250219"
    ];
    const CANDIDATE_MODELS = requestedModel
      ? [...new Set([requestedModel, ...baseModels])]
      : baseModels;

    const maxTokens = Number(reqTokens) || 1800;
    let lastError = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key.trim(),
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: model,
            max_tokens: maxTokens,
            system: system || "",
            messages: [{ role: "user", content: userPrompt }],
          }),
        });

        const data = await response.json();

        if (response.ok) {
          return res.status(200).json({ text: data.content?.[0]?.text || "", modelUsed: model });
        }

        // Si es error de autenticacion o creditos, retornar inmediatamente
        const errMsg = data.error?.message || "";
        if (response.status === 401 || errMsg.toLowerCase().includes("invalid x-api-key")) {
          return res.status(401).json({ error: "La clave API de Anthropic es inválida. Verificala en Perfil." });
        }
        if (response.status === 400 && errMsg.toLowerCase().includes("credit balance")) {
          return res.status(400).json({ error: "Tu cuenta de Anthropic no tiene créditos suficientes." });
        }

        // Si el modelo específico no fue encontrado (404), probamos el siguiente
        if (response.status === 404 || errMsg.toLowerCase().includes("model")) {
          lastError = errMsg || `Modelo ${model} no disponible`;
          continue;
        }

        return res.status(response.status).json({ error: errMsg || `Error ${response.status}`, details: data });
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({ error: `No se pudo conectar con ningún modelo de Claude: ${lastError}` });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
}
