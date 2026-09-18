// src/services/storage.js
// Sincronizador de almacenamiento con Vercel Serverless (Neon Postgres / KV) + Fallback Offline

export function getUserId() {
  try {
    let id = localStorage.getItem("nutri_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("nutri_user_id", id);
    }
    return id;
  } catch {
    return "guest-user-" + Math.random().toString(36).substring(2, 9);
  }
}

export const cloudStorage = {
  // Cargar datos del usuario desde Neon / Vercel Storage
  async loadUserData(userId) {
    try {
      const res = await fetch(`/api/storage?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.enabled && json.data) {
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn("[CloudStorage] No disponible u offline:", err.message);
      return null;
    }
  },

  // Guardar cambios (perfil, recetas, compras, semana) en Neon / Vercel Storage
  async saveUserData(userId, payload) {
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...payload }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn("[CloudStorage Save Error]:", err.message);
      return false;
    }
  },
};
