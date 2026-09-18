// src/services/storage.js
// Sincronizador de almacenamiento con Vercel Serverless (Neon Postgres / KV) + Fallback Offline

export function getUserId() {
  try {
    // 1. Verificar si viene un alias o ID en la URL (?u=alias o ?user=alias)
    if (typeof window !== "undefined" && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const urlUser = params.get("u") || params.get("user");
      if (urlUser) {
        const clean = urlUser.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (clean) {
          localStorage.setItem("nutri_user_id", clean);
          // Limpiar la URL discretamente sin recargar la página
          window.history.replaceState({}, document.title, window.location.pathname);
          return clean;
        }
      }
    }

    // 2. Leer de localStorage
    let id = localStorage.getItem("nutri_user_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("nutri_user_id", id);
    }
    return id.trim().toLowerCase();
  } catch {
    return "user_" + Math.random().toString(36).substring(2, 9);
  }
}

export function setUserId(newAlias) {
  try {
    const clean = newAlias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean) return null;
    localStorage.setItem("nutri_user_id", clean);
    return clean;
  } catch {
    return null;
  }
}

export function getSyncUrl(userId) {
  try {
    const origin = typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://nutri-ai-mu-amber.vercel.app";
    return `${origin}/?u=${encodeURIComponent(userId)}`;
  } catch {
    return `https://nutri-ai-mu-amber.vercel.app/?u=${userId}`;
  }
}

export const cloudStorage = {
  // Cargar datos del usuario desde Neon / Vercel Storage
  async loadUserData(userId) {
    try {
      const cleanId = userId ? userId.trim().toLowerCase() : "";
      const res = await fetch(`/api/storage?userId=${encodeURIComponent(cleanId)}`);
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

  // Guardar cambios (perfil, recetas, compras, semana, extras) en Neon / Vercel Storage
  async saveUserData(userId, payload) {
    try {
      const cleanId = userId ? userId.trim().toLowerCase() : "";
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: cleanId, ...payload }),
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
