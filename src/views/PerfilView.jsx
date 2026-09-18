import React, { useState } from "react";
import { User, Flame, Target, Scale, Key, Check, Info, Sparkles, Smartphone, Copy, Link2 } from "lucide-react";
import { getApiKey, setApiKey } from "../services/ai";
import { getSyncUrl } from "../services/storage";

const COMMON_RESTRICTIONS = [
  "Sin gluten", "Sin lactosa", "Vegetariano", "Vegano", "Sin frutos secos", "Bajo en sodio", "Sin mariscos"
];

export function PerfilView({ profile, onUpdateProfile, onShowToast, currentUserId, onUpdateUserId }) {
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [keySaved, setKeySaved] = useState(false);
  const [aliasInput, setAliasInput] = useState(currentUserId || "");
  const [aliasSaved, setAliasSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  const handleSaveAlias = () => {
    if (!aliasInput.trim()) {
      onShowToast({ msg: "Ingresá un alias o nombre de usuario", type: "error" });
      return;
    }
    const clean = aliasInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean.length < 3) {
      onShowToast({ msg: "El alias debe tener al menos 3 caracteres", type: "error" });
      return;
    }
    onUpdateUserId(clean);
    setAliasSaved(true);
    setTimeout(() => setAliasSaved(false), 2000);
    onShowToast({ msg: `✅ Conectado a la cuenta: ${clean}`, type: "success" });
  };

  const handleCopyLink = () => {
    const activeId = currentUserId || aliasInput;
    if (!activeId) return;
    const url = getSyncUrl(activeId);
    navigator.clipboard?.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
    onShowToast({ msg: "🔗 Link de sincronización copiado", type: "success" });
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

      {/* Sincronización y Cuenta Multi-Dispositivo */}
      <div className="card">
        <div className="card-header-flex">
          <span className="card-label">Sincronización entre Dispositivos</span>
          <Smartphone size={16} className="text-accent" />
        </div>
        <p className="card-helper-text">
          Elegí un Alias personal para usar la misma cuenta en tu compu y tu celular. Tus datos se sincronizan con Neon Postgres.
        </p>

        <div className="input-with-button" style={{ marginTop: 10 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Ej. ivan o tu_nombre"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
          />
          <button className="btn-secondary" onClick={handleSaveAlias}>
            {aliasSaved ? <Check size={16} className="text-accent" /> : "Conectar"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            className="btn-secondary"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: "0.82rem",
              padding: "10px"
            }}
            onClick={handleCopyLink}
          >
            {linkCopied ? <Check size={15} className="text-accent" /> : <Copy size={15} />}
            <span>Copiar link mágico para mi celu</span>
          </button>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
          <span>Base de datos Neon Postgres conectada · Usuario: <strong style={{ color: "var(--text-primary)" }}>{currentUserId || "No asignado"}</strong></span>
        </div>
      </div>
    </div>
  );
}
