// src/components/Header.jsx
import React from "react";
import { Sparkles, Flame, Target, Scale } from "lucide-react";

export function Header({ profile, syncing }) {
  const goalConfig = {
    vol: { label: "Volumen", icon: Flame, colorClass: "vol" },
    def: { label: "Definición", icon: Target, colorClass: "def" },
    mant: { label: "Mantenimiento", icon: Scale, colorClass: "mant" },
  };

  const currentGoal = goalConfig[profile.objetivo] || goalConfig.mant;
  const GoalIcon = currentGoal.icon;

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo-wrap">
          <Sparkles size={20} className="brand-icon" />
          <span className="brand-name">Nutri<span className="brand-accent">AI</span></span>
        </div>
        <span className="brand-tagline">
          Coach Nutricional
          <span className={`sync-indicator ${syncing ? "syncing" : ""}`} title={syncing ? "Sincronizando..." : "Conectado"} />
        </span>
      </div>

      <div className="header-stats">
        <div className={`goal-badge ${currentGoal.colorClass}`}>
          <GoalIcon size={13} className="goal-icon" />
          <span>{currentGoal.label}</span>
        </div>
        <div className="header-subtext">
          {profile.calorias} kcal · {profile.comidas} comidas
        </div>
      </div>
    </header>
  );
}
