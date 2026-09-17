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
  const [appLoading, setAppLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // Perfil de usuario
  const [profile, setProfile] = useState({
    peso: 78,
    altura: 176,
    edad: 26,
    objetivo: "vol", // vol | def | mant
    comidas: 4,
    calorias: 2500,
    restricciones: "",
  });

  // Datos de la semana (persistidos en localStorage)
  const [semanaData, setSemanaData] = useState(() => {
    try {
      const saved = localStorage.getItem("nutri_semana_data");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedMeal, setSelectedMeal] = useState(null);

  // Lista de compras
  const [shopList, setShopList] = useState([]);

  // Recetas guardadas
  const [savedRecipes, setSavedRecipes] = useState([]);

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

  // Carga inicial concurrente con Promise.allSettled
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [profileRes, recipesRes, shoppingRes] = await Promise.allSettled([
          supabaseService.getProfile(userId),
          supabaseService.getRecipes(userId),
          supabaseService.getShoppingItems(userId),
        ]);

        if (!isMounted) return;

        // 1. Perfil
        if (profileRes.status === "fulfilled" && profileRes.value) {
          const p = profileRes.value;
          setProfile({
            peso: p.peso ?? 78,
            altura: p.altura ?? 176,
            edad: p.edad ?? 26,
            objetivo: p.objetivo ?? "vol",
            comidas: p.comidas ?? 4,
            calorias: p.calorias ?? 2500,
            restricciones: p.restricciones || "",
          });
        }

        // 2. Recetas
        if (recipesRes.status === "fulfilled" && Array.isArray(recipesRes.value)) {
          setSavedRecipes(
            recipesRes.value.map((item) => ({
              id: item.id || crypto.randomUUID(),
              nombre: item.nombre,
              texto: item.texto,
              date: item.date || "Reciente",
            }))
          );
        }

        // 3. Compras
        if (shoppingRes.status === "fulfilled" && Array.isArray(shoppingRes.value)) {
          setShopList(
            shoppingRes.value.map((item) => ({
              id: item.id || crypto.randomUUID(),
              cat: item.cat || "General",
              name: item.nombre,
              price: item.price ?? "",
              checked: Boolean(item.checked),
            }))
          );
        }
      } catch (err) {
        console.warn("Error en carga inicial:", err);
      } finally {
        if (isMounted) setAppLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
      clearTimeout(toastTimerRef.current);
    };
  }, [userId]);

  // Guardar perfil con debounce
  const profileTimer = useRef(null);
  const handleUpdateProfile = (newProfile) => {
    setProfile(newProfile);
    clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(async () => {
      setSyncing(true);
      try {
        await supabaseService.saveProfile(userId, newProfile);
      } catch (err) {
        console.warn("Error guardando perfil:", err);
      } finally {
        setSyncing(false);
      }
    }, 1000);
  };

  // Guardar receta
  const handleSaveRecipe = async (nombre, texto) => {
    const id = crypto.randomUUID();
    const date = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    const newRecipe = { id, nombre, texto, date };

    setSavedRecipes((prev) => [newRecipe, ...prev]);
    showToast({ msg: "⭐ Receta guardada en tu recetario", type: "success" });

    try {
      await supabaseService.saveRecipe(userId, newRecipe);
    } catch (err) {
      console.warn("Error guardando receta:", err);
    }
  };

  // Eliminar receta
  const handleDeleteRecipe = async (id) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    showToast({ msg: "🗑 Receta eliminada", type: "info" });
    try {
      await supabaseService.deleteRecipe(id);
    } catch (err) {
      console.warn("Error borrando receta:", err);
    }
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
        await supabaseService.replaceShoppingList(userId, items);
      } catch (err) {
        console.warn("Error sincronizando lista de compras:", err);
      }
    }
  };

  // Actualizar precio con debounce
  const priceTimers = useRef({});
  const handleUpdatePrice = (id, newPrice) => {
    setShopList((prev) => prev.map((item) => (item.id === id ? { ...item, price: newPrice } : item)));
    clearTimeout(priceTimers.current[id]);
    priceTimers.current[id] = setTimeout(async () => {
      try {
        await supabaseService.updateShoppingItem(id, { price: newPrice });
      } catch (err) {
        console.warn("Error actualizando precio:", err);
      }
    }, 800);
  };

  // Marcar / desmarcar ítem de compras (puro y sin carreras)
  const handleToggleCheck = async (id) => {
    const targetItem = shopList.find((i) => i.id === id);
    if (!targetItem) return;
    const nextChecked = !targetItem.checked;

    setShopList((prev) => prev.map((item) => (item.id === id ? { ...item, checked: nextChecked } : item)));

    try {
      await supabaseService.updateShoppingItem(id, { checked: nextChecked });
    } catch (err) {
      console.warn("Error actualizando check:", err);
    }
  };

  // Resetear tachados
  const handleResetChecked = async () => {
    setShopList((prev) => prev.map((item) => ({ ...item, checked: false })));
    showToast({ msg: "Productos desmarcados", type: "info" });
    try {
      await supabaseService.resetCheckedItems(userId);
    } catch (err) {
      console.warn("Error reseteando checks:", err);
    }
  };

  if (appLoading) {
    return (
      <div className="app-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="loading-card">
          <div className="spin-animate text-accent" style={{ fontSize: 32 }}>⚡</div>
          <p className="loading-headline">Iniciando NutriAI...</p>
          <p className="loading-subline">Conectando tu perfil y recetario</p>
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
