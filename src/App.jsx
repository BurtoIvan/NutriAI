import { useState, useEffect, useRef } from "react";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const SUPABASE_URL = "https://kfjnwfyvydhppfsqxshv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmam53Znl2eWRocHBmc3F4c2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzgwMTEsImV4cCI6MjA5MzY1NDAxMX0.d98Sk60yrbpRqofuJpEa-XpK3VRdrntENq8VqptHFuQ";

// ─── Supabase client ──────────────────────────────────────────────────────────
const sb = {
  async get(table, filters = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return res.json();
  },
  async upsert(table, data) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify(data)
    });
  },
  async insert(table, data) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  },
  async delete(table, filter) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  },
  async update(table, filter, data) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
  }
};

// UUID del dispositivo (persiste en localStorage)
function getUserId() {
  let id = localStorage.getItem("nutri_user_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("nutri_user_id", id); }
  return id;
}

const SIMPLE_MEALS = ["tostada","tostadas","café","mate","fruta","banana","manzana","naranja","yogur solo","agua","té","infusión","gelatina","almendras","nueces","maní","mandarina"];
function isSimpleMeal(name) {
  const n = name.toLowerCase();
  return SIMPLE_MEALS.some(s => n.includes(s)) && name.length < 28;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --surface: #12121a; --surface2: #1a1a26;
    --border: rgba(255,255,255,0.07);
    --accent: #c8f542; --accent2: #42f5c8; --accent3: #f5a742;
    --text: #f0f0f0; --muted: #666680; --danger: #f54242;
    --font-display: 'Syne', sans-serif; --font-body: 'DM Sans', sans-serif;
    --radius: 16px; --radius-sm: 10px;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
  .app {
    min-height: 100vh; background: var(--bg);
    background-image:
      radial-gradient(ellipse 60% 40% at 80% 10%, rgba(200,245,66,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 40% 30% at 10% 80%, rgba(66,245,200,0.04) 0%, transparent 50%);
    display: flex; flex-direction: column;
    max-width: 480px; margin: 0 auto; padding-bottom: 90px;
  }
  .header { padding: 20px 20px 0; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-family: var(--font-display); font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }
  .logo span { color: var(--accent); }
  .logo-sub { font-size: 11px; color: var(--muted); font-weight: 400; letter-spacing: 2px; text-transform: uppercase; }
  .sync-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); display: inline-block; margin-left: 6px; animation: pulse 2s infinite; }
  .sync-dot.syncing { background: var(--accent3); animation: spin 0.8s linear infinite; border-radius: 0; width: 8px; height: 8px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .section { padding: 0 20px; }
  .section-title { font-family: var(--font-display); font-size: 26px; font-weight: 800; line-height: 1.1; margin-bottom: 6px; }
  .section-title span { color: var(--accent); }
  .section-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
  .card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 18px; margin-bottom: 12px; }
  .card-title { font-family: var(--font-display); font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
  .input-group { margin-bottom: 12px; }
  .input-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; display: block; font-weight: 500; }
  .input-field { width: 100%; background: var(--surface2); border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font-family: var(--font-body); font-size: 14px; outline: none; transition: border-color 0.2s; resize: none; }
  .input-field:focus { border-color: var(--accent); }
  .input-field::placeholder { color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { padding: 8px 14px; border-radius: 50px; border: 1.5px solid var(--border); background: transparent; color: var(--muted); font-family: var(--font-body); font-size: 13px; cursor: pointer; transition: all 0.18s; font-weight: 500; }
  .chip.selected { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
  .chip:hover:not(.selected) { border-color: rgba(255,255,255,0.25); color: var(--text); }
  .chip.vol.selected { background: var(--accent3); border-color: var(--accent3); }
  .chip.def.selected { background: var(--accent2); border-color: var(--accent2); }
  .chip.mant.selected { background: var(--accent); border-color: var(--accent); }
  .slider-row { display: flex; align-items: center; gap: 12px; }
  .slider-val { font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--accent); min-width: 50px; text-align: right; }
  input[type=range] { flex: 1; -webkit-appearance: none; height: 4px; background: var(--surface2); border-radius: 4px; outline: none; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 0 12px rgba(200,245,66,0.4); }
  .btn-primary { width: 100%; padding: 16px; background: var(--accent); color: #000; border: none; border-radius: var(--radius-sm); font-family: var(--font-display); font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px; transition: all 0.2s; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(200,245,66,0.25); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-secondary { padding: 10px 18px; background: var(--surface2); color: var(--text); border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .loading-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 32px 20px; text-align: center; margin-bottom: 12px; }
  .spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; margin: 0 auto 16px; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { font-size: 14px; color: var(--muted); }
  .loading-sub { font-size: 12px; color: var(--muted); margin-top: 6px; opacity: 0.6; }
  .result-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 12px; animation: fadeUp 0.35s ease; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .result-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .result-icon.green { background: rgba(200,245,66,0.12); }
  .result-icon.teal  { background: rgba(66,245,200,0.12); }
  .result-title { font-family: var(--font-display); font-size: 17px; font-weight: 700; }
  .result-meta  { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .result-body { font-size: 14px; line-height: 1.75; color: rgba(240,240,240,0.85); white-space: pre-wrap; }
  .macro-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .macro-badge { flex: 1; min-width: 70px; padding: 10px; border-radius: var(--radius-sm); background: var(--surface2); text-align: center; }
  .macro-badge .val { font-family: var(--font-display); font-size: 20px; font-weight: 800; }
  .macro-badge .lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .macro-badge.kcal .val { color: var(--accent); }
  .macro-badge.prot .val { color: var(--accent2); }
  .macro-badge.carb .val { color: var(--accent3); }
  .macro-badge.fat  .val { color: #f542b8; }
  .week-wrapper { display: flex; flex-direction: column; gap: 10px; }
  .day-card { background: var(--surface2); border: 1.5px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
  .day-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
  .day-label-text { font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--accent); letter-spacing: 1.5px; text-transform: uppercase; }
  .day-kcal { font-size: 11px; color: var(--muted); }
  .meal-row { display: flex; align-items: center; gap: 8px; padding: 9px 16px; border-top: 1px solid var(--border); }
  .meal-row:hover { background: rgba(255,255,255,0.02); }
  .meal-time-badge { font-size: 10px; color: var(--muted); min-width: 68px; flex-shrink: 0; }
  .meal-name-text { font-size: 13px; flex: 1; line-height: 1.3; }
  .meal-tap-btn { background: none; border: 1.5px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 10px; padding: 3px 8px; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: var(--font-body); flex-shrink: 0; }
  .meal-tap-btn:hover { border-color: var(--accent); color: var(--accent); }
  .modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.78); backdrop-filter: blur(6px); display: flex; align-items: flex-end; justify-content: center; animation: overlayIn 0.2s ease; }
  @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-sheet { width: 100%; max-width: 480px; background: var(--surface); border-radius: 24px 24px 0 0; border-top: 1.5px solid var(--border); max-height: 88vh; overflow-y: auto; animation: sheetUp 0.3s cubic-bezier(0.34,1.56,0.64,1); padding-bottom: 32px; position: relative; }
  @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .modal-handle { width: 40px; height: 4px; background: var(--border); border-radius: 4px; margin: 12px auto 20px; }
  .modal-inner { padding: 0 20px; }
  .modal-title { font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .modal-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
  .modal-loading { text-align: center; padding: 40px 0; }
  .modal-close { position: absolute; top: 14px; right: 18px; background: var(--surface2); border: 1px solid var(--border); color: var(--muted); width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; }
  .saved-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius); margin-bottom: 10px; overflow: hidden; animation: fadeUp 0.3s ease; }
  .saved-header { display: flex; align-items: center; gap: 12px; padding: 16px; cursor: pointer; transition: background 0.15s; }
  .saved-header:hover { background: rgba(255,255,255,0.02); }
  .saved-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(200,245,66,0.1); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
  .saved-info { flex: 1; }
  .saved-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; }
  .saved-date { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .saved-chevron { color: var(--muted); font-size: 11px; transition: transform 0.25s; }
  .saved-chevron.open { transform: rotate(180deg); }
  .saved-body { padding: 0 16px 16px; border-top: 1px solid var(--border); }
  .saved-body .result-body { font-size: 13px; margin-top: 14px; }
  .saved-actions { display: flex; gap: 8px; margin-top: 14px; }
  .shop-cat-block { margin-bottom: 14px; }
  .shop-cat-title { font-size: 11px; color: var(--accent); font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; padding: 0 2px; }
  .shop-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 6px; }
  .shop-check { width: 22px; height: 22px; border-radius: 7px; border: 1.5px solid var(--border); background: transparent; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .shop-check.done { background: var(--accent); border-color: var(--accent); }
  .shop-item-name { font-size: 14px; flex: 1; transition: opacity 0.2s; }
  .shop-item-name.done { text-decoration: line-through; opacity: 0.38; }
  .price-prefix { font-size: 12px; color: var(--muted); flex-shrink: 0; }
  .shop-price-input { width: 72px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 8px; padding: 5px 8px; color: var(--text); font-family: var(--font-body); font-size: 13px; text-align: right; outline: none; transition: border-color 0.15s; }
  .shop-price-input:focus { border-color: var(--accent); }
  .shop-price-input::placeholder { color: var(--muted); }
  .total-card { background: var(--surface2); border: 1.5px solid var(--accent); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 13px; color: var(--muted); }
  .total-val { font-family: var(--font-display); font-size: 26px; font-weight: 800; color: var(--accent); text-align: right; }
  .total-sub { font-size: 11px; color: var(--muted); text-align: right; margin-top: 2px; }
  .progress-wrap { height: 4px; background: var(--surface2); border-radius: 4px; margin-bottom: 16px; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.35s; }
  .ingredient-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .ing-tag { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: 50px; font-size: 13px; }
  .ing-tag-remove { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 15px; padding: 0; transition: color 0.15s; }
  .ing-tag-remove:hover { color: var(--danger); }
  .empty-state { text-align: center; padding: 48px 20px; color: var(--muted); }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-text { font-size: 14px; line-height: 1.6; }
  .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: rgba(10,10,15,0.93); backdrop-filter: blur(16px); border-top: 1px solid var(--border); display: flex; padding: 10px 0 18px; }
  .bnav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; color: var(--muted); font-family: var(--font-body); font-size: 10px; font-weight: 500; transition: color 0.15s; }
  .bnav-btn.active { color: var(--accent); }
  .bnav-icon { font-size: 20px; }
  .divider { height: 1px; background: var(--border); margin: 14px 0; }
  .tag-pill { display: inline-block; padding: 3px 10px; border-radius: 50px; font-size: 11px; font-weight: 700; }
  .tag-pill.vol  { background: rgba(245,167,66,0.15); color: var(--accent3); }
  .tag-pill.def  { background: rgba(66,245,200,0.15); color: var(--accent2); }
  .tag-pill.mant { background: rgba(200,245,66,0.15); color: var(--accent); }
  .mb-16 { margin-bottom: 16px; }
  .mt-8  { margin-top: 8px; }
  .toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1.5px solid var(--accent); border-radius: 50px; padding: 10px 20px; font-size: 13px; color: var(--accent); font-weight: 600; z-index: 200; animation: toastIn 0.3s ease; white-space: nowrap; }
  @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function callClaude(system, user) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  return d.content[0].text;
}

function parseMacros(text) {
  const kcal = text.match(/(\d{3,4})\s*(?:kcal|cal|calorías)/i)?.[1];
  const prot = text.match(/(\d{2,3})g?\s*(?:proteína|prot)/i)?.[1];
  const carb = text.match(/(\d{2,3})g?\s*(?:carbohidrato|carb|hc)/i)?.[1];
  const fat  = text.match(/(\d{1,3})g?\s*(?:grasa|fat|lip)/i)?.[1];
  if (!kcal && !prot) return null;
  return { kcal: kcal||"–", prot: prot||"–", carb: carb||"–", fat: fat||"–" };
}

function MacroBadges({ text, mt }) {
  const m = parseMacros(text);
  if (!m) return null;
  return (
    <div className="macro-row" style={mt ? { marginTop: mt } : {}}>
      <div className="macro-badge kcal"><div className="val">{m.kcal}</div><div className="lbl">kcal</div></div>
      <div className="macro-badge prot"><div className="val">{m.prot}g</div><div className="lbl">prot</div></div>
      <div className="macro-badge carb"><div className="val">{m.carb}g</div><div className="lbl">carbs</div></div>
      <div className="macro-badge fat"><div className="val">{m.fat}g</div><div className="lbl">grasas</div></div>
    </div>
  );
}

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

function parseSemana(text) {
  const days = [];
  let current = null;
  text.split("\n").forEach(line => {
    const t = line.trim();
    if (t.toUpperCase().includes("LISTA DE COMPRAS")) { if (current) { days.push(current); current = null; } return; }
    const dayMatch = DAYS.find(d => t.toUpperCase().replace(/\*/g, "").trim().startsWith(d.toUpperCase()));
    if (dayMatch) {
      if (current) days.push(current);
      current = { day: dayMatch, meals: [] };
   } else if (current && (t.startsWith("-") || t.includes(":")) && !t.toUpperCase().includes("LISTA")) {
      const clean = t.replace(/^[-•*]\s*/, "");
      const colonIdx = clean.indexOf(":");
      if (colonIdx > 0 && colonIdx < 22) {
        const time = clean.substring(0, colonIdx).trim();
        const name = clean.substring(colonIdx + 1).trim();
        if (name) current.meals.push({ time, name });
      } else if (clean.length > 3) {
        current.meals.push({ time: "", name: clean });
      }
    }
  });
  if (current) days.push(current);
  return days;
}

function parseShopList(text) {
  const section = text.split(/LISTA DE COMPRAS/i)[1];
  if (!section) return [];
  const items = [];
  let cat = "General";
  section.split("\n").forEach(line => {
    const l = line.trim();
    if (!l) return;
    if (!l.startsWith("-") && !l.startsWith("•") && l.length < 50) {
      cat = l.replace(/[*:#]/g, "").trim() || cat;
    } else if (l.startsWith("-") || l.startsWith("•")) {
      const name = l.replace(/^[-•]\s*/, "").trim();
      if (name) items.push({ id: crypto.randomUUID(), cat, name, price: "", checked: false });
    }
  });
  return items;
}

// ─── Meal Modal ───────────────────────────────────────────────────────────────
function MealModal({ meal, day, profile, onClose, onSave }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const objMap = { vol: "volumen muscular", def: "definición (déficit calórico)", mant: "mantenimiento" };
    const sys = `Sos un nutricionista deportivo. Respondé en español argentino, práctico y directo. Si es una receta, incluí ingredientes con cantidades, preparación paso a paso y al final: "MACROS: X kcal | Xg proteína | Xg carbohidratos | Xg grasas". Si el alimento es simple (tostada, fruta, café), describilo brevemente.`;
    const usr = `Dame la receta de: "${meal}" (plan del ${day}). Perfil: ${profile.peso}kg, objetivo ${objMap[profile.objetivo]}, ${profile.calorias} kcal/día.`;
    callClaude(sys, usr)
      .then(r => { setText(r); setLoading(false); })
      .catch(() => { setText("❌ Error al cargar. Intentá de nuevo."); setLoading(false); });
  }, []);
  return (
    <div className="modal-overlay" onClick={e => e.target.classList.contains("modal-overlay") && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-inner">
          <div className="modal-title">{meal}</div>
          <div className="modal-sub">{day} · <span className={`tag-pill ${profile.objetivo}`}>{profile.objetivo === "vol" ? "Volumen" : profile.objetivo === "def" ? "Definición" : "Mantenimiento"}</span></div>
          {loading ? (
            <div className="modal-loading"><div className="spinner" /><div className="loading-text">Generando receta...</div></div>
          ) : (
            <>
              <MacroBadges text={text} />
              <div className="divider" />
              <div className="result-body">{text.replace(/MACROS:.*$/m, "").trim()}</div>
              <div className="divider" />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => onSave(meal, text)}>⭐ Guardar</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>Listo</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return <div className="toast">{msg}</div>;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function NutriAI() {
  const userId = useRef(getUserId()).current;
  const [bottomTab, setBottomTab] = useState("heladera");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const [profile, setProfile] = useState({
    peso: 80, altura: 175, edad: 28,
    objetivo: "mant", comidas: 4, calorias: 2200, restricciones: "",
  });

  // Heladera
  const [ingrediente, setIngrediente] = useState("");
  const [ingredientes, setIngredientes] = useState([]);
  const [antojo, setAntojo] = useState("");
  const [heladeraResult, setHeladeraResult] = useState(null);
  const [heladeraLoading, setHeladeraLoading] = useState(false);

  // Semana
  const [semanaData, setSemanaData] = useState(null);
  const [semanaLoading, setSemanaLoading] = useState(false);
  const [modal, setModal] = useState(null);

  // Compras
  const [shopList, setShopList] = useState([]);
  const [checked, setChecked] = useState({});

  // Guardadas
  const [saved, setSaved] = useState([]);
  const [expandedSaved, setExpandedSaved] = useState({});

  // ── Cargar datos de Supabase al inicio ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Perfil
        const profiles = await sb.get("profiles", `id=eq.${userId}`);
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile({ peso: p.peso, altura: p.altura, edad: p.edad, objetivo: p.objetivo, comidas: p.comidas, calorias: p.calorias, restricciones: p.restricciones || "" });
        } else {
          // Crear perfil inicial
          await sb.upsert("profiles", { id: userId, ...profile });
        }
        // Recetas guardadas
        const recipes = await sb.get("recipes", `user_id=eq.${userId}&order=created_at.desc`);
        setSaved(recipes.map(r => ({ id: r.id, nombre: r.nombre, texto: r.texto, date: r.date })));
        // Lista de compras
        const items = await sb.get("shopping_items", `user_id=eq.${userId}&order=created_at.asc`);
        if (items.length > 0) {
          setShopList(items.map(i => ({ id: i.id, cat: i.cat, name: i.nombre, price: i.price || "", checked: i.checked })));
          const ch = {};
          items.forEach(i => { if (i.checked) ch[i.id] = true; });
          setChecked(ch);
        }
      } catch (e) { console.error("Load error:", e); }
      setAppLoading(false);
    };
    load();
  }, []);

  // ── Guardar perfil con debounce ───────────────────────────────────────────
  const profileTimer = useRef(null);
  const saveProfile = (newProfile) => {
    setProfile(newProfile);
    clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(async () => {
      setSyncing(true);
      await sb.upsert("profiles", { id: userId, ...newProfile, updated_at: new Date().toISOString() });
      setSyncing(false);
    }, 1000);
  };

  // ── Heladera ──────────────────────────────────────────────────────────────
  const addIngrediente = () => {
    const v = ingrediente.trim();
    if (v && !ingredientes.includes(v)) setIngredientes([...ingredientes, v]);
    setIngrediente("");
  };

  const generateReceta = async () => {
    if (!ingredientes.length && !antojo.trim()) return;
    setHeladeraLoading(true); setHeladeraResult(null);
    try {
      const objMap = { vol: "volumen (más calorías, más proteína)", def: "definición (déficit calórico, alto proteína)", mant: "mantenimiento" };
      const sys = `Sos un nutricionista deportivo experto. Respondé en español argentino. Dá: nombre, ingredientes con cantidades, preparación paso a paso, y al final: "MACROS: X kcal | Xg proteína | Xg carbohidratos | Xg grasas".`;
      const usr = `Perfil: ${profile.peso}kg, ${profile.altura}cm, ${profile.edad}a, objetivo ${objMap[profile.objetivo]}, ${profile.calorias} kcal/día, restricciones: ${profile.restricciones || "ninguna"}.
${ingredientes.length ? `Ingredientes: ${ingredientes.join(", ")}` : ""}
${antojo ? `Antojo: ${antojo}` : ""}
Generá la receta ideal.`;
      setHeladeraResult(await callClaude(sys, usr));
    } catch { setHeladeraResult("❌ Error al generar la receta."); }
    setHeladeraLoading(false);
  };

  const saveReceta = async (nombre, texto) => {
    const n = nombre || texto.split("\n")[0].replace(/^#+\s*/, "").trim() || "Receta";
    const date = new Date().toLocaleDateString("es-AR");
    const id = crypto.randomUUID();
    setSaved(prev => [{ id, nombre: n, texto, date }, ...prev]);
    await sb.insert("recipes", { id, user_id: userId, nombre: n, texto, date });
    showToast("⭐ Receta guardada");
  };

  // ── Semana ────────────────────────────────────────────────────────────────
  const generateSemana = async () => {
    setSemanaLoading(true); setSemanaData(null);
    try {
      const objMap = { vol: "volumen (superávit calórico)", def: "definición (déficit moderado, alto proteína)", mant: "mantenimiento" };
      const sys = `Sos un nutricionista deportivo experto. Respondé en español argentino con alimentos comunes de Argentina. Solo nombres concretos de platos.`;
      const usr = `Perfil: ${profile.peso}kg, ${profile.altura}cm, ${profile.edad}a, objetivo ${objMap[profile.objetivo]}, ${profile.calorias} kcal/día, ${profile.comidas} comidas/día, restricciones: ${profile.restricciones || "ninguna"}.
Generá plan semanal (Lunes a Domingo) con ${profile.comidas} comidas/día.
Formato:
LUNES
- Desayuno: nombre
- Almuerzo: nombre
[etc.]
Al final "LISTA DE COMPRAS" agrupada por categoría con cantidades.`;
      const raw = await callClaude(sys, usr);
      setSemanaData(parseSemana(raw));
      // Guardar lista de compras en Supabase
      const items = parseShopList(raw);
      setShopList(items);
      setChecked({});
      // Borrar lista vieja y guardar nueva
      await sb.delete("shopping_items", `user_id=eq.${userId}`);
      if (items.length > 0) {
        await sb.insert("shopping_items", items.map(i => ({ id: i.id, user_id: userId, cat: i.cat, nombre: i.name, price: "", checked: false })));
      }
    } catch { setSemanaData([]); }
    setSemanaLoading(false);
  };

  // ── Compras ───────────────────────────────────────────────────────────────
  const priceTimer = useRef({});
  const updatePrice = (id, val) => {
    setShopList(prev => prev.map(i => i.id === id ? { ...i, price: val } : i));
    clearTimeout(priceTimer.current[id]);
    priceTimer.current[id] = setTimeout(() => {
      sb.update("shopping_items", `id=eq.${id}`, { price: val });
    }, 800);
  };

  const toggleCheck = async (id) => {
    const newVal = !checked[id];
    setChecked(prev => ({ ...prev, [id]: newVal }));
    await sb.update("shopping_items", `id=eq.${id}`, { checked: newVal });
  };

  const totalEstimado = shopList.reduce((acc, i) => acc + (parseFloat(i.price) || 0), 0);
  const itemsConPrecio = shopList.filter(i => parseFloat(i.price) > 0).length;
  const doneCount = Object.values(checked).filter(Boolean).length;
  const shopCats = [...new Set(shopList.map(i => i.cat))];

  const OBJ_LABEL = { vol: "Volumen", def: "Definición", mant: "Mantenimiento" };

  if (appLoading) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", flexDirection: "column", gap: 16 }}>
        <div className="spinner" />
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Cargando tu perfil...</div>
      </div>
    </>
  );

  // ── Views ─────────────────────────────────────────────────────────────────
  const views = {
    heladera: (
      <div className="section">
        <div className="section-title">¿Qué <span>cocinamos</span>?</div>
        <div className="section-sub">Tirá lo que tenés o lo que te pinta</div>
        <div className="card">
          <div className="card-title">🥦 Ingredientes en la heladera</div>
          <div className="ingredient-tags">
            {ingredientes.map(ing => (
              <span key={ing} className="ing-tag">{ing}
                <button className="ing-tag-remove" onClick={() => setIngredientes(ingredientes.filter(i => i !== ing))}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input-field" style={{ flex: 1 }} placeholder="ej: pollo, arroz, brócoli..."
              value={ingrediente} onChange={e => setIngrediente(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addIngrediente())} />
            <button className="btn-secondary" onClick={addIngrediente}>+</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">😋 ¿O qué te pinta comer?</div>
          <textarea className="input-field" rows={2} placeholder="ej: algo con pasta, milanesas..."
            value={antojo} onChange={e => setAntojo(e.target.value)} />
        </div>
        <button className="btn-primary mb-16" onClick={generateReceta}
          disabled={heladeraLoading || (!ingredientes.length && !antojo.trim())}>
          {heladeraLoading ? "Generando receta..." : "🔥 Generame una receta"}
        </button>
        {heladeraLoading && <div className="loading-card"><div className="spinner" /><div className="loading-text">Pensando la receta perfecta...</div><div className="loading-sub">Calculando macros según tu objetivo</div></div>}
        {heladeraResult && !heladeraLoading && (
          <div className="result-card">
            <div className="result-header">
              <div className="result-icon green">🍳</div>
              <div>
                <div className="result-title">Tu receta</div>
                <div className="result-meta"><span className={`tag-pill ${profile.objetivo}`}>{OBJ_LABEL[profile.objetivo]}</span></div>
              </div>
            </div>
            <MacroBadges text={heladeraResult} />
            <div className="divider" />
            <div className="result-body">{heladeraResult.replace(/MACROS:.*$/m, "").trim()}</div>
            <div className="divider" />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => saveReceta(null, heladeraResult)}>⭐ Guardar</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={generateReceta}>🔄 Otra</button>
            </div>
          </div>
        )}
      </div>
    ),

    semana: (
      <div className="section">
        <div className="section-title">Plan de <span>semana</span></div>
        <div className="section-sub">7 días · {profile.comidas} comidas/día · {profile.calorias} kcal</div>
        <button className="btn-primary mb-16" onClick={generateSemana} disabled={semanaLoading}>
          {semanaLoading ? "Planificando tu semana..." : "📅 Generame la semana completa"}
        </button>
        {semanaLoading && <div className="loading-card"><div className="spinner" /><div className="loading-text">Armando tu plan semanal...</div><div className="loading-sub">También se genera la lista de compras</div></div>}
        {semanaData && !semanaLoading && (
          semanaData.length === 0
            ? <div className="empty-state"><div className="empty-icon">😅</div><div className="empty-text">No se pudo generar. Intentá de nuevo.</div></div>
            : <>
              <div className="week-wrapper">
                {semanaData.map((d, di) => (
                  <div key={di} className="day-card">
                    <div className="day-header">
                      <span className="day-label-text">{d.day}</span>
                      <span className="day-kcal">~{profile.calorias} kcal</span>
                    </div>
                    {d.meals.map((m, mi) => (
                      <div key={mi} className="meal-row">
                        <span className="meal-time-badge">{m.time}</span>
                        <span className="meal-name-text">{m.name}</span>
                        {!isSimpleMeal(m.name) && (
                          <button className="meal-tap-btn" onClick={() => setModal({ meal: m.name, day: d.day })}>Ver receta</button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <button className="btn-secondary mt-8" style={{ width: "100%" }} onClick={generateSemana}>🔄 Regenerar</button>
            </>
        )}
      </div>
    ),

    compras: (
      <div className="section">
        <div className="section-title">Lista de <span>compras</span></div>
        <div className="section-sub">Cargá precios y armá tu estimado</div>
        {shopList.length === 0
          ? <div className="empty-state"><div className="empty-icon">🛒</div><div className="empty-text">Generá tu plan semanal<br />y la lista aparece acá automáticamente</div></div>
          : <>
            <div className="total-card">
              <div>
                <div className="total-label">Total estimado</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{itemsConPrecio} de {shopList.length} con precio</div>
              </div>
              <div>
                <div className="total-val">${totalEstimado.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <div className="total-sub">{doneCount}/{shopList.length} comprados</div>
              </div>
            </div>
            <div className="progress-wrap">
              <div className="progress-fill" style={{ width: shopList.length ? `${(doneCount / shopList.length) * 100}%` : "0%" }} />
            </div>
            {shopCats.map(cat => (
              <div key={cat} className="shop-cat-block">
                <div className="shop-cat-title">{cat}</div>
                {shopList.filter(i => i.cat === cat).map(item => (
                  <div key={item.id} className="shop-item">
                    <button className={`shop-check ${checked[item.id] ? "done" : ""}`} onClick={() => toggleCheck(item.id)}>
                      {checked[item.id] && <span style={{ fontSize: 11, color: "#000", fontWeight: 700 }}>✓</span>}
                    </button>
                    <span className={`shop-item-name ${checked[item.id] ? "done" : ""}`}>{item.name}</span>
                    <span className="price-prefix">$</span>
                    <input className="shop-price-input" type="number" placeholder="0"
                      value={item.price} onChange={e => updatePrice(item.id, e.target.value)} />
                  </div>
                ))}
              </div>
            ))}
            <button className="btn-secondary" style={{ width: "100%", marginTop: 4 }} onClick={async () => {
              setChecked({});
              await sb.update("shopping_items", `user_id=eq.${userId}`, { checked: false });
            }}>Resetear tachados</button>
          </>
        }
      </div>
    ),

    guardadas: (
      <div className="section">
        <div className="section-title">Recetas <span>guardadas</span></div>
        <div className="section-sub">{saved.length} recetas en tu colección</div>
        {saved.length === 0
          ? <div className="empty-state"><div className="empty-icon">⭐</div><div className="empty-text">Guardá recetas desde Heladera<br />o desde el detalle del plan semanal</div></div>
          : saved.map((r, i) => {
            const isOpen = !!expandedSaved[i];
            return (
              <div key={r.id || i} className="saved-card">
                <div className="saved-header" onClick={() => setExpandedSaved(p => ({ ...p, [i]: !p[i] }))}>
                  <div className="saved-icon">🍳</div>
                  <div className="saved-info">
                    <div className="saved-name">{r.nombre}</div>
                    <div className="saved-date">{r.date}</div>
                  </div>
                  <span className={`saved-chevron ${isOpen ? "open" : ""}`}>▼</span>
                </div>
                {isOpen && (
                  <div className="saved-body">
                    <MacroBadges text={r.texto} mt={14} />
                    <div className="divider" />
                    <div className="result-body">{r.texto.replace(/MACROS:.*$/m, "").trim()}</div>
                    <div className="saved-actions">
                      <button className="btn-secondary" style={{ flex: 1 }} onClick={async () => {
                        setSaved(saved.filter((_, j) => j !== i));
                        if (r.id) await sb.delete("recipes", `id=eq.${r.id}`);
                        showToast("🗑 Receta eliminada");
                      }}>🗑 Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        }
      </div>
    ),

    perfil: (
      <div className="section">
        <div className="section-title">Tu <span>perfil</span></div>
        <div className="section-sub">
          Tus datos se guardan automáticamente
          <span className={`sync-dot ${syncing ? "syncing" : ""}`} />
        </div>
        <div className="card">
          <div className="card-title">📊 Datos físicos</div>
          {[
            { label: "Peso", key: "peso", min: 40, max: 150, unit: "kg" },
            { label: "Altura", key: "altura", min: 140, max: 210, unit: "cm" },
            { label: "Edad", key: "edad", min: 15, max: 70, unit: "a" },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <div className="slider-row">
                <input type="range" min={f.min} max={f.max} value={profile[f.key]}
                  onChange={e => saveProfile({ ...profile, [f.key]: +e.target.value })} />
                <span className="slider-val">{profile[f.key]}{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">🎯 Objetivo</div>
          <div className="chips">
            {[{ id: "vol", label: "💪 Volumen" }, { id: "def", label: "🔥 Definición" }, { id: "mant", label: "⚖️ Mantenimiento" }].map(o => (
              <button key={o.id} className={`chip ${o.id} ${profile.objetivo === o.id ? "selected" : ""}`}
                onClick={() => saveProfile({ ...profile, objetivo: o.id })}>{o.label}</button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">🍽️ Comidas por día</div>
          <div className="chips">
            {[3, 4, 5, 6].map(n => (
              <button key={n} className={`chip ${profile.comidas === n ? "selected" : ""}`}
                onClick={() => saveProfile({ ...profile, comidas: n })}>{n} comidas</button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">⚡ Calorías diarias</div>
          <div className="slider-row">
            <input type="range" min={1200} max={4000} step={50} value={profile.calorias}
              onChange={e => saveProfile({ ...profile, calorias: +e.target.value })} />
            <span className="slider-val" style={{ minWidth: 75 }}>{profile.calorias}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title">🚫 Restricciones / Alergias</div>
          <input className="input-field" placeholder="ej: sin gluten, vegetariano, sin lactosa..."
            value={profile.restricciones}
            onChange={e => saveProfile({ ...profile, restricciones: e.target.value })} />
        </div>
      </div>
    ),
  };

  const BOTTOM_TABS = [
    { id: "heladera", icon: "🧊", label: "Heladera" },
    { id: "semana",   icon: "📅", label: "Semana" },
    { id: "compras",  icon: "🛒", label: "Compras" },
    { id: "guardadas",icon: "⭐", label: "Guardadas" },
    { id: "perfil",   icon: "👤", label: "Perfil" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div>
            <div className="logo">Nutri<span>AI</span></div>
            <div className="logo-sub">Tu coach de nutrición</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className={`tag-pill ${profile.objetivo}`}>
              {profile.objetivo === "vol" ? "💪 Volumen" : profile.objetivo === "def" ? "🔥 Definición" : "⚖️ Mantenimiento"}
            </span>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{profile.calorias} kcal · {profile.comidas} comidas</div>
          </div>
        </div>
        <div style={{ height: 20 }} />
        {views[bottomTab]}
        <div style={{ height: 40 }} />
      </div>

      {modal && (
        <MealModal meal={modal.meal} day={modal.day} profile={profile}
          onClose={() => setModal(null)}
          onSave={(nombre, texto) => { saveReceta(nombre, texto); setModal(null); }} />
      )}

      {toast && <Toast msg={toast} />}

      <div className="bottom-nav">
        {BOTTOM_TABS.map(t => (
          <button key={t.id} className={`bnav-btn ${bottomTab === t.id ? "active" : ""}`} onClick={() => setBottomTab(t.id)}>
            <span className="bnav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}
