// src/App.jsx
import React, { useState, useEffect, useRef } from "react";
import "./index.css";

import { cloudStorage, getUserId, setUserId } from "./services/storage";
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
  const [userId, setUserIdState] = useState(() => getUserId());
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

  // 5. Extras fuera de dieta (persistidos localmente)
  const [extras, setExtras] = useState(() => {
    try {
      const saved = localStorage.getItem("nutri_extras");
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

  // Sincronización en segundo plano con Neon Postgres / Vercel Storage
  useEffect(() => {
    let isMounted = true;
    async function syncFromCloud() {
      try {
        setSyncing(true);
        const cloudData = await cloudStorage.loadUserData(userId);
        if (!isMounted) return;

        if (cloudData) {
          if (cloudData.profile && Object.keys(cloudData.profile).length > 0) {
            setProfile((prev) => {
              const updated = {
                ...prev,
                peso: cloudData.profile.peso ?? prev.peso,
                altura: cloudData.profile.altura ?? prev.altura,
                edad: cloudData.profile.edad ?? prev.edad,
                objetivo: cloudData.profile.objetivo ?? prev.objetivo,
                comidas: cloudData.profile.comidas ?? prev.comidas,
                calorias: cloudData.profile.calorias ?? prev.calorias,
                restricciones: cloudData.profile.restricciones || prev.restricciones,
              };
              try { localStorage.setItem("nutri_user_profile", JSON.stringify(updated)); } catch {}
              return updated;
            });
          }

          if (Array.isArray(cloudData.recipes) && cloudData.recipes.length > 0) {
            setSavedRecipes(cloudData.recipes);
            try { localStorage.setItem("nutri_saved_recipes", JSON.stringify(cloudData.recipes)); } catch {}
          }

          if (Array.isArray(cloudData.shopList) && cloudData.shopList.length > 0) {
            setShopList(cloudData.shopList);
            try { localStorage.setItem("nutri_shopping_list", JSON.stringify(cloudData.shopList)); } catch {}
          }

          if (Array.isArray(cloudData.semanaData) && cloudData.semanaData.length > 0) {
            setSemanaData(cloudData.semanaData);
            try { localStorage.setItem("nutri_semana_data", JSON.stringify(cloudData.semanaData)); } catch {}
          }

          if (Array.isArray(cloudData.extras)) {
            setExtras(cloudData.extras);
            try { localStorage.setItem("nutri_extras", JSON.stringify(cloudData.extras)); } catch {}
          }
        }
      } catch (err) {
        // Fallback offline silencioso
      } finally {
        if (isMounted) setSyncing(false);
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
      await cloudStorage.saveUserData(userId, { profile: newProfile });
      setSyncing(false);
    }, 1000);
  };

  // Guardar receta (Local + Cloud)
  const handleSaveRecipe = async (nombre, texto) => {
    const id = crypto.randomUUID();
    const date = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    const newRecipe = { id, nombre, texto, date };

    let updatedList = [];
    setSavedRecipes((prev) => {
      updatedList = [newRecipe, ...prev];
      try {
        localStorage.setItem("nutri_saved_recipes", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    showToast({ msg: "⭐ Receta guardada en tu recetario", type: "success" });
    setSyncing(true);
    await cloudStorage.saveUserData(userId, { recipes: updatedList });
    setSyncing(false);
  };

  // Eliminar receta (Local + Cloud)
  const handleDeleteRecipe = async (id) => {
    let updatedList = [];
    setSavedRecipes((prev) => {
      updatedList = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem("nutri_saved_recipes", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    showToast({ msg: "🗑 Receta eliminada", type: "info" });
    setSyncing(true);
    await cloudStorage.saveUserData(userId, { recipes: updatedList });
    setSyncing(false);
  };

  // Actualizar plan semanal (Local + Cloud)
  const handleUpdateSemana = async (days, items) => {
    setSemanaData(days);
    try {
      localStorage.setItem("nutri_semana_data", JSON.stringify(days));
    } catch {}

    let nextShop = shopList;
    if (Array.isArray(items)) {
      setShopList(items);
      nextShop = items;
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(items));
      } catch {}
    }

    setSyncing(true);
    await cloudStorage.saveUserData(userId, { semanaData: days, shopList: nextShop });
    setSyncing(false);
  };

  // Actualizar precio con debounce (Local + Cloud)
  const priceTimers = useRef({});
  const handleUpdatePrice = (id, newPrice) => {
    let updatedList = [];
    setShopList((prev) => {
      updatedList = prev.map((item) => (item.id === id ? { ...item, price: newPrice } : item));
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    clearTimeout(priceTimers.current[id]);
    priceTimers.current[id] = setTimeout(async () => {
      setSyncing(true);
      await cloudStorage.saveUserData(userId, { shopList: updatedList });
      setSyncing(false);
    }, 800);
  };

  // Marcar / desmarcar ítem de compras (Local + Cloud)
  const handleToggleCheck = async (id) => {
    let updatedList = [];
    setShopList((prev) => {
      updatedList = prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    await cloudStorage.saveUserData(userId, { shopList: updatedList });
  };

  // Resetear tachados (Local + Cloud)
  const handleResetChecked = async () => {
    let updatedList = [];
    setShopList((prev) => {
      updatedList = prev.map((item) => ({ ...item, checked: false }));
      try {
        localStorage.setItem("nutri_shopping_list", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    showToast({ msg: "Productos desmarcados", type: "info" });
    await cloudStorage.saveUserData(userId, { shopList: updatedList });
  };

  // 6. Agregar Extra (Local + Cloud)
  const handleAddExtra = async (newExtra) => {
    let updatedList = [];
    setExtras((prev) => {
      updatedList = [newExtra, ...prev];
      try {
        localStorage.setItem("nutri_extras", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    setSyncing(true);
    await cloudStorage.saveUserData(userId, { extras: updatedList });
    setSyncing(false);
  };

  // 7. Eliminar Extra (Local + Cloud)
  const handleDeleteExtra = async (id) => {
    let updatedList = [];
    setExtras((prev) => {
      updatedList = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem("nutri_extras", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    showToast({ msg: "Comida extra eliminada", type: "info" });
    setSyncing(true);
    await cloudStorage.saveUserData(userId, { extras: updatedList });
    setSyncing(false);
  };

  // 8. Cambiar o Conectar Alias de Usuario (Sincronización multi-dispositivo)
  const handleUpdateUserId = async (newAlias) => {
    const clean = setUserId(newAlias);
    if (!clean) return;
    setUserIdState(clean);
    setSyncing(true);

    try {
      const cloudData = await cloudStorage.loadUserData(clean);
      if (cloudData) {
        if (cloudData.profile && Object.keys(cloudData.profile).length > 0) {
          setProfile(cloudData.profile);
          try { localStorage.setItem("nutri_user_profile", JSON.stringify(cloudData.profile)); } catch {}
        }
        if (Array.isArray(cloudData.recipes)) {
          setSavedRecipes(cloudData.recipes);
          try { localStorage.setItem("nutri_saved_recipes", JSON.stringify(cloudData.recipes)); } catch {}
        }
        if (Array.isArray(cloudData.shopList)) {
          setShopList(cloudData.shopList);
          try { localStorage.setItem("nutri_shopping_list", JSON.stringify(cloudData.shopList)); } catch {}
        }
        if (Array.isArray(cloudData.semanaData)) {
          setSemanaData(cloudData.semanaData);
          try { localStorage.setItem("nutri_semana_data", JSON.stringify(cloudData.semanaData)); } catch {}
        }
        if (Array.isArray(cloudData.extras)) {
          setExtras(cloudData.extras);
          try { localStorage.setItem("nutri_extras", JSON.stringify(cloudData.extras)); } catch {}
        }
        showToast({ msg: `Sincronizados datos de ${clean}`, type: "success" });
      } else {
        // Alias nuevo: vinculamos los datos locales actuales para esa cuenta
        await cloudStorage.saveUserData(clean, {
          profile,
          recipes: savedRecipes,
          shopList,
          semanaData,
          extras,
        });
        showToast({ msg: `Cuenta ${clean} creada y vinculada`, type: "success" });
      }
    } catch (err) {
      console.warn("Error vinculando cuenta:", err);
    } finally {
      setSyncing(false);
    }
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
          extras={extras}
          onAddExtra={handleAddExtra}
          onDeleteExtra={handleDeleteExtra}
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
          currentUserId={userId}
          onUpdateUserId={handleUpdateUserId}
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
