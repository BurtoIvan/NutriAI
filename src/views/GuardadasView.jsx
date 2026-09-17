// src/views/GuardadasView.jsx
import React, { useState } from "react";
import { Bookmark, ChevronDown, ChevronUp, Trash2, Search, Utensils, Calendar } from "lucide-react";
import { MacroBadges } from "../components/MacroBadges";
import { ConfirmModal } from "../components/ConfirmModal";

export function GuardadasView({ savedRecipes, onDeleteRecipe }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [recipeToDelete, setRecipeToDelete] = useState(null);

  const filtered = savedRecipes.filter(r => 
    r.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    r.texto?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Recetas <span className="text-accent">guardadas</span></h1>
        <p className="view-subtitle">{savedRecipes.length} recetas en tu recetario personal</p>
      </div>

      {savedRecipes.length > 0 && (
        <div className="search-bar-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por plato o ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {savedRecipes.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <Bookmark size={42} className="text-muted" />
          </div>
          <h3 className="empty-state-title">Aún no tenés recetas guardadas</h3>
          <p className="empty-state-desc">
            Cuando la IA genere una receta que te guste en la Heladera o en el Plan Semanal, tocá "Guardar" para conservarla acá.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-box">
          <p className="empty-state-desc">No se encontraron recetas con "{search}"</p>
        </div>
      ) : (
        <div className="saved-recipes-list">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} className={`saved-recipe-card ${isExpanded ? "open" : ""}`}>
                <div className="saved-recipe-header" onClick={() => toggleExpand(r.id)}>
                  <div className="saved-recipe-icon">
                    <Utensils size={18} className="text-accent" />
                  </div>
                  <div className="saved-recipe-meta">
                    <h4 className="saved-recipe-name">{r.nombre}</h4>
                    <span className="saved-recipe-date">
                      <Calendar size={11} /> {r.date || "Reciente"}
                    </span>
                  </div>
                  <div className="saved-chevron-btn">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="saved-recipe-body">
                    <MacroBadges text={r.texto} mt={8} />
                    <div className="divider" />
                    <div className="recipe-text-body">
                      {r.texto?.replace(/MACROS:.*$/m, "").trim()}
                    </div>
                    <div className="divider" />
                    <div className="saved-card-footer">
                      <button
                        className="btn-danger-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecipeToDelete(r);
                        }}
                      >
                        <Trash2 size={14} /> Eliminar Receta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {recipeToDelete && (
        <ConfirmModal
          title="¿Eliminar receta?"
          message={`¿Estás seguro de que querés borrar "${recipeToDelete.nombre}"? Esta acción no se puede deshacer.`}
          confirmText="Sí, eliminar"
          cancelText="Cancelar"
          isDanger={true}
          onConfirm={() => {
            onDeleteRecipe(recipeToDelete.id);
            setRecipeToDelete(null);
          }}
          onCancel={() => setRecipeToDelete(null)}
        />
      )}
    </div>
  );
}
