// src/components/ConfirmModal.jsx
import React from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmModal({ title, message, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, onCancel, isDanger = false }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-dialog-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon-wrap">
          <AlertTriangle size={24} className={isDanger ? "text-danger" : "text-accent"} />
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={isDanger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
