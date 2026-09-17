// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import "./index.css";

import { supabaseService, getUserId } from "./services/supabase";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { MealModal } from "./components/MealModal";
import { Toast } from "./components/Toast";

import { HeladeraView } from "./views/HeladeraView";
import { SemanaView } from "./views/SemanaView";
import { ComprasView } from "./views/ComprasView";
import { GuardadasView } from "./views/GuardadasView";
import { PerfilView } from "./views/PerfilView";

export default function App() {
  const [userId] = useState(() => getUserId());
  const [activeTab, setActiveTab] = useState("heladera");
  const [appLoading, setAppLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // 1. Perfil (Offline-first con fallback a localStorage)
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("nutri_user_profile");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      peso: 78,
      altura: 176,
      edad: 26,
      objetivo: "vol",
      comidas: 4,
      calorias: 2500,
      restricciones: "",
    };
  });

  // 2. Datos de la semana (persistidos localmente)
  const [semanaData, setSemanaData] = useState(() => {
    try {
      const saved = localStorage.getItem("nutri_semana_data");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedMeal, setSelectedMeal] = useState(null);

  // 3. Lista de compras (persistida localmente)
  const [shopList, setShopList] = useState(() => {
    try {
      const saved = localStorage.getItem("nutri_shopping_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 4. Recetas guardadas (persistidas localmente)
  const [savedRecipes, setSavedRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem("nutri_saved_recipes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toast con timeout seguro
  const toastTimerRef = useRef(null);
  const showToast = (toastObj) => {
    clearTimeout(toastTimerRef.current);
    const id = Date.now();
    const formatted = typeof toastObj === "string" ? { msg: toastObj, type: "success", id } : { ...toastObj, id };
    setToast(formatted);
    toastTimerRef.current = setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 2800);
  };

  // Sincronización en segundo plano con Supabase si está disponible
  useEffect(() => {
    let isMounted = true;
    async function syncFromCloud() {
      try {
        const [profileRes, recipesRes, shoppingRes] = await Promise.allSettled([
          supabaseService.getProfile(userId),
          supabaseService.getRecipes(userId),
          supabaseService.getShoppingItems(userId),
        ]);

        if (!isMounted) return;

        // Si la nube tiene perfil más reciente
        if (profileRes.status === "fulfilled" && profileRes.value) {
          const p = profileRes.value;
          setProfile((prev) => {
            const updated = {
              ...prev,
              peso: p.peso ?? prev.peso,
              altura: p.altura ?? prev.altura,
              edad: p.edad ?? prev.edad,
              objetivo: p.objetivo ?? prev.objetivo,
              comidas: p.comidas ?? prev.comidas,
              calorias: p.calorias ?? prev.calorias,
              restricciones: p.restricciones || prev.restricciones,
            };
            try { localStorage.setItem("nutri_user_profile", JSON.stringify(updated)); } catch {}
            return updated;
          });
        }

        // Si la nube tiene recetas
        if (recipesRes.status === "fulfilled" && Array.isArray(recipesRes.value) && recipesRes.value.length > 0) {
          setSavedRecipes(recipesRes.value);
          try { localStorage.setItem("nutri_saved_recipes", JSON.stringify(recipesRes.value)); } catch {}
        }

        // Si la nube tiene lista de compras
        if (shoppingRes.status === "fulfilled" && Array.isArray(shoppingRes.value) && shoppingRes.value.length > 0) {
          const items = shoppingRes.value.map((i) => ({
            id: i.id || crypto.randomUUID(),
            cat: i.cat || "General",
            name: i.nombre,
            price: i.price ?? "",
            checked: Boolean(i.checked),
          }));
          setShopList(items);
          try { localStorage.setItem("nutri_shopping_list", JSON.stringify(items)); } catch {}
        }
      } catch (err) {
        // Modo offline transparente sin errores molestos
      }
    }

    syncFromCloud();
    return () => {
      isMounted = false;
      clearTimeout(toastTimerRef.current);
    };
  }, [userId]);

  // Guardar perfil (Local + Cloud en background)
  const profileTimer = useRef(null);
  const handleUpdateProfile = (newProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem("nutri_user_profile", JSON.stringify(newProfile));
    } catch {}

    clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(async () => {
      setSyncing(true);
      try {
        await supabaseService.saveProfile(userId, newProfile);
      } catch {}
      setSyncing(false);
    }, 1000);
  };

  // Guardar receta (Local + Cloud)
  const handleSaveRecipe = async (nombre, texto) => {
    const id = crypto.randomUUID();
    const date = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    const newRecipe = { id, nombre, texto, date };

    setSavedRecipes((prev) => {
      const updated = [newRecipe, ...prev];
      try {
        localStorage.setItem("nutri_saved_recipes", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast({ msg: "⭐ Receta guardada en tu recetario", type: "success" });

    try {
      await supabaseService.saveRecipe(userId, newRecipe);
    } catch {}
  };

  // Eliminar receta (Local + Cloud)
  const handleDeleteRecipe = async (id) => {
    setSavedRecipes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem("nutri_saved_recipes", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast({ msg: "🗑 Receta eliminada", type: "info" });
    try {
      await supabaseService.deleteRecipe(id);
    } catch {}
  };

  // Actualizar plan semanal
  const handleUpdateSemana = async (days, items) => {
    setSemanaData(days);
    try {
      localStorage.setItem("nutri_semana_data", JSON.stringify(days));
    } catch {}

    if (Array.isArray(items)) {
      setShopList(items);
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(items));
        await supabaseService.replaceShoppingList(userId, items);
      } catch {}
    }
  };

  // Actualizar precio con debounce (Local + Cloud)
  const priceTimers = useRef({});
  const handleUpdatePrice = (id, newPrice) => {
    setShopList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, price: newPrice } : item));
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    clearTimeout(priceTimers.current[id]);
    priceTimers.current[id] = setTimeout(async () => {
      try {
        await supabaseService.updateShoppingItem(id, { price: newPrice });
      } catch {}
    }, 800);
  };

  // Marcar / desmarcar ítem de compras (Local + Cloud)
  const handleToggleCheck = async (id) => {
    const targetItem = shopList.find((i) => i.id === id);
    if (!targetItem) return;
    const nextChecked = !targetItem.checked;

    setShopList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, checked: nextChecked } : item));
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await supabaseService.updateShoppingItem(id, { checked: nextChecked });
    } catch {}
  };

  // Resetear tachados (Local + Cloud)
  const handleResetChecked = async () => {
    setShopList((prev) => {
      const updated = prev.map((item) => ({ ...item, checked: false }));
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast({ msg: "Productos desmarcados", type: "info" });
    try {
      await supabaseService.resetCheckedItems(userId);
    } catch {}
  };

  if (appLoading) {
    return (
      <div className="app-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="loading-card">
          <div className="spin-animate text-accent" style={{ fontSize: 32 }}>⚡</div>
          <p className="loading-headline">Iniciando NutriAI...</p>
          <p className="loading-subline">Conectando tu recetario</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Header profile={profile} syncing={syncing} />

      {activeTab === "heladera" && (
        <HeladeraView profile={profile} onSaveRecipe={handleSaveRecipe} />
      )}

      {activeTab === "semana" && (
        <SemanaView
          profile={profile}
          semanaData={semanaData}
          onUpdateSemana={handleUpdateSemana}
          onSelectMeal={(mealData) => setSelectedMeal(mealData)}
          onShowToast={showToast}
        />
      )}

      {activeTab === "compras" && (
        <ComprasView
          shopList={shopList}
          onToggleCheck={handleToggleCheck}
          onUpdatePrice={handleUpdatePrice}
          onResetChecked={handleResetChecked}
          onShowToast={showToast}
        />
      )}

      {activeTab === "guardadas" && (
        <GuardadasView savedRecipes={savedRecipes} onDeleteRecipe={handleDeleteRecipe} />
      )}

      {activeTab === "perfil" && (
        <PerfilView
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onShowToast={showToast}
        />
      )}

      {selectedMeal && (
        <MealModal
          meal={selectedMeal.meal}
          day={selectedMeal.day}
          profile={profile}
          onClose={() => setSelectedMeal(null)}
          onSave={handleSaveRecipe}
        />
      )}

      <Toast toast={toast} />

      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        savedCount={savedRecipes.length}
      />
    </div>
  );
}
