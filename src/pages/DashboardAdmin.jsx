import { useState, useEffect } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  collection, getDocs, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Users, Folder, FileText, MessageSquare, LogOut, Trash2, Shield, Palette
} from "lucide-react";
import "./Dashboard.css";

export default function DashboardAdmin() {
  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

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
        getDocs(collection(db, "users")),
        getDocs(collection(db, "labs")),
        getDocs(collection(db, "applications")),
        getDocs(collection(db, "feedback")),
      ]);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLabs(labsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFeedback(fbSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    await deleteDoc(doc(db, "users", userId));
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleDeleteLab = async (labId) => {
    if (!window.confirm("Вы уверены, что хотите удалить лабораторию?")) return;
    await deleteDoc(doc(db, "labs", labId));
    setLabs(prev => prev.filter(l => l.id !== labId));
  };

  const handleChangeRole = async (userId, newRole) => {
    await updateDoc(doc(db, "users", userId), { role: newRole });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
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
      {/* ── SIDEBAR ── */}
      <aside className="dash-sidebar">
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
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {label}
              {tab === "users" && <span className="badge">{users.length}</span>}
              {tab === "feedback" && feedback.length > 0 && <span className="badge badge-green">{feedback.length}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={() => { signOut(auth); navigate("/login"); }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="dash-main">

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
                      <td>
                        <button className="btn-delete" onClick={() => handleDeleteUser(user.id)}>
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
              {labs.map(lab => (
                <div className="lab-card" key={lab.id}>
                  <h3>{lab.name}</h3>
                  <p className="lab-professor">👨‍🔬 {lab.professorName}</p>
                  <p className="lab-desc">{lab.description}</p>
                  {lab.requirements && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>📋 {lab.requirements}</p>}
                  <div className="lab-tags">{lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                  <div className="lab-footer">
                    <span>Мест: {lab.openSpots}</span>
                    <button className="btn-delete" onClick={() => handleDeleteLab(lab.id)}>
                      <Trash2 size={13} /> Удалить
                    </button>
                  </div>
                </div>
              ))}
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
                          {f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString("ru") : ""}
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
    </div>
  );
}