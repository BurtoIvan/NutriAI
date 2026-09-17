// src/views/ComprasView.jsx
import React, { useState } from "react";
import { ShoppingBag, Check, RotateCcw, Share2, Copy, DollarSign } from "lucide-react";

export function ComprasView({ shopList, onToggleCheck, onUpdatePrice, onResetChecked, onShowToast }) {
  const [copied, setCopied] = useState(false);

  const totalEstimado = shopList.reduce((acc, item) => acc + (parseFloat(item.price) || 0), 0);
  const itemsComprados = shopList.filter(item => item.checked).length;
  const itemsConPrecio = shopList.filter(item => parseFloat(item.price) > 0).length;
  const porcentajeProgreso = shopList.length > 0 ? (itemsComprados / shopList.length) * 100 : 0;

  // Agrupar por categoría
  const categorias = [...new Set(shopList.map(i => i.cat || "General"))];

  const handleCopy = () => {
    if (shopList.length === 0) return;
    let text = "🛒 *LISTA DE COMPRAS - NUTRIAI*\n\n";
    categorias.forEach(cat => {
      text += `📂 *${cat.toUpperCase()}*\n`;
      shopList.filter(i => (i.cat || "General") === cat).forEach(item => {
        const checkMark = item.checked ? "✅" : "⬜";
        const priceStr = item.price ? ` ($${item.price})` : "";
        text += `${checkMark} ${item.name}${priceStr}\n`;
      });
      text += "\n";
    });
    if (totalEstimado > 0) {
      text += `💰 *Total Estimado:* $${totalEstimado.toLocaleString("es-AR")}\n`;
    }

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    onShowToast({ msg: "Lista de compras copiada", type: "success" });
  };

  const handleShareWhatsApp = () => {
    if (shopList.length === 0) return;
    let text = "🛒 *Mi Lista de Compras NutriAI*\n\n";
    categorias.forEach(cat => {
      text += `📂 *${cat.toUpperCase()}*\n`;
      shopList.filter(i => (i.cat || "General") === cat).forEach(item => {
        const checkMark = item.checked ? "✅" : "⬜";
        const priceStr = item.price ? ` ($${item.price})` : "";
        text += `${checkMark} ${item.name}${priceStr}\n`;
      });
      text += "\n";
    });
    if (totalEstimado > 0) {
      text += `💰 *Total Estimado:* $${totalEstimado.toLocaleString("es-AR")}\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Lista de <span className="text-accent">compras</span></h1>
        <p className="view-subtitle">Organizada por rubro con cálculo de presupuesto estimado</p>
      </div>

      {shopList.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <ShoppingBag size={42} className="text-muted" />
          </div>
          <h3 className="empty-state-title">Tu carrito está vacío</h3>
          <p className="empty-state-desc">
            Cuando generes tu plan en la pestaña "Semana", todos los ingredientes necesarios van a aparecer acá automáticamente agrupados por categoría.
          </p>
        </div>
      ) : (
        <>
          {/* Tarjeta de Resumen y Presupuesto */}
          <div className="budget-summary-card">
            <div className="budget-info-left">
              <span className="budget-label">Total estimado</span>
              <div className="budget-amount">
                ${totalEstimado.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <span className="budget-sub">
                {itemsConPrecio} de {shopList.length} productos con precio cargado
              </span>
            </div>

            <div className="budget-info-right">
              <span className="purchased-counter">
                {itemsComprados} / {shopList.length}
              </span>
              <span className="purchased-label">comprados</span>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-bar-fill" style={{ width: `${porcentajeProgreso}%` }} />
          </div>

          {/* Botones de acción */}
          <div className="list-toolbar">
            <button className="btn-secondary" onClick={handleCopy}>
              {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />} Copiar
            </button>
            <button className="btn-secondary" onClick={handleShareWhatsApp}>
              <Share2 size={14} /> WhatsApp
            </button>
            <button className="btn-secondary" onClick={onResetChecked} title="Desmarcar todos los ítems">
              <RotateCcw size={14} /> Reiniciar
            </button>
          </div>

          {/* Listado agrupado */}
          <div className="shop-categories-list">
            {categorias.map(cat => {
              const catItems = shopList.filter(i => (i.cat || "General") === cat);
              return (
                <div key={cat} className="shop-category-block">
                  <h4 className="shop-category-title">{cat}</h4>
                  <div className="shop-items-group">
                    {catItems.map(item => (
                      <div key={item.id} className={`shop-item-card ${item.checked ? "checked" : ""}`}>
                        <button
                          className={`custom-checkbox ${item.checked ? "checked" : ""}`}
                          onClick={() => onToggleCheck(item.id)}
                          aria-label={`Marcar ${item.name}`}
                        >
                          {item.checked && <Check size={13} strokeWidth={3} />}
                        </button>

                        <span
                          className={`shop-item-name ${item.checked ? "checked" : ""}`}
                          onClick={() => onToggleCheck(item.id)}
                        >
                          {item.name}
                        </span>

                        <div className="shop-price-wrapper">
                          <span className="currency-symbol">$</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="price-input"
                            value={item.price}
                            onChange={(e) => onUpdatePrice(item.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
