import React, { useState, useEffect } from "react";
import { Bell, Palette, Globe, Check, CheckSquare } from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import { supabase } from "../supabaseClient";

export default function Header({ userProfile, onOpenSettings }) {
  const { lang, setLang, t } = useTranslation();
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("inspiro-theme") || "cosmic-dark"
  );

  const THEMES = [
    { id: "cosmic-dark", name: "🌌 Cosmic Dark" },
    { id: "modern-light", name: "☀️ Modern Light" },
    { id: "neon-cyberpunk", name: "⚡ Neon Cyberpunk" },
    { id: "emerald-forest", name: "🌲 Emerald Forest" },
    { id: "sunset-glow", name: "🌅 Sunset Glow" },
  ];

  // Load notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("inspiro-notifications");
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      // Seed initial mock notifications
      const initial = [
        {
          id: "notif_1",
          title: "Добро пожаловать в Inspiro!",
          body: "Найдите идеальную лабораторию или исследовательский проект.",
          read: false,
          date: new Date().toLocaleDateString("ru")
        }
      ];
      setNotifications(initial);
      localStorage.setItem("inspiro-notifications", JSON.stringify(initial));
    }
  }, []);

  // Listen to application updates to push dynamic notifications
  useEffect(() => {
    if (!userProfile) return;

    // Fetch applications and generate relevant notifications if status changed
    const fetchAndNotify = async () => {
      const field = userProfile.role === "professor" ? "professor_id" : "student_id";
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq(field, userProfile.id);

      if (data) {
        let currentNotifications = [...notifications];
        let hasNew = false;

        data.forEach(app => {
          // Check if we already notified about this application state
          const notifKey = `notif_app_${app.id}_${app.status}`;
          const exists = currentNotifications.some(n => n.id === notifKey);

          if (!exists) {
            let title = "";
            let body = "";

            if (userProfile.role === "student") {
              if (app.status === "interview") {
                title = "🎯 Приглашение на интервью!";
                body = `Профессор пригласил вас на собеседование по проекту "${app.lab_name}". Откройте боковую панель для выбора слота.`;
              } else if (app.status === "accepted") {
                title = "🎉 Заявка принята!";
                body = `Поздравляем! Ваша заявка в лабораторию "${app.lab_name}" была одобрена.`;
              } else if (app.status === "rejected") {
                title = "❌ Обновление статуса";
                body = `К сожалению, ваша заявка на проект "${app.lab_name}" была отклонена.`;
              }
            } else if (userProfile.role === "professor") {
              if (app.status === "pending") {
                title = "📋 Новая заявка";
                body = `Студент ${app.student_name} отправил отклик на вашу позицию "${app.lab_name}".`;
              } else if (app.status === "interview" && app.timeline_data?.some(t => t.note?.includes("подтверждено"))) {
                title = "📅 Слот забронирован";
                body = `Студент ${app.student_name} подтвердил время интервью. Проверьте календарь.`;
              }
            }

            if (title) {
              currentNotifications.unshift({
                id: notifKey,
                title,
                body,
                read: false,
                date: new Date().toLocaleDateString("ru")
              });
              hasNew = true;
            }
          }
        });

        if (hasNew) {
          setNotifications(currentNotifications);
          localStorage.setItem("inspiro-notifications", JSON.stringify(currentNotifications));
        }
      }
    };

    fetchAndNotify();

    // Set up database realtime subscription to trigger instant bell alerts
    const channel = supabase
      .channel("header_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => {
          fetchAndNotify();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile, notifications]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("inspiro-theme", newTheme);
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("inspiro-notifications", JSON.stringify(updated));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem("inspiro-notifications", JSON.stringify([]));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="global-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid var(--border-color)", background: "var(--dash-card)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 100 }}>
      {/* Search/Title placeholder */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          inspiro<span style={{ color: "var(--primary)" }}>sk</span>
        </h2>
      </div>

      {/* Control Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Language selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Globe size={16} style={{ color: "var(--text-muted)" }} />
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)} 
            className="theme-dropdown"
            style={{ padding: "4px 8px", fontSize: 13, background: "var(--input-bg)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)" }}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="kk">Қазақша</option>
          </select>
        </div>

        {/* Theme Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Palette size={16} style={{ color: "var(--text-muted)" }} />
          <select 
            value={activeTheme} 
            onChange={(e) => handleThemeChange(e.target.value)} 
            className="theme-dropdown"
            style={{ padding: "4px 8px", fontSize: 13, background: "var(--input-bg)", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)" }}
          >
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowBellDropdown(!showBellDropdown)} 
            style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", position: "relative", padding: 4 }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span 
                className="animate-bounce"
                style={{ 
                  position: "absolute", 
                  top: -2, 
                  right: -2, 
                  background: "var(--status-rejected)", 
                  color: "#fff", 
                  fontSize: 10, 
                  fontWeight: "bold", 
                  borderRadius: "50%", 
                  width: 16, 
                  height: 16, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Bell Dropdown Panel */}
          {showBellDropdown && (
            <div 
              style={{ 
                position: "absolute", 
                top: 36, 
                right: 0, 
                width: 320, 
                background: "var(--dash-card)", 
                border: "1px solid var(--border-color)", 
                borderRadius: 16, 
                boxShadow: "0 10px 30px var(--shadow)", 
                overflow: "hidden", 
                zIndex: 200 
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--input-bg)" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                  Уведомления
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={markAllRead} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                    <CheckSquare size={12} /> Прочитать
                  </button>
                  <button onClick={clearNotifications} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                    Очистить
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Уведомлений пока нет
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      style={{ 
                        padding: "12px 16px", 
                        borderBottom: "1px solid var(--border-color)", 
                        background: n.read ? "transparent" : "rgba(var(--primary-rgb), 0.05)",
                        transition: "background 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                        <strong style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: n.read ? 500 : 700 }}>
                          {n.title}
                        </strong>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{n.date}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {n.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: 12, borderTop: "1px solid var(--border-color)", textAlign: "center", background: "var(--input-bg)" }}>
                <button 
                  onClick={() => { setShowBellDropdown(false); if (onOpenSettings) onOpenSettings(); }} 
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Настройки уведомлений в профиле
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        {userProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {userProfile.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Profile" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifycontent: "center", fontSize: 13, fontWeight: "bold" }}>
                {userProfile.name ? userProfile.name[0].toUpperCase() : "U"}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{userProfile.name}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>{userProfile.role}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
