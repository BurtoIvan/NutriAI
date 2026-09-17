// src/components/Toast.jsx
import React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export function Toast({ toast }) {
  if (!toast) return null;
  const { msg, type = "success" } = typeof toast === "string" ? { msg: toast, type: "success" } : toast;

  const icons = {
    success: <CheckCircle2 size={16} className="toast-icon success" />,
    error: <AlertCircle size={16} className="toast-icon error" />,
    info: <Info size={16} className="toast-icon info" />,
  };

  return (
    <div className={`toast-popup ${type}`}>
      {icons[type] || icons.success}
      <span>{msg}</span>
    </div>
  );
}
