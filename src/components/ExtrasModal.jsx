// src/components/ExtrasModal.jsx
import React, { useState } from "react";
import { X, Sparkles, Plus, Loader2, Cookie, Calendar } from "lucide-react";
import { estimateExtraCalories } from "../services/ai";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function ExtrasModal({ onClose, onAddExtra, onShowToast }) {
  // Obtener día de hoy aproximado en español
  const getTodayDayName = () => {
    const dayIdx = new Date().getDay(); // 0 = Domingo, 1 = Lunes...
    const map = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return map[dayIdx] || "Lunes";
  };

  const [description, setDescription] = useState("");
  const [kcal, setKcal] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayDayName());
  const [estimating, setEstimating] = useState(false);
  const [estimateDetail, setEstimateDetail] = useState("");

  const handleEstimateAI = async () => {
    if (!description.trim()) {
      onShowToast({ msg: "Escribí primero qué comiste (ej. '1 alfajor triple')", type: "info" });
      return;
    }
    setEstimating(true);
    setEstimateDetail("");
    try {
      const result = await estimateExtraCalories(description);
      if (result && result.kcal) {
        setKcal(String(result.kcal));
        if (result.detail) setEstimateDetail(result.detail);
        onShowToast({ msg: `✨ Calculamos ~${result.kcal} kcal`, type: "success" });
      } else {
        onShowToast({ msg: "No pudimos estimar las calorías, ingresalas a mano.", type: "error" });
      }
    } catch {
      onShowToast({ msg: "Error al consultar con la IA", type: "error" });
    } finally {
      setEstimating(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      onShowToast({ msg: "Ingresá el nombre o descripción del extra", type: "error" });
      return;
    }
    const caloriesNum = Math.max(0, parseInt(kcal, 10) || 0);
    if (!caloriesNum) {
      onShowToast({ msg: "Ingresá las calorías aproximadas o usá 'Calcular con IA'", type: "error" });
      return;
    }

    const newExtra = {
      id: crypto.randomUUID(),
      name: description.trim(),
      kcal: caloriesNum,
      day: selectedDay,
      date: new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      detail: estimateDetail || "",
    };

    onAddExtra(newExtra);
    onShowToast({ msg: `✅ Extra anotado (+${caloriesNum} kcal)`, type: "success" });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-badge-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
              <Cookie size={18} />
            </div>
            <div>
              <h2 className="modal-title">Anotar comida <span className="text-accent">extra</span></h2>
              <p className="modal-subtitle">Picoteos o comidas fuera de tu plan semanal</p>
            </div>
          </div>
          <button className="btn-icon-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Descripción */}
          <div className="form-group">
            <label className="card-label">¿Qué comiste fuera del plan?</label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. 2 porciones de pizza, 1 alfajor..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
                onClick={handleEstimateAI}
                disabled={estimating}
                title="Estimar calorías automáticamente con Claude"
              >
                {estimating ? (
                  <Loader2 size={16} className="spin-animate" />
                ) : (
                  <>
                    <Sparkles size={16} className="text-accent" />
                    <span>Con IA</span>
                  </>
                )}
              </button>
            </div>
            {estimateDetail && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                ℹ️ {estimateDetail}
              </p>
            )}
          </div>

          {/* Calorías */}
          <div className="form-group">
            <label className="card-label">Calorías estimadas (kcal)</label>
            <input
              type="number"
              className="form-input"
              placeholder="Ej. 350"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              min="0"
              max="5000"
              style={{ marginTop: 4 }}
            />
          </div>

          {/* Día de la semana */}
          <div className="form-group">
            <label className="card-label">Día de consumo</label>
            <div className="chips-flex" style={{ marginTop: 6 }}>
              {DAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`chip-button ${selectedDay === d ? "active" : ""}`}
                  onClick={() => setSelectedDay(d)}
                  style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary-large" style={{ flex: 2, padding: "12px 18px" }}>
              <Plus size={18} /> Guardar Extra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
