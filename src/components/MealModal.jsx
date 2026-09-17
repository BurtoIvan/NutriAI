// src/components/MealModal.jsx
import React, { useState, useEffect } from "react";
import { X, Bookmark, BookmarkCheck, ChefHat, Loader2, Sparkles } from "lucide-react";
import { callClaude } from "../services/ai";
import { MacroBadges } from "./MacroBadges";

export function MealModal({ meal, day, profile, onClose, onSave, isSaved = false }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(isSaved);

  useEffect(() => {
    let isMounted = true;
    const objMap = {
      vol: "volumen muscular (superávit calórico)",
      def: "definición (déficit calórico, alto en proteínas)",
      mant: "mantenimiento saludable"
    };

    const sys = `Sos un nutricionista deportivo de élite. Respondé en español rioplatense (Argentina), de forma directa, motivadora y clara.
Estructura de respuesta:
1. Nombre del plato con emoji
2. Ingredientes con gramos y medidas exactas para 1 porción
3. Preparación paso a paso numerada
4. Tips de nutrición/conservación
5. Al final estricto: "MACROS: X kcal | Xg proteína | Xg carbohidratos | Xg grasas"`;

    const restrictionsNotice = profile.restricciones?.trim()
      ? `IMPORTANTE: El usuario tiene las siguientes restricciones/alergias: "${profile.restricciones}". NO incluyas ningún ingrediente prohibido.`
      : "No tiene restricciones alimentarias.";

    const usr = `Dame la receta completa para: "${meal}" correspondiente al ${day}.
Perfil: ${profile.peso}kg, ${profile.altura}cm, ${profile.edad} años.
Objetivo: ${objMap[profile.objetivo] || "mantenimiento"}.
Meta calórica diaria: ${profile.calorias} kcal.
${restrictionsNotice}`;

    setLoading(true);
    callClaude(sys, usr)
      .then((res) => {
        if (isMounted) {
          setText(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setText("Hubo un problema al consultar la receta. Por favor intentá nuevamente.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [meal, day, profile]);

  const handleSave = () => {
    if (!saved && text) {
      onSave(meal, text);
      setSaved(true);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar" />
        <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <div className="modal-content">
          <div className="modal-recipe-header">
            <div className="recipe-tag">
              <ChefHat size={14} />
              <span>{day}</span>
            </div>
            <h2 className="modal-recipe-title">{meal}</h2>
          </div>

          {loading ? (
            <div className="modal-loading-box">
              <Loader2 size={36} className="spin-animate text-accent" />
              <p className="loading-headline">Armando la receta ideal...</p>
              <p className="loading-subline">Ajustando ingredientes a tu objetivo de {profile.calorias} kcal</p>
            </div>
          ) : (
            <>
              <MacroBadges text={text} mt={8} />
              <div className="divider" />
              <div className="recipe-text-body">
                {text.replace(/MACROS:.*$/m, "").trim()}
              </div>
              <div className="divider" />

              <div className="modal-footer-actions">
                <button
                  className={`btn-secondary ${saved ? "saved-active" : ""}`}
                  style={{ flex: 1 }}
                  onClick={handleSave}
                  disabled={saved}
                >
                  {saved ? (
                    <>
                      <BookmarkCheck size={16} className="text-accent" />
                      <span>Guardada</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={16} />
                      <span>Guardar Receta</span>
                    </>
                  )}
                </button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
