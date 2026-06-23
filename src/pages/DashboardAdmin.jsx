import { useState, useEffect } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  collection, getDocs, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
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

  const handleDeleteUser = async (userId) => {
    await deleteDoc(doc(db, "users", userId));
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleDeleteLab = async (labId) => {
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

  // Registrations over time (last 7 days mock from createdAt)
  const now = Date.now();
  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(now - (6-i)*86400000);
    return d.toLocaleDateString("ru",{weekday:"short"});
  });

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      <aside className="dash-sidebar">
        <div className="dash-logo">inspirosk</div>
        <div className="dash-user">
          <div className="dash-avatar admin-avatar">A</div>
          <div>
            <div className="dash-username">Администратор</div>
            <div className="dash-role" style={{color:"#e74c3c"}}>Admin</div>
          </div>
        </div>
        <nav className="dash-nav">
          {[
            ["overview","📊 Обзор"],
            ["analytics","📈 Аналитика"],
            ["users","👥 Пользователи"],
            ["labs","🏛 Лаборатории"],
            ["applications","📋 Все заявки"],
            ["feedback","💬 Отзывы"],
          ].map(([tab,label]) => (
            <button key={tab} className={activeTab===tab?"active":""} onClick={()=>setActiveTab(tab)}>
              {label}
              {tab==="users" && <span className="badge">{users.length}</span>}
              {tab==="feedback" && feedback.length > 0 && <span className="badge badge-green">{feedback.length}</span>}
            </button>
          ))}
        </nav>
        <button className="dash-logout" onClick={() => { signOut(auth); navigate("/login"); }}>Выйти</button>
      </aside>

      <main className="dash-main">

        {/* ── ОБЗОР ── */}
        {activeTab === "overview" && (
          <div className="dash-content">
            <h1>Панель управления</h1>
            <p className="dash-subtitle">Добро пожаловать в inspirosk — обзор платформы</p>
            <div className="stats-grid">
              {[
                {label:"Пользователей", value:users.length, icon:"👥"},
                {label:"Студентов", value:students.length, icon:"🎓"},
                {label:"Профессоров", value:professors.length, icon:"👨‍🔬"},
                {label:"Лабораторий", value:labs.length, icon:"🏛"},
                {label:"Заявок всего", value:applications.length, icon:"📋"},
                {label:"Принято", value:accepted.length, icon:"✅"},
              ].map(s => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <h2 style={{marginTop:40}}>Последние заявки</h2>
            <div className="applications-list">
              {applications.slice(0,5).map(app => (
                <div className="app-card" key={app.id}>
                  <div className="app-info">
                    <h3>{app.studentName} → {app.labName}</h3>
                  </div>
                  <span className={`status-badge status-${app.status}`}>
                    {{pending:"На рассмотрении",accepted:"Принят",rejected:"Отклонено",interview:"Интервью"}[app.status]}
                  </span>
                </div>
              ))}
            </div>

            <h2 style={{marginTop:32}}>Последние отзывы</h2>
            <div className="applications-list">
              {feedback.slice(0,3).map(f => (
                <div className="app-card" key={f.id}>
                  <div className="app-info">
                    <h3>{f.userName || "Аноним"} <span style={{fontSize:11,color:"#aaa",fontWeight:400}}>({f.userRole})</span></h3>
                    <p className="app-motivation">«{f.text}»</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── АНАЛИТИКА ── */}
        {activeTab === "analytics" && (
          <div className="dash-content">
            <h1>Аналитика платформы</h1>

            {/* KPI */}
            <div className="stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
              {[
                {label:"Конверсия заявок", value:`${acceptRate}%`, icon:"📊"},
                {label:"На интервью", value:interview.length, icon:"🎯"},
                {label:"Отклонено", value:rejected.length, icon:"❌"},
                {label:"Ожидают", value:pending.length, icon:"⏳"},
              ].map(s => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Заявки по лабораториям */}
            <h2 style={{marginTop:36,marginBottom:16}}>Заявки по лабораториям</h2>
            <div style={{background:"white",borderRadius:14,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              {appsByLab.length === 0
                ? <p style={{color:"#aaa",textAlign:"center"}}>Нет данных</p>
                : appsByLab.map(lab => {
                    const pct = applications.length ? Math.round((lab.count/applications.length)*100) : 0;
                    const accPct = lab.count ? Math.round((lab.accepted/lab.count)*100) : 0;
                    return (
                      <div key={lab.name} style={{marginBottom:18}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:14,fontWeight:600,color:"#1a1d2e"}}>{lab.name}</span>
                          <span style={{fontSize:13,color:"#888"}}>{lab.count} заявок · {accPct}% принято</span>
                        </div>
                        <div style={{height:10,background:"#f0f0f0",borderRadius:6,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:"#7c6df0",borderRadius:6,transition:"width 0.4s"}}/>
                        </div>
                      </div>
                    );
                  })
              }
            </div>

            {/* Статусы */}
            <h2 style={{marginTop:32,marginBottom:16}}>Распределение статусов</h2>
            <div style={{background:"white",borderRadius:14,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",display:"flex",gap:12,flexWrap:"wrap"}}>
              {[
                {label:"Ожидают",count:pending.length,color:"#f39c12"},
                {label:"Интервью",count:interview.length,color:"#3498db"},
                {label:"Принято",count:accepted.length,color:"#27ae60"},
                {label:"Отклонено",count:rejected.length,color:"#e74c3c"},
              ].map(s => (
                <div key={s.label} style={{flex:1,minWidth:120,textAlign:"center",padding:16,background:"#f9f9fb",borderRadius:10,borderTop:`4px solid ${s.color}`}}>
                  <div style={{fontSize:28,fontWeight:700,color:s.color}}>{s.count}</div>
                  <div style={{fontSize:13,color:"#888",marginTop:4}}>{s.label}</div>
                  <div style={{fontSize:12,color:"#bbb"}}>
                    {applications.length ? `${Math.round(s.count/applications.length*100)}%` : "0%"}
                  </div>
                </div>
              ))}
            </div>

            {/* Роли */}
            <h2 style={{marginTop:32,marginBottom:16}}>Состав пользователей</h2>
            <div style={{background:"white",borderRadius:14,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              {[
                {label:"Студенты", count:students.length, color:"#7c6df0"},
                {label:"Профессора", count:professors.length, color:"#27ae60"},
                {label:"Администраторы", count:users.filter(u=>u.role==="admin").length, color:"#e74c3c"},
              ].map(r => {
                const pct = users.length ? Math.round(r.count/users.length*100) : 0;
                return (
                  <div key={r.label} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:14,fontWeight:600}}>{r.label}</span>
                      <span style={{fontSize:13,color:"#888"}}>{r.count} ({pct}%)</span>
                    </div>
                    <div style={{height:8,background:"#f0f0f0",borderRadius:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:r.color,borderRadius:6}}/>
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
            <input className="search-input" placeholder="Поиск по имени или email..."
              value={search} onChange={e => setSearch(e.target.value)}/>
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
                      <button className="btn-delete" onClick={() => handleDeleteUser(user.id)}>🗑 Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ЛАБОРАТОРИИ ── */}
        {activeTab === "labs" && (
          <div className="dash-content">
            <h1>Лаборатории</h1>
            <div className="labs-grid">
              {labs.map(lab => (
                <div className="lab-card" key={lab.id}>
                  <h3>{lab.name}</h3>
                  <p className="lab-professor">👨‍🔬 {lab.professorName}</p>
                  <p className="lab-desc">{lab.description}</p>
                  {lab.requirements && <p style={{fontSize:12,color:"#999",margin:0}}>📋 {lab.requirements}</p>}
                  <div className="lab-tags">{lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                  <div className="lab-footer">
                    <span>Мест: {lab.openSpots}</span>
                    <button className="btn-delete" onClick={() => handleDeleteLab(lab.id)}>🗑 Удалить</button>
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
                    {{pending:"На рассмотрении",accepted:"Принят",rejected:"Отклонено",interview:"Интервью"}[app.status]}
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
            {feedback.length === 0
              ? <div className="empty-state">Пока нет отзывов</div>
              : <div className="applications-list">
                  {feedback.map(f => (
                    <div className="app-card" key={f.id} style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <strong style={{fontSize:14}}>{f.userName || "Аноним"}</strong>
                        <span className={`status-badge ${f.userRole==="student"?"badge-indigo":"badge-green"}`} style={{padding:"2px 8px",fontSize:11}}>
                          {f.userRole}
                        </span>
                        <span style={{fontSize:12,color:"#aaa"}}>{f.createdAt?.toDate?.().toLocaleDateString("ru")}</span>
                      </div>
                      <p style={{fontSize:14,color:"#555",margin:0}}>«{f.text}»</p>
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