// src/views/SemanaView.jsx
import React, { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Loader2, Sparkles, Share2, Copy, Check, ChefHat } from "lucide-react";
import { callClaude, parseSemana, parseShopList } from "../services/ai";

export function SemanaView({ profile, semanaData, onUpdateSemana, onSelectMeal, onShowToast }) {
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState("Lunes");
  const [copied, setCopied] = useState(false);

  const handleGenerateSemana = async () => {
    setLoading(true);
    try {
      const objMap = {
        vol: "volumen muscular (superávit calórico inteligente)",
        def: "definición (déficit controlado, alto en proteínas)",
        mant: "mantenimiento saludable"
      };

      const sys = `Sos un nutricionista deportivo de Argentina. Diseñá un menú semanal de 7 días variado, nutritivo y adaptado a alimentos accesibles en el país.
Respondé DIRECTAMENTE con el menú, sin saludos, introducciones ni explicaciones.
Formato de respuesta EXACTO:
LUNES
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

MARTES
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

MIERCOLES
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

JUEVES
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

VIERNES
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

SABADO
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

DOMINGO
- Desayuno: Nombre del plato
- Almuerzo: Nombre del plato
- Merienda: Nombre del plato
- Cena: Nombre del plato

LISTA DE COMPRAS
Carnicería y Pescadería
- x kg alimento
Verdulería
- x kg alimento
Almacén y Lácteos
- x alimento`;

      const restrictionsNotice = profile.restricciones?.trim()
        ? `RESTRICCIONES IMPORTANTES: ${profile.restricciones}. No uses ningún alimento prohibido.`
        : "Sin restricciones alimentarias.";

      const usr = `Perfil: ${profile.peso}kg, ${profile.altura}cm, ${profile.edad} años.
Objetivo: ${objMap[profile.objetivo] || "mantenimiento"}.
Calorías meta: ${profile.calorias} kcal/día distribuidas en ${profile.comidas} comidas.
${restrictionsNotice}
Generá el plan completo de Lunes a Domingo con ${profile.comidas} comidas diarias.`;

      const raw = await callClaude(sys, usr, { max_tokens: 1500, model: "claude-3-5-haiku-20241022" });
      const days = parseSemana(raw);
      const items = parseShopList(raw);

      if (days.length > 0) {
        onUpdateSemana(days, items);
        setExpandedDay(days[0].day);
        onShowToast({ msg: "¡Semana planificada y lista de compras actualizada!", type: "success" });
      } else {
        onShowToast({ msg: "No pudimos interpretar el plan. Intentá de nuevo.", type: "error" });
      }
    } catch (err) {
      onShowToast({ msg: err.message || "Error al generar la semana.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPlan = () => {
    if (!semanaData || semanaData.length === 0) return;
    let text = `📋 MI PLAN SEMANAL NUTRIAI (${profile.calorias} kcal)\n\n`;
    semanaData.forEach(d => {
      text += `📅 *${d.day.toUpperCase()}*\n`;
      d.meals.forEach(m => {
        text += `• ${m.time ? m.time + ": " : ""}${m.name}\n`;
      });
      text += "\n";
    });

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    onShowToast({ msg: "Menú semanal copiado al portapapeles", type: "success" });
  };

  const handleShareWhatsApp = () => {
    if (!semanaData || semanaData.length === 0) return;
    let text = `📋 *Mi Plan Semanal NutriAI* (${profile.calorias} kcal)\n\n`;
    semanaData.forEach(d => {
      text += `👉 *${d.day.toUpperCase()}*\n`;
      d.meals.forEach(m => {
        text += `• ${m.time ? m.time + ": " : ""}${m.name}\n`;
      });
      text += "\n";
    });
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Plan de la <span className="text-accent">semana</span></h1>
        <p className="view-subtitle">7 días personalizados · {profile.comidas} comidas/día · {profile.calorias} kcal</p>
      </div>

      <div className="action-buttons-grid">
        <button
          className="btn-primary-large"
          onClick={handleGenerateSemana}
          disabled={loading}
          style={{ flex: 2 }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin-animate" /> Planificando semana...
            </>
          ) : (
            <>
              <Sparkles size={18} /> {semanaData?.length ? "Regenerar Semana" : "Generar Semana Completa"}
            </>
          )}
        </button>

        {semanaData?.length > 0 && (
          <>
            <button className="btn-secondary icon-only" onClick={handleCopyPlan} title="Copiar texto">
              {copied ? <Check size={18} className="text-accent" /> : <Copy size={18} />}
            </button>
            <button className="btn-secondary icon-only" onClick={handleShareWhatsApp} title="Enviar por WhatsApp">
              <Share2 size={18} />
            </button>
          </>
        )}
      </div>

      {loading && (
        <div className="loading-card">
          <Loader2 size={36} className="spin-animate text-accent" />
          <p className="loading-text">Equilibrando nutrientes y variedad de comidas...</p>
          <p className="loading-subtext">También se actualizará automáticamente tu lista de compras</p>
        </div>
      )}

      {(!semanaData || semanaData.length === 0) && !loading && (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <CalendarDays size={42} className="text-muted" />
          </div>
          <h3 className="empty-state-title">Todavía no tenés un plan semanal</h3>
          <p className="empty-state-desc">
            Tocá el botón de arriba para que la IA diseñe tus comidas de lunes a domingo según tu meta calórica.
          </p>
        </div>
      )}

      {semanaData?.length > 0 && !loading && (
        <div className="days-accordion">
          {semanaData.map((d) => {
            const isExpanded = expandedDay === d.day;
            return (
              <div key={d.day} className={`day-accordion-card ${isExpanded ? "expanded" : ""}`}>
                <button
                  className="day-accordion-header"
                  onClick={() => setExpandedDay(isExpanded ? null : d.day)}
                >
                  <div className="day-header-title">
                    <span className="day-name">{d.day}</span>
                    <span className="day-calories-chip">~{profile.calorias} kcal</span>
                  </div>
                  <div className="day-header-right">
                    <span className="day-meals-count">{d.meals?.length} comidas</span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="day-accordion-body">
                    {d.meals?.map((m, idx) => (
                      <div key={idx} className="meal-item-row">
                        <div className="meal-info-block">
                          <span className="meal-type-label">{m.time || `Comida ${idx + 1}`}</span>
                          <span className="meal-title-text">{m.name}</span>
                        </div>
                        <button
                          className="meal-action-badge"
                          onClick={() => onSelectMeal({ meal: m.name, day: d.day })}
                        >
                          <ChefHat size={12} /> Ver receta
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
