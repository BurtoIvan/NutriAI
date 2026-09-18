// src/services/ai.js
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const CANDIDATE_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
  "claude-3-5-sonnet-20241022",
  "claude-3-7-sonnet-20250219"
];

export function getApiKey() {
  return localStorage.getItem("nutri_anthropic_key") || import.meta.env.VITE_ANTHROPIC_API_KEY || "";
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem("nutri_anthropic_key", key.trim());
  } else {
    localStorage.removeItem("nutri_anthropic_key");
  }
}

export async function callClaude(system, userPrompt, options = {}) {
  const apiKey = getApiKey().trim();
  const maxTokens = options.max_tokens || 1800;
  const model = options.model || "claude-3-5-haiku-20241022";

  // Intento 1: Llamar al endpoint serverless de Vercel (/api/generate)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);

    const serverlessRes = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, userPrompt, apiKey, max_tokens: maxTokens, model }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (serverlessRes.ok) {
      const data = await serverlessRes.json();
      if (data.text) return data.text;
    } else if (serverlessRes.status !== 404 && serverlessRes.status !== 504) {
      const errData = await serverlessRes.json().catch(() => ({}));
      const msg = errData.error || `Error ${serverlessRes.status}`;
      if (msg.toLowerCase().includes("credit balance") || msg.toLowerCase().includes("balance is too low")) {
        throw new Error("Tu cuenta de Anthropic no tiene créditos suficientes para usar la API.");
      }
      if (msg.toLowerCase().includes("invalid x-api-key") || msg.toLowerCase().includes("authentication_error")) {
        throw new Error("La clave API de Claude es inválida o expiró. Verificala en la pestaña Perfil.");
      }
      throw new Error(`Anthropic: ${msg}`);
    }
  } catch (err) {
    if (err.message.includes("Anthropic") || err.message.includes("créditos") || err.message.includes("clave API")) {
      throw err;
    }
  }

  // Intento 2: Llamada directa al cliente Anthropic
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return generateFallbackResponse(system, userPrompt);
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2500,
          system,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        return data.content[0].text;
      }

      const msg = data.error?.message || `Error API ${res.status}`;
      if (msg.toLowerCase().includes("credit balance")) {
        throw new Error("Tu cuenta de Anthropic no tiene créditos suficientes para la API.");
      }
      if (msg.toLowerCase().includes("invalid x-api-key")) {
        throw new Error("La clave API de Claude es inválida. Verificala en la pestaña Perfil.");
      }

      if (res.status === 404 || msg.toLowerCase().includes("model")) {
        lastError = msg;
        continue;
      }

      throw new Error(`Error de Anthropic (${res.status}): ${msg}`);
    } catch (err) {
      if (err.message.includes("créditos") || err.message.includes("clave API")) {
        throw err;
      }
      lastError = err.message;
    }
  }

  throw new Error(`No se pudo conectar con ningún modelo de Anthropic: ${lastError}`);
}

export function parseMacros(text) {
  if (!text) return null;
  const kcal = text.match(/(\d{3,4})\s*(?:kcal|cal|calorías|calorias)/i)?.[1];
  const prot = text.match(/(\d{1,3}(?:\.\d+)?)\s*g?\s*(?:proteína|proteina|prot)/i)?.[1];
  const carb = text.match(/(\d{1,3}(?:\.\d+)?)\s*g?\s*(?:carbohidrato|carbohidratos|carb|hc)/i)?.[1];
  const fat = text.match(/(\d{1,3}(?:\.\d+)?)\s*g?\s*(?:grasa|grasas|fat|lip)/i)?.[1];

  if (!kcal && !prot) return null;
  return {
    kcal: kcal || "–",
    prot: prot ? Math.round(parseFloat(prot)) : "–",
    carb: carb ? Math.round(parseFloat(carb)) : "–",
    fat: fat ? Math.round(parseFloat(fat)) : "–",
  };
}

const DAYS = [
  { name: "Lunes", regex: /^lunes/i },
  { name: "Martes", regex: /^martes/i },
  { name: "Miércoles", regex: /^mi[eé]rcoles/i },
  { name: "Jueves", regex: /^jueves/i },
  { name: "Viernes", regex: /^viernes/i },
  { name: "Sábado", regex: /^s[aá]bado/i },
  { name: "Domingo", regex: /^domingo/i },
];

export function parseSemana(text) {
  if (!text) return [];
  const days = [];
  let current = null;

  const lines = text.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.toUpperCase().includes("LISTA DE COMPRAS") || t.toUpperCase().includes("LISTA COMPRAS")) {
      if (current) {
        days.push(current);
        current = null;
      }
      break;
    }

    const cleanForDay = t
      .replace(/^(\d+[\.\)]\s*|d[ií]a\s*\d+\s*[:\-]?\s*)/i, "")
      .replace(/[*#_]/g, "")
      .trim();
    const dayMatch = DAYS.find((d) => d.regex.test(cleanForDay) && cleanForDay.length < 25);

    if (dayMatch) {
      if (current) days.push(current);
      current = { day: dayMatch.name, meals: [] };
    } else if (current && (t.startsWith("-") || t.startsWith("•") || t.startsWith("*") || /^\d+[\.\)]/.test(t) || t.includes(":"))) {
      const clean = t.replace(/^[-•*0-9.)]\s*/, "").trim();
      const colonIdx = clean.indexOf(":");
      if (colonIdx > 0 && colonIdx < 30) {
        const time = clean.substring(0, colonIdx).trim();
        const name = clean.substring(colonIdx + 1).trim();
        if (name) current.meals.push({ time, name });
      } else if (clean.length > 3) {
        current.meals.push({ time: "Comida", name: clean });
      }
    }
  }
  if (current) days.push(current);
  return days;
}

export function parseShopList(text) {
  const parts = text.split(/LISTA DE COMPRAS/i);
  if (parts.length < 2) return [];
  const section = parts[1];
  const items = [];
  let cat = "General";

  section.split("\n").forEach((line) => {
    const l = line.trim();
    if (!l) return;
    if (!l.startsWith("-") && !l.startsWith("•") && !l.startsWith("*") && l.length < 40 && !l.includes("$")) {
      cat = l.replace(/[*:#_-]/g, "").trim() || cat;
    } else if (l.startsWith("-") || l.startsWith("•") || l.startsWith("*")) {
      const name = l.replace(/^[-•*]\s*/, "").trim();
      if (name) {
        items.push({
          id: crypto.randomUUID(),
          cat,
          name,
          price: "",
          checked: false,
        });
      }
    }
  });
  return items;
}

function generateFallbackResponse(system, userPrompt) {
  if (userPrompt.includes("plan completo de Lunes a Domingo") || userPrompt.includes("plan semanal")) {
    return `LUNES
- Desayuno: Omelette de 3 claras y 1 huevo con tostada integral y palta
- Almuerzo: Pechuga de pollo a la plancha con arroz yamani y ensalada de espinaca
- Merienda: Yogur natural con frutos secos y banana
- Cena: Filete de merluza al horno con pure de calabaza

MARTES
- Desayuno: Panqueques de avena con claras y frutas rojas
- Almuerzo: Bifes de cuadril magro con batatas al horno y ensalada verde
- Merienda: Batido de proteina con leche descremada y manzana
- Cena: Wok de pollo con vegetales salteados (zucchini, morron, cebolla)

MIERCOLES
- Desayuno: Tostadas integrales con queso descremado y huevos revueltos
- Almuerzo: Ensalada tibia de quinoa, pechuga desmenuzada y tomates cherry
- Merienda: Tazon de yogur griego con nueces y miel
- Cena: Cazuela de ternera con verduras al vapor

JUEVES
- Desayuno: Omelette con queso magro y cafe con leche
- Almuerzo: Pechuga de pollo grillada con pure mixto y brocoli
- Merienda: Tostada con manteca de mani y rodajas de manzana
- Cena: Tarta de atun con masa integral y ensalada de rucula

VIERNES
- Desayuno: Avena cocida con leche, semillas de chia y banana
- Almuerzo: Hamburguesas caseras de carne magra con arroz y rodajas de tomate
- Merienda: Licuado de frutas con semillas y frutos secos
- Cena: Pechuga rellena con espinaca y ricota magra

SABADO
- Desayuno: Revuelto de huevos con palta sobre pan de masa madre
- Almuerzo: Pasta integral con salsa de tomates frescos y cubos de pechuga
- Merienda: Yogur con granola artesanal y naranja
- Cena: Salmon o pescado blanco con vegetales asados

DOMINGO
- Desayuno: Tostadas integrales con huevo poche y queso untable
- Almuerzo: Asado magro (vacio/colita) con ensalada mixta abundante
- Merienda: Mate con tostadas integrales y mermelada baja en azucar
- Cena: Tortilla de zapallitos y claras con ensalada de hojas verdes

LISTA DE COMPRAS
Carnicería y Pescadería
- 2 kg Pechuga de pollo
- 1 kg Cuadril o lomo magro
- 1 kg Filet de merluza
- 2 latas Atún al natural

Verdulería
- 1 kg Espinaca o acelga
- 1 kg Calabaza
- 1 kg Batatas y papas
- 1/2 kg Zucchini y morrón
- 1 kg Bananas y manzanas
- 2 Paltas

Almacén y Lácteos
- 2 maples de huevos (60 u)
- 1 paquete Avena tradicional
- 1 kg Arroz yamani o integral
- 2 potes Yogur natural/griego
- 1 paquete Pan integral o masa madre
- 200g Frutos secos surtidos`;
  }

  return `### Salteado proteico de pollo con vegetales crujientes y arroz

**Ingredientes (para 1 porción):**
- 180g pechuga de pollo cortada en cubos
- 70g arroz (pesado en crudo) o 150g cocido
- 1 taza de brócoli en arbolitos
- 1/2 morrón rojo cortado en tiras
- 1 cucharada de aceite de oliva virgen extra
- Sal, pimienta, orégano y pimentón ahumado al gusto

**Preparación paso a paso:**
1. Cociná el arroz en agua hirviendo con sal hasta que esté al dente (aprox. 15 minutos).
2. En una sartén caliente con la cucharada de aceite de oliva, dorá los cubos de pollo a fuego fuerte por 4-5 minutos hasta sellar bien.
3. Incorporá el morrón y el brócoli. Salteá a fuego medio-alto removiendo constantemente para que queden tiernos pero crocantes (3-4 minutos).
4. Condimentá con sal, pimienta y pimentón ahumado.
5. Serví el salteado caliente sobre la base de arroz.

MACROS: 560 kcal | 48g proteína | 52g carbohidratos | 14g grasas`;
}
