// src/views/HeladeraView.jsx
import React, { useState } from "react";
import { Plus, X, Sparkles, Loader2, Bookmark, RotateCcw, Share2, Utensils } from "lucide-react";
import { callClaude } from "../services/ai";
import { MacroBadges } from "../components/MacroBadges";

const POPULAR_STAPLES = [
  "Huevos", "Pechuga de pollo", "Arroz", "Avena", "Atún", "Palta", "Tomate", "Espinaca", "Queso magro", "Papas"
];

export function HeladeraView({ profile, onSaveRecipe }) {
  const [ingrediente, setIngrediente] = useState("");
  const [ingredientes, setIngredientes] = useState(["Huevos", "Espinaca", "Queso magro"]);
  const [antojo, setAntojo] = useState("");
  const [loading, setLoading] = useState(false);
  const [receta, setReceta] = useState(null);
  const [savedCurrent, setSavedCurrent] = useState(false);

  const addIngrediente = (ingToAdd) => {
    const val = (ingToAdd || ingrediente).trim();
    if (!val) return;
    const exists = ingredientes.some(i => i.toLowerCase() === val.toLowerCase());
    if (!exists) {
      setIngredientes(prev => [...prev, val]);
    }
    if (!ingToAdd) setIngrediente("");
  };

  const removeIngrediente = (val) => {
    setIngredientes(prev => prev.filter(i => i !== val));
  };

  const handleGenerate = async () => {
    if (!ingredientes.length && !antojo.trim()) return;

    setLoading(true);
    setReceta(null);
    setSavedCurrent(false);

    try {
      const objMap = {
        vol: "volumen muscular (superávit calórico inteligente)",
        def: "definición y pérdida de grasa (déficit controlado, muy alto en proteínas)",
        mant: "mantenimiento saludable"
      };

      const sys = `Sos un chef y nutricionista deportivo de Argentina. Creá una receta sabrosa, fácil y rápida.
Respondé con:
1. Título de la receta
2. Ingredientes con cantidades para 1 porción
3. Paso a paso de preparación bien claro
4. Tips de cocción
5. Al final estricto: "MACROS: X kcal | Xg proteína | Xg carbohidratos | Xg grasas"`;

      const restrictionsNotice = profile.restricciones?.trim()
        ? `RESTRICCIONES ALIMENTARIAS: ${profile.restricciones}. Respétalas estrictamente.`
        : "Sin restricciones especiales.";

      const usr = `Perfil: ${profile.peso}kg, ${profile.altura}cm, ${profile.edad} años.
Objetivo: ${objMap[profile.objetivo] || "mantenimiento"}.
Calorías meta del día: ${profile.calorias} kcal.
${restrictionsNotice}
${ingredientes.length ? `Ingredientes disponibles en mi heladera: ${ingredientes.join(", ")}` : ""}
${antojo ? `Antojo / Idea que me gustaría comer: "${antojo}"` : ""}
Armá la receta ideal maximizando sabor y respetando los ingredientes.`;

      const result = await callClaude(sys, usr);
      setReceta(result);
    } catch (err) {
      setReceta("Hubo un error al generar la receta. Por favor intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (receta && !savedCurrent) {
      const titleMatch = receta.match(/^(?:###\s*|\*\*\s*|#\s*)?(.*?)(?:\n|$)/);
      const title = titleMatch?.[1]?.replace(/[*#]/g, "").trim() || "Receta de la Heladera";
      onSaveRecipe(title, receta);
      setSavedCurrent(true);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">¿Qué <span className="text-accent">cocinamos</span> hoy?</h1>
        <p className="view-subtitle">Aprovechá lo que tenés en la heladera o dale rienda suelta a tu antojo</p>
      </div>

      <div className="card">
        <div className="card-header-flex">
          <span className="card-label">Ingredientes en tu heladera</span>
          <span className="card-counter">{ingredientes.length} agregados</span>
        </div>

        <div className="staples-row">
          <span className="staples-title">Comunes:</span>
          <div className="staples-chips">
            {POPULAR_STAPLES.map((staple) => {
              const inList = ingredientes.some(i => i.toLowerCase() === staple.toLowerCase());
              return (
                <button
                  key={staple}
                  className={`staple-chip ${inList ? "active" : ""}`}
                  onClick={() => addIngrediente(staple)}
                  disabled={inList}
                >
                  <Plus size={11} /> {staple}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tags-container">
          {ingredientes.map((ing) => (
            <div key={ing} className="tag-pill-interactive">
              <span>{ing}</span>
              <button onClick={() => removeIngrediente(ing)} className="tag-remove-btn" aria-label={`Quitar ${ing}`}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="input-with-button">
          <input
            type="text"
            className="form-input"
            placeholder="Escribí un ingrediente (ej. Pollo, Avena...)"
            value={ingrediente}
            onChange={(e) => setIngrediente(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addIngrediente();
              }
            }}
          />
          <button className="btn-secondary" onClick={() => addIngrediente()}>
            <Plus size={18} /> Agregar
          </button>
        </div>
      </div>

      <div className="card">
        <span className="card-label">¿Qué te gustaría comer? (Opcional)</span>
        <textarea
          className="form-textarea"
          rows={2}
          placeholder="ej: Algo crocante con pasta, una tarta express, algo dulce y proteico..."
          value={antojo}
          onChange={(e) => setAntojo(e.target.value)}
        />
      </div>

      <button
        className="btn-primary-large"
        onClick={handleGenerate}
        disabled={loading || (!ingredientes.length && !antojo.trim())}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="spin-animate" /> Creando tu receta...
          </>
        ) : (
          <>
            <Sparkles size={18} /> Generar Receta Inteligente
          </>
        )}
      </button>

      {loading && (
        <div className="loading-card">
          <Loader2 size={36} className="spin-animate text-accent" />
          <p className="loading-text">Calculando ingredientes y macros ideales...</p>
          <p className="loading-subtext">Adaptado a tus {profile.calorias} kcal diarias</p>
        </div>
      )}

      {receta && !loading && (
        <div className="recipe-result-card">
          <div className="recipe-card-header">
            <div className="recipe-badge-icon">
              <Utensils size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="recipe-card-title">Receta recomendada</h3>
              <p className="recipe-card-meta">Optimizada para {profile.objetivo === "vol" ? "Volumen" : profile.objetivo === "def" ? "Definición" : "Mantenimiento"}</p>
            </div>
          </div>

          <MacroBadges text={receta} mt={14} />
          <div className="divider" />
          <div className="recipe-text-body">
            {receta.replace(/MACROS:.*$/m, "").trim()}
          </div>
          <div className="divider" />

          <div className="card-actions-row">
            <button
              className={`btn-secondary ${savedCurrent ? "saved-active" : ""}`}
              onClick={handleSave}
              disabled={savedCurrent}
              style={{ flex: 1 }}
            >
              <Bookmark size={16} /> {savedCurrent ? "Guardada" : "Guardar Receta"}
            </button>
            <button className="btn-secondary" onClick={handleGenerate} style={{ flex: 1 }}>
              <RotateCcw size={16} /> Otra Opción
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
