// src/components/MacroBadges.jsx
import React from "react";
import { parseMacros } from "../services/ai";

export function MacroBadges({ text, mt }) {
  const m = parseMacros(text);
  if (!m) return null;

  return (
    <div className="macro-container" style={mt ? { marginTop: mt } : {}}>
      <div className="macro-card kcal">
        <span className="macro-num">{m.kcal}</span>
        <span className="macro-unit">kcal</span>
      </div>
      <div className="macro-card prot">
        <span className="macro-num">{m.prot}g</span>
        <span className="macro-unit">Proteína</span>
      </div>
      <div className="macro-card carb">
        <span className="macro-num">{m.carb}g</span>
        <span className="macro-unit">Carbos</span>
      </div>
      <div className="macro-card fat">
        <span className="macro-num">{m.fat}g</span>
        <span className="macro-unit">Grasas</span>
      </div>
    </div>
  );
}
