import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Paperclip, LogOut, CheckCircle, Clock, FileText,
  Info, Star, Upload, Palette, Plus, Landmark, Briefcase, ShieldAlert, Video
} from "lucide-react";
import "./Dashboard.css";
import { useTranslation } from "../context/TranslationContext";
import Header from "../components/Header.jsx";
import InterviewBar from "../components/InterviewBar.jsx";

export default function DashboardBusiness() {
  const { t } = useTranslation();

  useEffect(() => {
    window.onStartVideoCall = (url) => {
      setJoiningVideoRoom(url);
    };
    return () => {
      window.onStartVideoCall = null;
    };
  }, []);

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [commercialProjects, setCommercialProjects] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [myCooperations, setMyCooperations] = useState([]);
  const [chats, setChats] = useState({});
  const [activeTab, setActiveTab] = useState("commercial-projects");
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  
  const [joiningVideoRoom, setJoiningVideoRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [proposingTo, setProposingTo] = useState(null);
  const [proposalText, setProposalText] = useState("");
  const [bizSearchQuery, setBizSearchQuery] = useState("");
  const [bizProtoStatus, setBizProtoStatus] = useState("");

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // New Challenge Form State
  const [challengeForm, setChallengeForm] = useState({
    title: "", description: "", researchArea: "Machine Learning", budget: "", deadline: ""
  });

  // Theme State
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("inspiro-theme") || "cosmic-dark"
  );

  const RESEARCH_AREAS = [
    "Machine Learning", "Биоинформатика", "Материаловедение",
    "Нейронауки", "Физика", "Химия", "Робототехника", "Data Science",
  ];

  const THEMES = [
    { id: "cosmic-dark", name: "🌌 Cosmic Dark" },
    { id: "modern-light", name: "☀️ Modern Light" },
    { id: "neon-cyberpunk", name: "⚡ Neon Cyberpunk" },
    { id: "emerald-forest", name: "🌲 Emerald Forest" },
    { id: "sunset-glow", name: "🌅 Sunset Glow" },
  ];

  const chatBottomRef = useRef(null);
  const navigate = useNavigate();

  const getWarnings = () => {
    if (!userData?.bio) return [];
    try {
      if (userData.bio.startsWith("{") && userData.bio.endsWith("}")) {
        const parsed = JSON.parse(userData.bio);
        return parsed.warnings || [];
      }
    } catch (e) {}
    return [];
  };

  const fetchCoops = async (userId) => {
    const { data: coopsData } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", userId);
    setMyCooperations(coopsData || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return navigate("/login");
      setUser(currentUser);

      // 1. Fetch User Data
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profile) {
        setUserData(profile);
      }

      // 2. Fetch Commercial Projects (labs where is_commercial is true)
      const { data: labsData } = await supabase.from("labs").select("*");
      const commProjs = (labsData || []).filter(l => l.is_commercial);
      setCommercialProjects(commProjs);

      // 3. Fetch My Posted Challenges
      const { data: challenges } = await supabase
        .from("business_challenges")
        .select("*")
        .eq("company_id", currentUser.id);
      setMyChallenges(challenges || []);

      // 4. Fetch My Cooperations (applications where student_id == current user id)
      await fetchCoops(currentUser.id);

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // Fetch Messages helper
  const fetchMessages = async (appId) => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("application_id", appId)
      .order("created_at", { ascending: true });
    
    setChats(prev => ({
      ...prev,
      [appId]: msgs || []
    }));
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  // Chat listener
  useEffect(() => {
    if (!activeChatId) return;

    fetchMessages(activeChatId);

    const subscription = supabase
      .channel(`chat_${activeChatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `application_id=eq.${activeChatId}` },
        () => {
          fetchMessages(activeChatId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChatId]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("inspiro-theme", newTheme);
  };

  const handleCreateChallenge = async () => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете публиковать задачи.");
      return;
    }
    if (!challengeForm.title || !challengeForm.description) return alert("Заполните заголовок и описание");
    
    const challengeData = {
      title: challengeForm.title,
      description: challengeForm.description,
      research_area: challengeForm.researchArea,
      budget: Number(challengeForm.budget || 0),
      deadline: challengeForm.deadline || "",
      company_id: user.id,
      company_name: userData?.company_name || "Бизнес Партнер",
      representative_name: userData?.name || user.email,
    };

    const { data: newChallenge } = await supabase.from("business_challenges").insert(challengeData).select().single();
    if (newChallenge) {
      setMyChallenges(prev => [...prev, newChallenge]);
    }
    setShowChallengeForm(false);
    setChallengeForm({
      title: "", description: "", researchArea: "Machine Learning", budget: "", deadline: ""
    });
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("Удалить этот технологический запрос?")) return;
    await supabase.from("business_challenges").delete().eq("id", id);
    setMyChallenges(prev => prev.filter(c => c.id !== id));
  };

  const handleProposeCooperation = async (proj) => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете предлагать сотрудничество.");
      return;
    }
    if (!proposalText.trim()) return alert("Введите текст предложения");

    const coopData = {
      student_id: user.id,
      student_name: `${userData?.company_name || "Инвестор"} (${userData?.name || user.email})`,
      student_email: user.email,
      lab_id: proj.id,
      lab_name: proj.name,
      professor_id: proj.professor_id,
      motivation: proposalText,
      status: "pending",
      is_investor_proposal: true,
      timeline_data: [{ status: "pending", date: new Date().toLocaleDateString("ru"), note: "Отправлено инвестиционное предложение." }]
    };

    await supabase.from("applications").insert(coopData);
    await fetchCoops(user.id);
    
    setProposingTo(null);
    setProposalText("");

    alert("Предложение отправлено автору проекта!");
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const textToSend = chatMessage;
    setChatMessage("");

    await supabase.from("messages").insert({
      application_id: appId,
      text: textToSend,
      sender_id: user.id,
      sender_name: userData?.company_name || "Инвестор",
      sender_role: "business",
    });
  };

  const initials = userData?.company_name?.slice(0, 2).toUpperCase() || "BI";

  const chatApps = myCooperations.filter(c => c.status === "accepted" || c.status === "interview");
  const activeChatApp = chatApps.find(a => a.id === activeChatId);

  const statusLabel = s => ({ pending: "На рассмотрении у авторов", accepted: "Связь установлена ✓", rejected: "Отклонено", interview: "🎯 Назначена встреча" }[s] || s);
  const statusClass = s => ({ pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected", interview: "status-interview" }[s] || "");

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      
      {/* Mobile Header */}
      <header className="mobile-header" style={{ display: "none" }}>
        <button className="menu-toggle-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
          ☰ Меню
        </button>
        <span className="land-logo" style={{ fontSize: 18, fontWeight: "bold" }}>inspirosk</span>
      </header>

      {/* Sidebar */}
      <aside className={`dash-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="dash-logo">inspirosk</div>

        <div className="dash-user">
          <div className="dash-avatar" style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            {initials}
          </div>
          <div>
            <div className="dash-username">{userData?.name || "Инвестор"}</div>
            <div className="dash-role">Бизнес / Партнер</div>
          </div>
        </div>

        <div className="theme-selector-container">
          <label className="theme-label"><Palette size={12} style={{ marginRight: 4 }} /> Тема</label>
          <select value={activeTheme} onChange={(e) => handleThemeChange(e.target.value)} className="theme-dropdown">
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <nav className="dash-nav">
          {[
            ["commercial-projects", "💼 " + t("nav.commercial_projects"), commercialProjects.length],
            ["my-challenges", "⚡ " + t("nav.challenges"), myChallenges.length],
            ["cooperations", "🤝 " + t("nav.my_applications"), myCooperations.length],
            ["interview", "🎯 " + t("nav.interviews"), myCooperations.filter(c => c.status === "interview").length],
            ["chat", "💬 " + t("nav.chats"), chatApps.length],
            ["profile", "👤 " + t("common.profile"), 0],
          ].map(([tab, label, count]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setMobileSidebarOpen(false); if(tab === "chat" && chatApps.length > 0) setActiveChatId(chatApps[0].id); }}>
              {label}
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={() => { supabase.auth.signOut(); navigate("/login"); }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        <Header userProfile={userData} onOpenSettings={() => setActiveTab("profile")} />

        {getWarnings().map((w, idx) => (
          <div key={idx} style={{ 
            margin: "16px 32px 0 32px", 
            padding: "12px 18px", 
            borderRadius: 12, 
            background: w.level === "ban" ? "rgba(239,68,68,0.15)" : w.level === "warning" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
            border: `1px solid ${w.level === "ban" ? "var(--status-rejected)" : w.level === "warning" ? "var(--status-pending)" : "var(--primary)"}`,
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <ShieldAlert size={20} style={{ color: w.level === "ban" ? "var(--status-rejected)" : w.level === "warning" ? "var(--status-pending)" : "var(--primary)", flexShrink: 0 }} />
            <div>
              <strong style={{ textTransform: "uppercase", fontSize: 12, display: "block" }}>
                Системное предупреждение: {w.level === "ban" ? "БАН" : w.level === "warning" ? "ПРЕДУПРЕЖДЕНИЕ" : "ИНФО"}
              </strong>
              <span style={{ fontSize: 13 }}>{w.text}</span>
            </div>
          </div>
        ))}

        {/* ── ИНТЕРВЬЮ ── */}
        {activeTab === "interview" && (
          <div className="dash-content">
            <h1>{t("nav.interviews")}</h1>
            <p className="dash-subtitle">Собеседования по вашим прикладным предложениям</p>

            {myCooperations.filter(c => c.status === "interview").length === 0 ? (
              <div className="empty-state">
                <Video size={32} />
                У вас нет приглашений на интервью.
              </div>
            ) : (
              <div className="labs-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
                {myCooperations.filter(c => c.status === "interview").map(app => (
                  <div className="lab-card" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0" }}>{app.lab_name}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--primary-light)" }}>
                        Ученый: {app.student_name}
                      </p>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                      <InterviewBar 
                        application={app} 
                        currentUserRole="student" // Treat investor as candidate selector here
                        onUpdate={async () => fetchCoops(user.id)} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Commercial Projects Marketplace */}
        {activeTab === "commercial-projects" && (
          <div className="dash-content">
            <h1>Рынок прикладных разработок</h1>
            <p className="dash-subtitle">Научные проекты и продукты с коммерческим потенциалом в Казахстане</p>

            {/* Filters Bar */}
            <div className="filters-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "var(--dash-card)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <input
                type="text"
                placeholder="Поиск по названию проекта, ключевым словам или автору..."
                value={bizSearchQuery}
                onChange={e => setBizSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", flex: 1, minWidth: "200px" }}
              />
              <select
                value={bizProtoStatus}
                onChange={e => setBizProtoStatus(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", outline: "none" }}
              >
                <option value="">Все стадии прототипа</option>
                <option value="разработ">В разработке 🛠</option>
                <option value="прототип">Готовый прототип ⚙️</option>
                <option value="иде">Концепт / Идея 💡</option>
                <option value="рын">Рыночный продукт 🚀</option>
              </select>
            </div>

            {(() => {
              const filteredCommercialProjects = commercialProjects.filter(proj => {
                const matchesSearch = !bizSearchQuery || 
                  proj.name?.toLowerCase().includes(bizSearchQuery.toLowerCase()) || 
                  proj.description?.toLowerCase().includes(bizSearchQuery.toLowerCase()) ||
                  proj.professor_name?.toLowerCase().includes(bizSearchQuery.toLowerCase());
                
                const matchesProto = !bizProtoStatus || 
                  proj.prototype_status?.toLowerCase().includes(bizProtoStatus.toLowerCase());
                
                return matchesSearch && matchesProto;
              });

              if (filteredCommercialProjects.length === 0) {
                return <div className="empty-state"><Landmark size={32} />Прикладных проектов не найдено.</div>;
              }

              return (
                <div className="labs-grid">
                  {filteredCommercialProjects.map(proj => {
                    const coop = myCooperations.find(c => c.lab_id === proj.id);
                    return (
                      <div className="lab-card" key={proj.id} style={{ borderLeft: "4px solid var(--status-pending)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <h3>{proj.name}</h3>
                          <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)" }}>$ {proj.funding_needed?.toLocaleString() || "Финансирование"}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--primary-light)", margin: "4px 0" }}>
                          👨‍🔬 Автор: {proj.professor_name} {proj.is_independent ? "(Независимый)" : ""}
                        </p>
                        <p className="lab-desc">{proj.description}</p>
                        
                        <div style={{ background: "var(--input-bg)", padding: 12, borderRadius: 8, margin: "12px 0", fontSize: 13 }}>
                          <p style={{ margin: "4px 0" }}>🛠 <strong>Статус прототипа:</strong> {proj.prototype_status || "В разработке"}</p>
                          <p style={{ margin: "4px 0" }}>📊 <strong>Рыночный потенциал:</strong> {proj.market_potential || "Ожидает оценки"}</p>
                        </div>

                        <div className="lab-tags">
                          {proj.research_areas?.map(a => <span key={a} className="tag">{a}</span>)}
                        </div>

                        <div className="lab-footer" style={{ marginTop: 15 }}>
                          <span>Сделка: доля/контракт</span>
                          {coop ? (
                            <span className={`status-badge ${statusClass(coop.status)}`}>{statusLabel(coop.status)}</span>
                          ) : (
                            <button className="btn-apply" onClick={() => setProposingTo(proj)}>Связаться / Инвестировать</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 2: My Challenges */}
        {activeTab === "my-challenges" && (
          <div className="dash-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h1>Технологические запросы бизнеса (R&D)</h1>
                <p className="dash-subtitle">Публикуйте проблемы вашего бизнеса, которые могут решить ученые и инженеры</p>
              </div>
              <button className="btn-apply" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowChallengeForm(!showChallengeForm)}>
                <Plus size={16} /> Опубликовать запрос
              </button>
            </div>

            {showChallengeForm && (
              <div className="lab-card" style={{ marginBottom: 30, padding: 24 }}>
                <h2>Новый запрос на исследование (Challenge)</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
                  <div className="field-group">
                    <label>Название проблемы</label>
                    <input type="text" placeholder="Тема..." value={challengeForm.title} onChange={e => setChallengeForm({...challengeForm, title: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Описание задачи</label>
                    <textarea placeholder="Опишите требования..." value={challengeForm.description} onChange={e => setChallengeForm({...challengeForm, description: e.target.value})} rows={4} />
                  </div>
                  <div className="field-group">
                    <label>Научная область</label>
                    <select value={challengeForm.researchArea} onChange={e => setChallengeForm({...challengeForm, researchArea: e.target.value})}>
                      {RESEARCH_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Бюджет на R&D ($)</label>
                    <input type="number" placeholder="Бюджет..." value={challengeForm.budget} onChange={e => setChallengeForm({...challengeForm, budget: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Сроки</label>
                    <input type="text" placeholder="Дедлайн..." value={challengeForm.deadline} onChange={e => setChallengeForm({...challengeForm, deadline: e.target.value})} />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    <button className="btn-apply" onClick={handleCreateChallenge}>Опубликовать</button>
                    <button className="btn-secondary" onClick={() => setShowChallengeForm(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}

            {myChallenges.length === 0 && <div className="empty-state"><Briefcase size={32} />У вас нет активных запросов.</div>}

            <div className="labs-grid">
              {myChallenges.map(ch => (
                <div className="lab-card" key={ch.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3>{ch.title}</h3>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: 11, color: "var(--status-rejected)" }} onClick={() => handleDeleteChallenge(ch.id)}>Удалить</button>
                  </div>
                  <p className="lab-desc">{ch.description}</p>
                  <div style={{ background: "var(--input-bg)", padding: 10, borderRadius: 8, margin: "10px 0", fontSize: 12 }}>
                    <p style={{ margin: "2px 0" }}>💰 <strong>Грант / Бюджет:</strong> ${ch.budget}</p>
                    <p style={{ margin: "2px 0" }}>⏳ <strong>Дедлайн:</strong> {ch.deadline || "Не ограничен"}</p>
                  </div>
                  <div className="lab-tags">
                    <span className="tag">{ch.research_area}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Cooperation Proposals Sent */}
        {activeTab === "cooperations" && (
          <div className="dash-content">
            <h1>Мои предложения о сотрудничестве</h1>
            <p className="dash-subtitle">Список проектов, которым вы предложили инвестиции или партнерство</p>

            {myCooperations.length === 0 && <div className="empty-state"><Clock size={32} />Вы еще не отправляли предложений.</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {myCooperations.map(coop => (
                <div className="lab-card" key={coop.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3>{coop.lab_name}</h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>Предложение: "{coop.motivation.slice(0, 60)}..."</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`status-badge ${statusClass(coop.status)}`}>{statusLabel(coop.status)}</span>
                    {(coop.status === "accepted" || coop.status === "interview") && (
                      <button className="btn-apply" onClick={() => { setActiveTab("chat"); setActiveChatId(coop.id); }}>Чат 💬</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Chats */}
        {activeTab === "chat" && (
          <div className="dash-content chat-tab-container" style={{ height: "calc(100vh - 120px)" }}>
            <h1>Переговоры</h1>
            <div className="chat-window-layout" style={{ display: "flex", height: "90%", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", background: "var(--dash-sidebar)" }}>
              {/* Chat sidebar */}
              <div className="chat-list-sidebar" style={{ width: 250, borderRight: "1px solid var(--border-color)" }}>
                {chatApps.length === 0 ? (
                  <p style={{ padding: 15, fontSize: 12, color: "var(--text-muted)" }}>Нет активных переписок.</p>
                ) : (
                  chatApps.map(app => (
                    <div key={app.id} className={`chat-item-node ${activeChatId === app.id ? "active-node" : ""}`} onClick={() => setActiveChatId(app.id)} style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid var(--border-color)", background: activeChatId === app.id ? "var(--primary-glow)" : "transparent" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{app.lab_name}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>Автор: {app.student_name}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat messages */}
              <div className="chat-main-window" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {activeChatId && activeChatApp ? (
                  <>
                    <div className="chat-header" style={{ padding: 12, borderBottom: "1px solid var(--border-color)", background: "var(--dash-card)" }}>
                      <h4 style={{ margin: 0 }}>{activeChatApp.lab_name}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Диалог по сделке</p>
                    </div>
                    <div className="chat-messages-container" style={{ flex: 1, padding: 15, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                      {(chats[activeChatId] || []).map(msg => {
                        const isMe = msg.sender_id === user.id;
                        return (
                          <div key={msg.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", background: isMe ? "var(--primary)" : "var(--dash-card)", padding: "10px 14px", borderRadius: 12, maxWidth: "60%" }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: "bold", color: isMe ? "#fff" : "var(--primary-light)" }}>{msg.sender_name}</p>
                            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#fff" }}>{msg.text}</p>
                          </div>
                        );
                      })}
                      <div ref={chatBottomRef} />
                    </div>
                    <div className="chat-input-row" style={{ padding: 12, display: "flex", gap: 8, background: "var(--dash-card)" }}>
                      <input type="text" placeholder="Введите сообщение..." value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage(activeChatId)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "#fff" }} />
                      <button className="btn-apply" onClick={() => handleSendMessage(activeChatId)} style={{ padding: "10px 15px" }}><Send size={16} /></button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Выберите переписку для начала общения</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Profile */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Профиль инвестора / компании</h1>
            <p className="dash-subtitle">Контактные данные и сферы интересов</p>

            <div className="lab-card" style={{ padding: 24 }}>
              <h2>{userData?.company_name}</h2>
              <p style={{ color: "var(--status-pending)" }}>Бизнес-партнер / Инвестор</p>
              <p><strong>Представитель:</strong> {userData?.name}</p>
              <p><strong>Email:</strong> {userData?.email}</p>
              <p><strong>Индустрия:</strong> {userData?.position}</p>
              <p><strong>О компании:</strong></p>
              <p style={{ background: "var(--input-bg)", padding: 12, borderRadius: 8 }}>{userData?.description}</p>
            </div>
          </div>
        )}

      </main>

      {/* Propose Modal */}
      {proposingTo && (
        <div className="lightbox-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", zIndex: 100 }}>
          <div className="lab-card" style={{ width: "500px", padding: 24 }}>
            <h2>Предложение сотрудничества</h2>
            <p>Проект: {proposingTo.name}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
              <textarea
                value={proposalText}
                onChange={e => setProposalText(e.target.value)}
                placeholder="Опишите предложение..."
                rows={5}
                required
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn-apply" onClick={() => handleProposeCooperation(proposingTo)}>Отправить</button>
                <button className="btn-secondary" onClick={() => setProposingTo(null)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Daily.co Video Interview Iframe Modal ── */}
      {joiningVideoRoom && (
        <div className="modal-overlay" onClick={() => setJoiningVideoRoom(null)}>
          <div className="modal" style={{ maxWidth: 800, width: "95%", height: "600px", padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 10, marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>🎥 Видео-интервью Daily.co</h3>
              <button className="btn-secondary" onClick={() => setJoiningVideoRoom(null)} style={{ padding: "4px 8px" }}>Выйти</button>
            </div>
            <iframe 
              title="Видео-интервью Daily.co"
              src={joiningVideoRoom} 
              allow="camera; microphone; fullscreen; display-capture; autoplay" 
              style={{ width: "100%", height: "480px", border: "none", borderRadius: 12 }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
