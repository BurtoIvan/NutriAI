// src/views/PerfilView.jsx
import React, { useState } from "react";
import { User, Flame, Target, Scale, Key, Check, Info, Sparkles } from "lucide-react";
import { getApiKey, setApiKey } from "../services/ai";

const COMMON_RESTRICTIONS = [
  "Sin gluten", "Sin lactosa", "Vegetariano", "Vegano", "Sin frutos secos", "Bajo en sodio", "Sin mariscos"
];

export function PerfilView({ profile, onUpdateProfile, onShowToast }) {
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [keySaved, setKeySaved] = useState(false);

  // Cálculo automático sugerido de TDEE (Mifflin-St Jeor aproximado)
  const calculateSuggestedCalories = () => {
    const { peso, altura, edad, objetivo } = profile;
    // Tasa Metabólica Basal estimada (fórmula estándar)
    const bmr = (10 * peso) + (6.25 * altura) - (5 * edad) + 5;
    // Factor de actividad moderada
    const tdee = bmr * 1.4;

    let target = Math.round(tdee);
    if (objetivo === "vol") target += 400; // Superávit
    if (objetivo === "def") target -= 450; // Déficit

    return Math.max(1200, Math.min(4500, Math.round(target / 50) * 50));
  };

  const handleApplySuggested = () => {
    const suggested = calculateSuggestedCalories();
    onUpdateProfile({ ...profile, calorias: suggested });
    onShowToast({ msg: `Calorías ajustadas a ${suggested} kcal según tu biometría`, type: "info" });
  };

  const toggleRestriction = (tag) => {
    let current = profile.restricciones ? profile.restricciones.split(",").map(s => s.trim()).filter(Boolean) : [];
    if (current.includes(tag)) {
      current = current.filter(t => t !== tag);
    } else {
      current.push(tag);
    }
    onUpdateProfile({ ...profile, restricciones: current.join(", ") });
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
    onShowToast({ msg: "Clave de API guardada correctamente", type: "success" });
  };

  const currentRestrictions = profile.restricciones 
    ? profile.restricciones.split(",").map(s => s.trim().toLowerCase())
    : [];

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Tu <span className="text-accent">perfil</span></h1>
        <p className="view-subtitle">Ajustá tus medidas y objetivos para calcular calorías y porciones precisas</p>
      </div>

      {/* Datos biométricos */}
      <div className="card">
        <span className="card-label">Datos biométricos</span>
        <div className="slider-group">
          <div className="slider-item">
            <div className="slider-label-row">
              <span className="slider-name">Peso corporal</span>
              <span className="slider-highlight">{profile.peso} kg</span>
            </div>
            <input
              type="range"
              min={40}
              max={160}
              value={profile.peso}
              onChange={(e) => onUpdateProfile({ ...profile, peso: +e.target.value })}
            />
          </div>

          <div className="slider-item">
            <div className="slider-label-row">
              <span className="slider-name">Altura</span>
              <span className="slider-highlight">{profile.altura} cm</span>
            </div>
            <input
              type="range"
              min={140}
              max={215}
              value={profile.altura}
              onChange={(e) => onUpdateProfile({ ...profile, altura: +e.target.value })}
            />
          </div>

          <div className="slider-item">
            <div className="slider-label-row">
              <span className="slider-name">Edad</span>
              <span className="slider-highlight">{profile.edad} años</span>
            </div>
            <input
              type="range"
              min={15}
              max={80}
              value={profile.edad}
              onChange={(e) => onUpdateProfile({ ...profile, edad: +e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Objetivo */}
      <div className="card">
        <span className="card-label">Objetivo de entrenamiento</span>
        <div className="objective-grid">
          {[
            { id: "vol", label: "Volumen", desc: "Superávit calórico y fuerza", icon: Flame },
            { id: "def", label: "Definición", desc: "Déficit y quema de grasa", icon: Target },
            { id: "mant", label: "Mantenimiento", desc: "Equilibrio y salud", icon: Scale },
          ].map((obj) => {
            const Icon = obj.icon;
            const isSelected = profile.objetivo === obj.id;
            return (
              <button
                key={obj.id}
                className={`objective-card ${obj.id} ${isSelected ? "selected" : ""}`}
                onClick={() => onUpdateProfile({ ...profile, objetivo: obj.id })}
              >
                <div className="obj-icon-wrap">
                  <Icon size={18} />
                </div>
                <div className="obj-text-wrap">
                  <span className="obj-name">{obj.label}</span>
                  <span className="obj-desc">{obj.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comidas y Calorías */}
      <div className="card">
        <div className="card-header-flex">
          <span className="card-label">Calorías diarias</span>
          <button className="text-button-accent" onClick={handleApplySuggested}>
            <Sparkles size={12} /> Sugerir ({calculateSuggestedCalories()} kcal)
          </button>
        </div>

        <div className="slider-item" style={{ marginTop: 6 }}>
          <div className="slider-label-row">
            <span className="slider-name">Meta calórica</span>
            <span className="slider-highlight large text-accent">{profile.calorias} kcal</span>
          </div>
          <input
            type="range"
            min={1200}
            max={4200}
            step={50}
            value={profile.calorias}
            onChange={(e) => onUpdateProfile({ ...profile, calorias: +e.target.value })}
          />
        </div>

        <div className="divider" />

        <span className="card-label">Distribución de comidas por día</span>
        <div className="chips-flex">
          {[3, 4, 5, 6].map((n) => (
            <button
              key={n}
              className={`chip-button ${profile.comidas === n ? "active" : ""}`}
              onClick={() => onUpdateProfile({ ...profile, comidas: n })}
            >
              {n} comidas
            </button>
          ))}
        </div>
      </div>

      {/* Restricciones y Alergias */}
      <div className="card">
        <span className="card-label">Restricciones y Alergias alimentarias</span>
        <div className="restriction-chips-wrap">
          {COMMON_RESTRICTIONS.map((tag) => {
            const isActive = currentRestrictions.includes(tag.toLowerCase());
            return (
              <button
                key={tag}
                className={`restriction-pill ${isActive ? "active" : ""}`}
                onClick={() => toggleRestriction(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          className="form-input"
          style={{ marginTop: 10 }}
          placeholder="Otras restricciones (ej. celiaquía, sin cebolla...)"
          value={profile.restricciones || ""}
          onChange={(e) => onUpdateProfile({ ...profile, restricciones: e.target.value })}
        />
      </div>

      {/* Configuración de API Key */}
      <div className="card">
        <div className="card-header-flex">
          <span className="card-label">Clave de Anthropic Claude (Opcional)</span>
          <Key size={14} className="text-muted" />
        </div>
        <p className="card-helper-text">
          Podés ingresar tu propia clave de Anthropic si preferís usarla directamente, o dejarlo en blanco para usar el modo de desarrollo.
        </p>
        <div className="input-with-button" style={{ marginTop: 8 }}>
          <input
            type="password"
            className="form-input"
            placeholder="sk-ant-api03-..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <button className="btn-secondary" onClick={handleSaveApiKey}>
            {keySaved ? <Check size={16} className="text-accent" /> : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
