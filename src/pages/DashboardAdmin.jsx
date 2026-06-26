import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Users, Folder, FileText, MessageSquare, LogOut, Trash2, Palette, CheckCircle,
  ShieldAlert, Edit, Eye, EyeOff, Award, AlertTriangle, Info, Play
} from "lucide-react";
import "./Dashboard.css";
import { useTranslation } from "../context/TranslationContext";
import Header from "../components/Header.jsx";

export default function DashboardAdmin() {
  const { t } = useTranslation();

  // Moderation state
  const [editingLab, setEditingLab] = useState(null);
  const [editLabName, setEditLabName] = useState("");
  const [editLabDesc, setEditLabDesc] = useState("");
  const [editLabSpots, setEditLabSpots] = useState("");

  const [warningUser, setWarningUser] = useState(null);
  const [warningText, setWarningText] = useState("");
  const [warningLevel, setWarningLevel] = useState("info");
  
  const [verifiedLabIds, setVerifiedLabIds] = useState(
    JSON.parse(localStorage.getItem("inspiro-verified-labs") || "[]")
  );
  const [hiddenLabIds, setHiddenLabIds] = useState(
    JSON.parse(localStorage.getItem("inspiro-hidden-labs") || "[]")
  );

  useEffect(() => {
    localStorage.setItem("inspiro-verified-labs", JSON.stringify(verifiedLabIds));
  }, [verifiedLabIds]);

  useEffect(() => {
    localStorage.setItem("inspiro-hidden-labs", JSON.stringify(hiddenLabIds));
  }, [hiddenLabIds]);

  const toggleVerifyLab = (labId) => {
    setVerifiedLabIds(prev =>
      prev.includes(labId) ? prev.filter(id => id !== labId) : [...prev, labId]
    );
  };

  const toggleHideLab = (labId) => {
    setHiddenLabIds(prev =>
      prev.includes(labId) ? prev.filter(id => id !== labId) : [...prev, labId]
    );
  };

  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Themes
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

  useEffect(() => {
    const fetchAll = async () => {
      const [usersSnap, labsSnap, appsSnap, fbSnap] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("labs").select("*"),
        supabase.from("applications").select("*"),
        supabase.from("feedback").select("*"),
      ]);

      setUsers(usersSnap.data || []);
      setLabs((labsSnap.data || []).map(l => ({
        id: l.id,
        name: l.name,
        description: l.description,
        researchAreas: l.research_areas,
        openSpots: l.open_spots,
        requirements: l.requirements,
        professorId: l.professor_id,
        professorName: l.professor_name,
      })));
      setApplications((appsSnap.data || []).map(a => ({
        id: a.id,
        studentId: a.student_id,
        studentName: a.student_name,
        studentEmail: a.student_email,
        labId: a.lab_id,
        labName: a.lab_name,
        professorId: a.professor_id,
        motivation: a.motivation,
        cvUrl: a.cv_url,
        status: a.status,
      })));
      setFeedback((fbSnap.data || []).map(f => ({
        id: f.id,
        userName: f.user_name,
        userRole: f.user_role,
        text: f.text,
        createdAt: f.created_at ? new Date(f.created_at) : null,
      })));

      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("inspiro-theme", newTheme);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите удалить пользователя?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
      alert("Ошибка удаления: " + error.message);
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const handleDeleteLab = async (labId) => {
    if (!window.confirm("Вы уверены, что хотите удалить лабораторию?")) return;
    const { error } = await supabase.from("labs").delete().eq("id", labId);
    if (error) {
      alert("Ошибка удаления: " + error.message);
    } else {
      setLabs(prev => prev.filter(l => l.id !== labId));
    }
  };

  const handleSaveLab = async () => {
    if (!editingLab) return;
    const { error } = await supabase
      .from("labs")
      .update({
        name: editLabName,
        description: editLabDesc,
        open_spots: Number(editLabSpots)
      })
      .eq("id", editingLab.id);

    if (error) {
      alert("Ошибка сохранения: " + error.message);
    } else {
      setLabs(prev => prev.map(l => l.id === editingLab.id ? { ...l, name: editLabName, description: editLabDesc, openSpots: Number(editLabSpots) } : l));
      setEditingLab(null);
    }
  };

  const handleIssueWarning = async () => {
    if (!warningUser) return;
    let currentWarnings = [];
    if (warningUser.bio) {
      try {
        if (warningUser.bio.startsWith("{") && warningUser.bio.endsWith("}")) {
          const parsed = JSON.parse(warningUser.bio);
          currentWarnings = parsed.warnings || [];
        }
      } catch (e) {}
    }

    const newWarning = {
      text: warningText,
      level: warningLevel,
      date: new Date().toLocaleDateString("ru")
    };

    const updatedBio = JSON.stringify({
      warnings: [newWarning, ...currentWarnings]
    });

    const { error } = await supabase
      .from("profiles")
      .update({ bio: updatedBio })
      .eq("id", warningUser.id);

    if (error) {
      alert("Ошибка при выдаче предупреждения: " + error.message);
    } else {
      setUsers(prev => prev.map(u => u.id === warningUser.id ? { ...u, bio: updatedBio } : u));
      setWarningUser(null);
      setWarningText("");
      alert("Предупреждение выдано успешно!");
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) {
      alert("Ошибка изменения роли: " + error.message);
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const students = users.filter(u => u.role === "student");
  const professors = users.filter(u => u.role === "professor");
  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const accepted = applications.filter(a => a.status === "accepted");
  const pending = applications.filter(a => a.status === "pending");
  const interview = applications.filter(a => a.status === "interview");
  const rejected = applications.filter(a => a.status === "rejected");
  const acceptRate = applications.length ? Math.round((accepted.length / applications.length) * 100) : 0;

  // Apps by lab for chart
  const appsByLab = labs.map(lab => ({
    name: lab.name,
    count: applications.filter(a => a.labId === lab.id).length,
    accepted: applications.filter(a => a.labId === lab.id && a.status === "accepted").length,
  })).sort((a, b) => b.count - a.count).slice(0, 6);

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      {/* ── MOBILE HEADER ── */}
      <header className="mobile-header" style={{ display: "none" }}>
        <button className="menu-toggle-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
          ☰ Меню
        </button>
        <span className="land-logo" style={{ fontSize: 18, fontWeight: "bold" }}>inspirosk</span>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className={`dash-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="dash-logo">inspirosk</div>

        <div className="dash-user">
          <div className="dash-avatar admin-avatar">A</div>
          <div>
            <div className="dash-username">Администратор</div>
            <div className="dash-role" style={{ color: "var(--status-rejected)" }}>Admin</div>
          </div>
        </div>

        {/* Theme Selector widget */}
        <div className="theme-selector-container">
          <label className="theme-label"><Palette size={12} style={{ marginRight: 4 }} /> Тема</label>
          <select value={activeTheme} onChange={(e) => handleThemeChange(e.target.value)} className="theme-dropdown">
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <nav className="dash-nav">
          {[
            ["overview", "📊 Обзор"],
            ["analytics", "📈 Аналитика"],
            ["users", "👥 Пользователи"],
            ["labs", "🏛 Лаборатории"],
            ["applications", "📋 Все заявки"],
            ["feedback", "💬 Отзывы"],
          ].map(([tab, label]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setMobileSidebarOpen(false); }}>
              {label}
              {tab === "users" && <span className="badge">{users.length}</span>}
              {tab === "feedback" && feedback.length > 0 && <span className="badge badge-green">{feedback.length}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={() => { supabase.auth.signOut(); navigate("/login"); }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="dash-main">
        <Header userProfile={{ name: "Администратор", role: "admin" }} />

        {/* ── ОБЗОР ── */}
        {activeTab === "overview" && (
          <div className="dash-content">
            <h1>Панель управления</h1>
            <p className="dash-subtitle">Добро пожаловать в панель администрирования inspirosk</p>
            <div className="stats-grid">
              {[
                { label: "Пользователей всего", value: users.length, icon: <Users size={24} /> },
                { label: "Студентов", value: students.length, icon: "🎓" },
                { label: "Профессоров", value: professors.length, icon: "👨‍🔬" },
                { label: "Лабораторий", value: labs.length, icon: <Folder size={24} /> },
                { label: "Заявок подано", value: applications.length, icon: <FileText size={24} /> },
                { label: "Принято в лабы", value: accepted.length, icon: <CheckCircle size={24} style={{ color: "var(--status-accepted)" }} /> },
              ].map(s => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <h2>Последние заявки</h2>
            <div className="applications-list">
              {applications.slice(0, 5).map(app => (
                <div className="app-card" key={app.id}>
                  <div className="app-info">
                    <h3>{app.studentName} → {app.labName}</h3>
                  </div>
                  <span className={`status-badge status-${app.status}`}>
                    {{ pending: "На рассмотрении", accepted: "Принят", rejected: "Отклонено", interview: "Интервью" }[app.status]}
                  </span>
                </div>
              ))}
            </div>

            <h2>Последние отзывы</h2>
            <div className="applications-list">
              {feedback.slice(0, 3).map(f => (
                <div className="app-card feedback-card" key={f.id}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{f.userName || "Аноним"}</strong>
                    <span className="status-badge status-pending" style={{ padding: "2px 8px", fontSize: 10 }}>{f.userRole}</span>
                  </div>
                  <p className="feedback-text">«{f.text}»</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── АНАЛИТИКА ── */}
        {activeTab === "analytics" && (
          <div className="dash-content">
            <h1>Аналитика платформы</h1>
            <p className="dash-subtitle">Конверсия, статистика по лабораториям и состав пользователей</p>

            <div className="stats-grid">
              {[
                { label: "Конверсия принятия", value: `${acceptRate}%`, icon: <BarChart2 size={24} /> },
                { label: "На интервью", value: interview.length, icon: "🎯" },
                { label: "Отклонено", value: rejected.length, icon: "❌" },
                { label: "Ожидают ответа", value: pending.length, icon: "⏳" },
              ].map(s => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <h2>Заявки по лабораториям</h2>
            <div style={{ background: "var(--dash-card)", border: "1px solid var(--border-color)", borderRadius: 18, padding: 28, boxShadow: "0 4px 20px var(--shadow)" }}>
              {appsByLab.length === 0
                ? <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Нет данных</p>
                : appsByLab.map(lab => {
                    const pct = applications.length ? Math.round((lab.count / applications.length) * 100) : 0;
                    const accPct = lab.count ? Math.round((lab.accepted / lab.count) * 100) : 0;
                    return (
                      <div key={lab.name} style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{lab.name}</span>
                          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{lab.count} заявок · {accPct}% принято</span>
                        </div>
                        <div style={{ height: 10, background: "var(--input-bg)", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 6, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    );
                  })
              }
            </div>

            <h2>Распределение статусов</h2>
            <div style={{ background: "var(--dash-card)", border: "1px solid var(--border-color)", borderRadius: 18, padding: 28, boxShadow: "0 4px 20px var(--shadow)", display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Ожидают", count: pending.length, color: "var(--status-pending)" },
                { label: "Интервью", count: interview.length, color: "var(--status-interview)" },
                { label: "Принято", count: accepted.length, color: "var(--status-accepted)" },
                { label: "Отклонено", count: rejected.length, color: "var(--status-rejected)" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 120, textAlign: "center", padding: 20, background: "var(--input-bg)", borderRadius: 14, borderTop: `4px solid ${s.color}`, boxShadow: "0 2px 8px var(--shadow)" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {applications.length ? `${Math.round(s.count / applications.length * 100)}%` : "0%"}
                  </div>
                </div>
              ))}
            </div>

            <h2>Состав пользователей</h2>
            <div style={{ background: "var(--dash-card)", border: "1px solid var(--border-color)", borderRadius: 18, padding: 28, boxShadow: "0 4px 20px var(--shadow)" }}>
              {[
                { label: "Студенты", count: students.length, color: "var(--primary)" },
                { label: "Профессора", count: professors.length, color: "var(--status-accepted)" },
                { label: "Администраторы", count: users.filter(u => u.role === "admin").length, color: "var(--status-rejected)" },
              ].map(r => {
                const pct = users.length ? Math.round(r.count / users.length * 100) : 0;
                return (
                  <div key={r.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifycontent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{r.label}</span>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: "var(--input-bg)", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: r.color, borderRadius: 6 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ПОЛЬЗОВАТЕЛИ ── */}
        {activeTab === "users" && (
          <div className="dash-content">
            <h1>Пользователи</h1>
            <p className="dash-subtitle">Управление ролями и учетными записями участников</p>
            <div className="search-input-wrapper">
              <svg className="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input className="search-input" placeholder="Поиск по имени или email..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr><th>Имя</th><th>Email</th><th>Роль</th><th>Действия</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.name || "—"}</td>
                      <td>{user.email}</td>
                      <td>
                        <select value={user.role} onChange={e => handleChangeRole(user.id, e.target.value)} className="role-select">
                          <option value="student">Студент</option>
                          <option value="professor">Профессор</option>
                          <option value="admin">Админ</option>
                        </select>
                      </td>
                      <td style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13, display: "flex", alignItems: "center" }} onClick={() => setWarningUser(user)}>
                          <ShieldAlert size={13} style={{ marginRight: 4 }} /> Предупреждения
                        </button>
                        <button className="btn-delete" style={{ padding: "6px 12px", fontSize: 13, display: "flex", alignItems: "center" }} onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 size={13} style={{ marginRight: 4 }} /> Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ЛАБОРАТОРИИ ── */}
        {activeTab === "labs" && (
          <div className="dash-content">
            <h1>Лаборатории</h1>
            <p className="dash-subtitle">Модерация зарегистрированных лабораторий</p>
            <div className="labs-grid">
              {labs.map(lab => {
                const isVerified = verifiedLabIds.includes(lab.id);
                const isHidden = hiddenLabIds.includes(lab.id);
                return (
                  <div 
                    className="lab-card" 
                    key={lab.id} 
                    style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      justifyContent: "space-between",
                      opacity: isHidden ? 0.65 : 1,
                      borderLeft: isHidden ? "4px solid var(--status-rejected)" : isVerified ? "4px solid var(--status-accepted)" : "1px solid var(--border-color)",
                      transition: "all 0.3s ease"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                          {lab.name}
                          {isVerified && <CheckCircle size={16} style={{ color: "var(--status-accepted)", fill: "rgba(16,185,129,0.1)" }} />}
                        </h3>
                        {isHidden && (
                          <span className="tag" style={{ background: "rgba(239,68,68,0.15)", color: "var(--status-rejected)" }}>
                            Скрыта
                          </span>
                        )}
                      </div>
                      <p className="lab-professor">👨‍🔬 {lab.professorName}</p>
                      <p className="lab-desc">{lab.description}</p>
                      {lab.requirements && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0 0" }}>📋 {lab.requirements}</p>}
                    </div>
                    
                    <div style={{ marginTop: 16 }}>
                      <div className="lab-tags" style={{ marginBottom: 12 }}>
                        {lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}
                      </div>
                      <div className="lab-footer" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginRight: "auto" }}>
                          Мест: {lab.openSpots}
                        </span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            onClick={() => {
                              setEditingLab(lab);
                              setEditLabName(lab.name);
                              setEditLabDesc(lab.description);
                              setEditLabSpots(lab.openSpots);
                            }}
                          >
                            <Edit size={12} style={{ marginRight: 4 }} /> Ред.
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ 
                              padding: "6px 10px", 
                              fontSize: 12,
                              borderColor: isVerified ? "var(--status-pending)" : "var(--status-accepted)",
                              color: isVerified ? "var(--status-pending)" : "var(--status-accepted)"
                            }}
                            onClick={() => toggleVerifyLab(lab.id)}
                          >
                            {isVerified ? "Снять вер." : "Вер."}
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            onClick={() => toggleHideLab(lab.id)}
                          >
                            {isHidden ? "Показать" : "Скрыть"}
                          </button>
                          <button 
                            className="btn-delete" 
                            style={{ padding: "6px 10px", fontSize: 12 }} 
                            onClick={() => handleDeleteLab(lab.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ВСЕ ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Все заявки</h1>
            <p className="dash-subtitle">Общий список заявлений от студентов Казахстана</p>
            <div className="applications-list">
              {applications.map(app => (
                <div className="app-card app-card-full" key={app.id}>
                  <div className="app-info">
                    <h3>{app.studentName}</h3>
                    <p className="app-email">{app.studentEmail} → <strong>{app.labName}</strong></p>
                    {app.motivation && <p className="app-motivation">«{app.motivation}»</p>}
                    {app.cvUrl && <a href={app.cvUrl} target="_blank" rel="noreferrer" className="cv-link">📄 CV</a>}
                  </div>
                  <span className={`status-badge status-${app.status}`}>
                    {{ pending: "На рассмотрении", accepted: "Принят", rejected: "Отклонено", interview: "Интервью" }[app.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ОТЗЫВЫ ── */}
        {activeTab === "feedback" && (
          <div className="dash-content">
            <h1>Отзывы пользователей</h1>
            <p className="dash-subtitle">Обратная связь от студентов и профессоров</p>
            {feedback.length === 0
              ? <div className="empty-state"><MessageSquare size={32} />Пока нет отзывов</div>
              : <div className="applications-list">
                  {feedback.map(f => (
                    <div className="app-card feedback-card" key={f.id}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>
                        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{f.userName || "Аноним"}</strong>
                        <span className={`status-badge ${f.userRole === "student" ? "status-interview" : "status-accepted"}`} style={{ padding: "2px 8px", fontSize: 10 }}>
                          {f.userRole}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                          {f.createdAt ? f.createdAt.toLocaleDateString("ru") : ""}
                        </span>
                      </div>
                      <p className="feedback-text" style={{ marginTop: 6 }}>«{f.text}»</p>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </main>

      {/* ── EDIT LAB MODAL ── */}
      {editingLab && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            width: "90%",
            maxWidth: "500px",
            backgroundColor: "var(--dash-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 20px 40px var(--shadow)",
            color: "var(--text-primary)"
          }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: 20 }}>Редактировать лабораторию</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Название лаборатории</label>
                <input 
                  type="text" 
                  value={editLabName} 
                  onChange={e => setEditLabName(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontSize: 14
                  }}
                />
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Описание</label>
                <textarea 
                  value={editLabDesc} 
                  onChange={e => setEditLabDesc(e.target.value)}
                  rows={4}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    resize: "vertical"
                  }}
                />
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Свободных мест</label>
                <input 
                  type="number" 
                  value={editLabSpots} 
                  onChange={e => setEditLabSpots(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontSize: 14
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button 
                className="btn-secondary" 
                style={{ padding: "10px 18px" }}
                onClick={() => setEditingLab(null)}
              >
                Отмена
              </button>
              <button 
                className="btn-apply" 
                style={{ padding: "10px 18px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
                onClick={handleSaveLab}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WARNINGS MODAL ── */}
      {warningUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            width: "95%",
            maxWidth: "600px",
            backgroundColor: "var(--dash-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 20px 40px var(--shadow)",
            color: "var(--text-primary)",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: 20 }}>Управление предупреждениями</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "var(--text-secondary)" }}>
              Пользователь: <strong>{warningUser.name || "Аноним"}</strong> ({warningUser.email})
            </p>
            
            {/* Warning History */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 10px 0", color: "var(--text-primary)" }}>История предупреждений</h3>
              {(() => {
                const currentUserInModal = users.find(u => u.id === warningUser.id);
                const getWarningsForUser = (user) => {
                  if (!user?.bio) return [];
                  try {
                    if (user.bio.startsWith("{") && user.bio.endsWith("}")) {
                      const parsed = JSON.parse(user.bio);
                      return parsed.warnings || [];
                    }
                  } catch (e) {}
                  return [];
                };
                const warningsList = getWarningsForUser(currentUserInModal);
                
                if (warningsList.length === 0) {
                  return (
                    <div style={{ padding: "16px", background: "var(--input-bg)", borderRadius: "8px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                      История пуста. Предупреждений нет.
                    </div>
                  );
                }
                
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "200px", overflowY: "auto", paddingRight: "6px" }}>
                    {warningsList.map((w, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: "12px", 
                          background: "var(--input-bg)", 
                          borderRadius: "8px", 
                          borderLeft: `4px solid ${w.level === "ban" ? "var(--status-rejected)" : w.level === "warning" ? "var(--status-pending)" : "var(--primary)"}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: "bold", textTransform: "uppercase", color: w.level === "ban" ? "var(--status-rejected)" : w.level === "warning" ? "var(--status-pending)" : "var(--primary)" }}>
                            {w.level === "ban" ? "Бан 🚫" : w.level === "warning" ? "Предупреждение ⚠️" : "Инфо ℹ️"}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{w.text}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{w.date}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            {/* New Warning Form */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 12px 0" }}>Выдать новое предупреждение</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Описание нарушения</label>
                  <textarea 
                    placeholder="Укажите причину предупреждения или блокировки..."
                    value={warningText}
                    onChange={e => setWarningText(e.target.value)}
                    rows={3}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      resize: "vertical"
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Уровень предупреждения</label>
                  <select 
                    value={warningLevel}
                    onChange={e => setWarningLevel(e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: 14
                    }}
                  >
                    <option value="info">Инфо ℹ️ (Информационное сообщение)</option>
                    <option value="warning">Предупреждение ⚠️ (Выговор)</option>
                    <option value="ban">Бан 🚫 (Блокировка действий)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button 
                className="btn-secondary" 
                style={{ padding: "10px 18px" }}
                onClick={() => {
                  setWarningUser(null);
                  setWarningText("");
                  setWarningLevel("info");
                }}
              >
                Закрыть
              </button>
              <button 
                className="btn-apply" 
                style={{ 
                  padding: "10px 18px", 
                  background: warningLevel === "ban" ? "var(--status-rejected)" : warningLevel === "warning" ? "var(--status-pending)" : "var(--primary)", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: "8px", 
                  cursor: "pointer" 
                }}
                onClick={handleIssueWarning}
                disabled={!warningText.trim()}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}