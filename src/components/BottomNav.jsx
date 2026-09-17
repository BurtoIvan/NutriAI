// src/components/BottomNav.jsx
import React from "react";
import { Refrigerator, CalendarDays, ShoppingCart, Bookmark, User } from "lucide-react";

export function BottomNav({ activeTab, onChangeTab, savedCount = 0 }) {
  const tabs = [
    { id: "heladera", label: "Heladera", icon: Refrigerator },
    { id: "semana", label: "Semana", icon: CalendarDays },
    { id: "compras", label: "Compras", icon: ShoppingCart },
    { id: "guardadas", label: "Guardadas", icon: Bookmark, badge: savedCount },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`bnav-item ${isActive ? "active" : ""}`}
              onClick={() => onChangeTab(tab.id)}
            >
              <div className="bnav-icon-wrap">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.badge > 0 && !isActive && (
                  <span className="bnav-badge">{tab.badge}</span>
                )}
              </div>
              <span className="bnav-label">{tab.label}</span>
              {isActive && <span className="bnav-active-dot" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
