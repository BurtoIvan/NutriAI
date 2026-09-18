// api/generate.js - Vercel Serverless Function con auto-detección y fallback de modelos
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
      return res.status(400).json({ error: "No se proporcionó una clave de API de Anthropic. Ingresala en la pestaña Perfil." });
    }

    const cleanKey = key.trim();

    // 1. Detectar dinámicamente modelos habilitados para esta API key consultando /v1/models
    let modelsToTry = [];
    if (requestedModel) {
      modelsToTry.push(requestedModel);
    }

    try {
      const modelsRes = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": cleanKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (modelsRes.ok) {
        const modelsJson = await modelsRes.json();
        const available = (modelsJson.data || []).map((m) => m.id);

        if (available.length > 0) {
          // Priorizamos Haiku (ultrarrápido para menús), luego Sonnet, luego otros
          const haikus = available.filter((id) => id.includes("haiku"));
          const sonnets = available.filter((id) => id.includes("sonnet"));
          const rest = available.filter((id) => !id.includes("haiku") && !id.includes("sonnet"));
          modelsToTry = [...new Set([...modelsToTry, ...haikus, ...sonnets, ...rest])];
        }
      } else {
        const errJson = await modelsRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || "";
        if (modelsRes.status === 401 || errMsg.toLowerCase().includes("invalid x-api-key")) {
          return res.status(401).json({ error: "La clave API de Anthropic es inválida. Verificala en la pestaña Perfil." });
        }
        if (modelsRes.status === 400 && (errMsg.toLowerCase().includes("credit balance") || errMsg.toLowerCase().includes("balance is too low"))) {
          return res.status(400).json({ error: "Tu cuenta de Anthropic no tiene saldo de créditos disponible en console.anthropic.com." });
        }
      }
    } catch (err) {
      console.warn("No se pudo autodetectar modelos:", err.message);
    }

    // 2. Fallback de modelos estándar si /v1/models no respondió
    if (modelsToTry.length === 0) {
      modelsToTry = [
        "claude-3-5-haiku-latest",
        "claude-3-5-haiku-20241022",
        "claude-3-haiku-20240307",
        "claude-3-5-sonnet-latest",
        "claude-3-5-sonnet-20241022",
        "claude-3-7-sonnet-latest",
        "claude-3-7-sonnet-20250219"
      ];
    }

    const maxTokens = Number(reqTokens) || 1800;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": cleanKey,
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
          return res.status(200).json({
            text: data.content?.[0]?.text || "",
            modelUsed: model,
          });
        }

        const errMsg = data.error?.message || "";
        if (response.status === 401 || errMsg.toLowerCase().includes("invalid x-api-key")) {
          return res.status(401).json({ error: "La clave API de Anthropic es inválida. Verificala en la pestaña Perfil." });
        }
        if (response.status === 400 && (errMsg.toLowerCase().includes("credit balance") || errMsg.toLowerCase().includes("balance is too low"))) {
          return res.status(400).json({ error: "Tu cuenta de Anthropic no tiene saldo de créditos disponible en console.anthropic.com." });
        }

        if (response.status === 404 || errMsg.toLowerCase().includes("model")) {
          lastError = errMsg || `Modelo ${model} no disponible`;
          continue;
        }

        return res.status(response.status).json({ error: errMsg || `Error ${response.status}`, details: data });
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({
      error: `No se pudo conectar con ningún modelo (${lastError}). Verificá tu clave y créditos en la consola de Anthropic.`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
}
