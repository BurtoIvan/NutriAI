// src/services/supabase.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kfjnwfyvydhppfsqxshv.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmam53Znl2eWRocHBmc3F4c2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzgwMTEsImV4cCI6MjA5MzY1NDAxMX0.d98Sk60yrbpRqofuJpEa-XpK3VRdrntENq8VqptHFuQ";

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

async function request(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.warn(`[Supabase Error ${res.status}]:`, errorText);
      return { success: false, status: res.status, error: errorText };
    }
    const data = await res.json().catch(() => null);
    return { success: true, data };
  } catch (err) {
    console.warn("[Supabase Network Error]:", err);
    return { success: false, error: err.message };
  }
}

export const supabaseService = {
  async getProfile(userId) {
    const res = await request(`profiles?id=eq.${userId}`);
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  },

  async saveProfile(userId, profile) {
    return await request("profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: userId, ...profile, updated_at: new Date().toISOString() })
    });
  },

  async getRecipes(userId) {
    const res = await request(`recipes?user_id=eq.${userId}&order=created_at.desc`);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  async saveRecipe(userId, recipe) {
    return await request("recipes", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, ...recipe })
    });
  },

  async deleteRecipe(id) {
    return await request(`recipes?id=eq.${id}`, {
      method: "DELETE"
    });
  },

  async getShoppingItems(userId) {
    const res = await request(`shopping_items?user_id=eq.${userId}&order=created_at.asc`);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  },

  async replaceShoppingList(userId, items) {
    await request(`shopping_items?user_id=eq.${userId}`, { method: "DELETE" });
    if (!items || items.length === 0) return { success: true };
    return await request("shopping_items", {
      method: "POST",
      body: JSON.stringify(items.map(item => ({
        id: item.id || crypto.randomUUID(),
        user_id: userId,
        cat: item.cat || "General",
        nombre: item.name,
        price: item.price ?? "",
        checked: Boolean(item.checked)
      })))
    });
  },

  async updateShoppingItem(id, data) {
    return await request(`shopping_items?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  async resetCheckedItems(userId) {
    return await request(`shopping_items?user_id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ checked: false })
    });
  }
};
