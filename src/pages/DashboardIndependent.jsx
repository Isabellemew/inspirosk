import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Paperclip, LogOut, CheckCircle, Clock, FileText,
  Info, Star, Upload, Palette, Plus, UserPlus, Heart, ShieldAlert, Video, Briefcase
} from "lucide-react";
import "./Dashboard.css";
import { useTranslation } from "../context/TranslationContext";
import Header from "../components/Header.jsx";
import InterviewBar from "../components/InterviewBar.jsx";

export default function DashboardIndependent() {
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
  const [myProjects, setMyProjects] = useState([]);
  const [allIndependentProjects, setAllIndependentProjects] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [receivedApplications, setReceivedApplications] = useState([]);
  const [chats, setChats] = useState({});
  const [activeTab, setActiveTab] = useState("discover");
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [applyingTo, setApplyingTo] = useState(null);
  const [motivation, setMotivation] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  
  const [businessChallenges, setBusinessChallenges] = useState([]);
  const [joiningVideoRoom, setJoiningVideoRoom] = useState(null);

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // New Project Form State
  const [projectForm, setProjectForm] = useState({
    name: "", description: "", researchAreas: [], openSpots: 2,
    requirements: "", challenges: "", howToApply: "",
    isCommercial: false, fundingNeeded: "", prototypeStatus: "", marketPotential: ""
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", github: "", linkedin: "", skills: "", interests: []
  });

  // Theme State
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("inspiro-theme") || "cosmic-dark"
  );

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterCommercial, setFilterCommercial] = useState(false);

  const fileInputRef = useRef(null);
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

  const fetchApps = async (userId, myProjIds) => {
    // Fetch apps I sent
    const { data: myApps } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", userId);
    setMyApplications(myApps || []);

    // Fetch received apps
    if (myProjIds.length > 0) {
      const { data: recApps } = await supabase
        .from("applications")
        .select("*")
        .in("lab_id", myProjIds);
      setReceivedApplications(recApps || []);
    }
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
        setProfileForm({
          name: profile.name || "",
          bio: profile.bio || "",
          github: profile.github || "",
          linkedin: profile.linkedin || "",
          skills: profile.skills || "",
          interests: profile.interests || [],
        });
      }

      // 2. Fetch Independent Projects
      const { data: labsData } = await supabase.from("labs").select("*");
      const allLabs = labsData || [];

      const myProjs = allLabs.filter(l => l.professor_id === currentUser.id && l.is_independent);
      setMyProjects(myProjs);

      const otherInd = allLabs.filter(l => l.is_independent && l.professor_id !== currentUser.id);
      setAllIndependentProjects(otherInd);

      // 3. Fetch applications
      const myProjIds = myProjs.map(p => p.id);
      await fetchApps(currentUser.id, myProjIds);

      // 4. Fetch Corporate Challenges
      const { data: challenges } = await supabase.from("business_challenges").select("*");
      setBusinessChallenges(challenges || []);

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

  const handleSaveProfile = async () => {
    await supabase.from("profiles").update({ ...profileForm }).eq("id", user.id);
    setUserData(prev => ({ ...prev, ...profileForm }));
    setEditingProfile(false);
  };

  const handleCreateProject = async () => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете публиковать проекты.");
      return;
    }
    if (!projectForm.name || !projectForm.description) return alert("Заполните название и описание");
    
    const newProjData = {
      name: projectForm.name,
      description: projectForm.description,
      research_areas: projectForm.researchAreas,
      open_spots: Number(projectForm.openSpots),
      requirements: projectForm.requirements || "",
      challenges: projectForm.challenges || "",
      how_to_apply: projectForm.howToApply || "",
      is_independent: true,
      professor_id: user.id,
      professor_name: userData?.name || user.email,
      no_experience_ok: true,
      international_ok: true,
      prep_level: "beginner",
      is_commercial: !!projectForm.isCommercial,
      funding_needed: projectForm.isCommercial ? Number(projectForm.fundingNeeded || 0) : 0,
      prototype_status: projectForm.isCommercial ? projectForm.prototypeStatus || "" : "",
      market_potential: projectForm.isCommercial ? projectForm.marketPotential || "" : "",
    };

    const { data: newProj } = await supabase.from("labs").insert(newProjData).select().single();
    if (newProj) {
      setMyProjects(prev => [...prev, newProj]);
    }
    setShowProjectForm(false);
    setProjectForm({
      name: "", description: "", researchAreas: [], openSpots: 2,
      requirements: "", challenges: "", howToApply: "",
      isCommercial: false, fundingNeeded: "", prototypeStatus: "", marketPotential: ""
    });
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Удалить этот проект?")) return;
    await supabase.from("labs").delete().eq("id", id);
    setMyProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleApply = async (proj) => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете откликаться на проекты.");
      return;
    }
    if (!motivation.trim()) return alert("Напишите мотивационное письмо");
    setCvUploading(true);
    let cvUrl = null;
    if (cvFile) {
      try {
        const fileName = `${user.id}_${proj.id}_${Date.now()}_${cvFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("cvs")
          .upload(fileName, cvFile);

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from("cvs")
          .getPublicUrl(fileName);
        cvUrl = publicUrl;
      } catch (err) {
        alert("Ошибка загрузки резюме: " + err.message);
        setCvUploading(false);
        return;
      }
    }

    await supabase.from("applications").insert({
      student_id: user.id,
      student_name: userData?.name || user.email,
      student_email: user.email,
      lab_id: proj.id,
      lab_name: proj.name,
      professor_id: proj.professor_id,
      motivation,
      cv_url: cvUrl,
      status: "pending",
      timeline_data: [{ status: "pending", date: new Date().toLocaleDateString("ru"), note: "Предложено соавторство." }]
    });

    setApplyingTo(null);
    setMotivation("");
    setCvFile(null);
    setCvUploading(false);

    const myProjIds = myProjects.map(p => p.id);
    await fetchApps(user.id, myProjIds);
  };

  const handleStatus = async (appId, status) => {
    const matchedApp = receivedApplications.find(a => a.id === appId);
    if (!matchedApp) return;

    const timeline = matchedApp.timeline_data || [];
    const notes = {
      accepted: "Соавтор принят в проект!",
      rejected: "Кандидатура соавтора отклонена.",
      interview: "Автор проекта назначил созвон для обсуждения."
    };
    const updatedTimeline = [
      ...timeline,
      { status, date: new Date().toLocaleDateString("ru"), note: notes[status] || "Статус обновлен" }
    ];

    await supabase.from("applications").update({ status, timeline_data: updatedTimeline }).eq("id", appId);
    const myProjIds = myProjects.map(p => p.id);
    await fetchApps(user.id, myProjIds);
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const textToSend = chatMessage;
    setChatMessage("");

    await supabase.from("messages").insert({
      application_id: appId,
      text: textToSend,
      sender_id: user.id,
      sender_name: userData?.name || "Исследователь",
      sender_role: "independent",
    });
  };

  const update = (field) => (e) => setProfileForm(p => ({ ...p, [field]: e.target.value }));

  const toggleArea = (area) => {
    setProjectForm(prev => ({
      ...prev,
      researchAreas: prev.researchAreas.includes(area)
        ? prev.researchAreas.filter(a => a !== area)
        : [...prev.researchAreas, area]
    }));
  };

  const statusLabel = s => ({ pending: "На рассмотрении", accepted: "Принят ✓", rejected: "Отклонено", interview: "🎯 Интервью" }[s] || s);
  const statusClass = s => ({ pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected", interview: "status-interview" }[s] || "");

  const chatApps = [
    ...myApplications.filter(a => a.status === "accepted" || a.status === "interview"),
    ...receivedApplications.filter(a => a.status === "accepted" || a.status === "interview")
  ];

  // Filters logic
  const filteredProjects = allIndependentProjects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = !filterArea || p.research_areas?.includes(filterArea);
    const matchesComm = !filterCommercial || p.is_commercial;
    return matchesSearch && matchesArea && matchesComm;
  });

  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "IR";
  const activeChatApp = chatApps.find(a => a.id === activeChatId);

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
          <div className="dash-avatar" style={userData?.avatar_url ? { padding: 0, overflow: "hidden" } : {}}>
            {userData?.avatar_url ? <img src={userData.avatar_url} alt="avatar" /> : initials}
          </div>
          <div>
            <div className="dash-username">{userData?.name || "Исследователь"}</div>
            <div className="dash-role">Соавтор</div>
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
            ["discover", "🔍 " + t("nav.discover"), filteredProjects.length],
            ["my-projects", "💡 " + t("nav.my_projects"), myProjects.length],
            ["requests", "📥 " + t("nav.applications") + " (In)", receivedApplications.filter(a => a.status === "pending").length],
            ["applications", "📤 " + t("nav.my_applications"), myApplications.length],
            ["interview", "🎯 " + t("nav.interviews"), [
              ...myApplications.filter(a => a.status === "interview"),
              ...receivedApplications.filter(a => a.status === "interview")
            ].length],
            ["business-challenges", "💼 " + t("nav.challenges"), businessChallenges.length],
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
            <p className="dash-subtitle">Управление расписанием собеседований</p>
            {[
              ...myApplications.filter(a => a.status === "interview"),
              ...receivedApplications.filter(a => a.status === "interview")
            ].length === 0 ? (
              <div className="empty-state">
                <Video size={32} />
                У вас нет активных собеседований.
              </div>
            ) : (
              <div className="labs-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
                {[
                  ...myApplications.filter(a => a.status === "interview"),
                  ...receivedApplications.filter(a => a.status === "interview")
                ].map(app => {
                  const isIncoming = app.professor_id === user.id;
                  return (
                    <div className="lab-card" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px 0" }}>{app.lab_name}</h3>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--primary-light)" }}>
                          {isIncoming ? `Кандидат: ${app.student_name}` : `Автор проекта: ${app.student_name}`}
                        </p>
                      </div>
                      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                        <InterviewBar 
                          application={app} 
                          currentUserRole={isIncoming ? "professor" : "student"} 
                          onUpdate={async () => {
                            const myProjIds = myProjects.map(p => p.id);
                            await fetchApps(user.id, myProjIds);
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ЗАПРОСЫ БИЗНЕСА ── */}
        {activeTab === "business-challenges" && (
          <div className="dash-content">
            <h1>Запросы бизнеса (R&D)</h1>
            <p className="dash-subtitle">Научно-прикладные проблемы предприятий Казахстана, требующие решения</p>
            {businessChallenges.length === 0 ? (
              <div className="empty-state"><Briefcase size={32} />Запросов от компаний пока нет.</div>
            ) : (
              <div className="labs-grid">
                {businessChallenges.map(ch => (
                  <div className="lab-card" key={ch.id} style={{ borderLeft: "4px solid var(--status-pending)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <h3>{ch.title}</h3>
                        <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)" }}>$ {ch.budget?.toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--primary-light)", margin: "4px 0" }}>🏢 Компания: {ch.company_name}</p>
                      <p className="lab-desc">{ch.description}</p>
                      <div style={{ background: "var(--input-bg)", padding: 10, borderRadius: 8, margin: "10px 0", fontSize: 12 }}>
                        <p style={{ margin: "2px 0" }}>⏳ <strong>Дедлайн:</strong> {ch.deadline || "Не ограничен"}</p>
                        <p style={{ margin: "2px 0" }}>🔬 <strong>Направление:</strong> {ch.research_area}</p>
                      </div>
                    </div>
                    <button className="btn-apply" onClick={async () => {
                      const coopData = {
                        student_id: ch.company_id,
                        student_name: ch.company_name,
                        student_email: "",
                        lab_id: ch.id,
                        lab_name: `R&D: ${ch.title}`,
                        professor_id: user.id,
                        motivation: `Как независимый ученый, я заинтересован в решении вашей R&D задачи: "${ch.title}". Готов обсудить соавторство/контракт.`,
                        status: "accepted", 
                        timeline_data: [{ status: "accepted", date: new Date().toLocaleDateString("ru"), note: "Сотрудничество по R&D начато." }]
                      };
                      await supabase.from("applications").insert(coopData);
                      const myProjIds = myProjects.map(p => p.id);
                      await fetchApps(user.id, myProjIds);
                      alert("Сотрудничество инициировано! Перейдите во вкладку 'Чат' для связи.");
                      setActiveTab("chat");
                    }}>
                      Предложить решение / Написать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Discover Projects */}
        {activeTab === "discover" && (
          <div className="dash-content">
            <h1>Поиск соавторов</h1>
            <p className="dash-subtitle">Найдите интересные независимые проекты и станьте соавтором</p>

            <div className="filters-bar" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", flex: 1 }}
              />
              <select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
              >
                <option value="">Все направления</option>
                {RESEARCH_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={filterCommercial} onChange={e => setFilterCommercial(e.target.checked)} />
                Коммерческие
              </label>
            </div>

            {filteredProjects.length === 0 && <div className="empty-state"><Info size={32} />Проектов соавторства пока нет. Создайте свой в соседней вкладке!</div>}

            <div className="labs-grid">
              {filteredProjects.map(proj => {
                const applied = myApplications.find(a => a.lab_id === proj.id);
                return (
                  <div className="lab-card" key={proj.id} style={{ borderLeft: proj.is_commercial ? "4px solid var(--status-pending)" : "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3>{proj.name}</h3>
                      {proj.is_commercial && <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)" }}>💰 Коммерческий</span>}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--primary-light)", margin: "4px 0" }}>👤 Автор: {proj.professor_name}</p>
                    <p className="lab-desc">{proj.description}</p>
                    {proj.requirements && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0 0" }}>📋 Требуемые соавторы: {proj.requirements}</p>}
                    {proj.challenges && <p style={{ fontSize: 12, color: "var(--status-rejected)", margin: "4px 0 0 0" }}>⚠️ Сложности: {proj.challenges}</p>}
                    
                    <div className="lab-tags" style={{ marginTop: 10 }}>
                      {proj.research_areas?.map(a => <span key={a} className="tag">{a}</span>)}
                    </div>

                    <div className="lab-footer" style={{ marginTop: 15 }}>
                      <span>Ищет соавторов: {proj.open_spots || 2}</span>
                      {applied ? (
                        <span className={`status-badge ${statusClass(applied.status)}`}>{statusLabel(applied.status)}</span>
                      ) : (
                        <button className="btn-apply" onClick={() => setApplyingTo(proj)}>Предложить соавторство</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: My Projects */}
        {activeTab === "my-projects" && (
          <div className="dash-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h1>Мои исследовательские проекты</h1>
                <p className="dash-subtitle">Создавайте свои работы и ищите соавторов</p>
              </div>
              <button className="btn-apply" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowProjectForm(!showProjectForm)}>
                <Plus size={16} /> Создать проект
              </button>
            </div>

            {showProjectForm && (
              <div className="lab-card" style={{ marginBottom: 30, padding: 24 }}>
                <h2>Новая исследовательская работа</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
                  <div className="field-group">
                    <label>Название проекта</label>
                    <input type="text" placeholder="Название..." value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Описание идеи</label>
                    <textarea placeholder="Опишите гипотезу..." value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} rows={4} />
                  </div>
                  <div className="field-group">
                    <label>Кого вы ищете (Навыки)</label>
                    <input type="text" placeholder="Пример: Frontend-разработчик" value={projectForm.requirements} onChange={e => setProjectForm({...projectForm, requirements: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Сложности (Будьте честны)</label>
                    <input type="text" placeholder="Сложности..." value={projectForm.challenges} onChange={e => setProjectForm({...projectForm, challenges: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Направления</label>
                    <div className="chips">
                      {RESEARCH_AREAS.map(a => (
                        <button key={a} type="button" className={`chip ${projectForm.researchAreas.includes(a) ? "active" : ""}`} onClick={() => toggleArea(a)}>{a}</button>
                      ))}
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Количество соавторов</label>
                    <input type="number" min="1" value={projectForm.openSpots} onChange={e => setProjectForm({...projectForm, openSpots: e.target.value})} />
                  </div>

                  <div className="field-group" style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid var(--border-color)", padding: 12, borderRadius: 8 }}>
                    <input type="checkbox" checked={projectForm.isCommercial} onChange={e => setProjectForm({...projectForm, isCommercial: e.target.checked})} />
                    <div>
                      <label style={{ margin: 0, fontWeight: "bold" }}>Проект имеет коммерческую ценность</label>
                    </div>
                  </div>

                  {projectForm.isCommercial && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 16, borderLeft: "2px solid var(--status-pending)" }}>
                      <div className="field-group">
                        <label>Необходимое финансирование ($)</label>
                        <input type="number" value={projectForm.fundingNeeded} onChange={e => setProjectForm({...projectForm, fundingNeeded: e.target.value})} />
                      </div>
                      <div className="field-group">
                        <label>Статус прототипа</label>
                        <input type="text" value={projectForm.prototypeStatus} onChange={e => setProjectForm({...projectForm, prototypeStatus: e.target.value})} />
                      </div>
                      <div className="field-group">
                        <label>Описание рыночного потенциала</label>
                        <textarea value={projectForm.marketPotential} onChange={e => setProjectForm({...projectForm, marketPotential: e.target.value})} rows={2} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    <button className="btn-apply" onClick={handleCreateProject}>Опубликовать</button>
                    <button className="btn-secondary" onClick={() => setShowProjectForm(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}

            {myProjects.length === 0 && <div className="empty-state"><Info size={32} />У вас пока нет созданных проектов.</div>}

            <div className="labs-grid">
              {myProjects.map(proj => (
                <div className="lab-card" key={proj.id} style={{ borderLeft: proj.is_commercial ? "4px solid var(--status-pending)" : "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3>{proj.name}</h3>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: 11, color: "var(--status-rejected)" }} onClick={() => handleDeleteProject(proj.id)}>Удалить</button>
                  </div>
                  <p className="lab-desc">{proj.description}</p>
                  {proj.is_commercial && (
                    <div style={{ background: "var(--input-bg)", padding: 10, borderRadius: 8, margin: "10px 0", fontSize: 12 }}>
                      <p style={{ margin: "2px 0" }}>💰 <strong>Бюджет:</strong> ${proj.funding_needed}</p>
                      <p style={{ margin: "2px 0" }}>🛠 <strong>Прототип:</strong> {proj.prototype_status}</p>
                    </div>
                  )}
                  <div className="lab-tags">
                    {proj.research_areas?.map(a => <span key={a} className="tag">{a}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Received Applications */}
        {activeTab === "requests" && (
          <div className="dash-content">
            <h1>Заявки в ваши проекты</h1>
            <p className="dash-subtitle">Рассмотрите предложения соавторства от других исследователей</p>

            {receivedApplications.length === 0 && <div className="empty-state"><UserPlus size={32} />Новых заявок нет.</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {receivedApplications.map(app => (
                <div className="lab-card" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{app.student_name}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--primary-light)" }}>Проект: {app.lab_name}</p>
                    </div>
                    <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
                  </div>
                  <p style={{ fontSize: 13, background: "var(--input-bg)", padding: 12, borderRadius: 8 }}>
                    <strong>Мотивация:</strong> {app.motivation}
                  </p>
                  {app.cv_url && (
                    <a href={app.cv_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: "fit-content", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      <FileText size={14} /> Открыть резюме
                    </a>
                  )}

                  {app.status === "pending" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button className="btn-apply" onClick={() => handleStatus(app.id, "accepted")}>Принять соавтора</button>
                      <button className="btn-secondary" style={{ color: "var(--status-interview)" }} onClick={() => handleStatus(app.id, "interview")}>Назначить созвон</button>
                      <button className="btn-secondary" style={{ color: "var(--status-rejected)" }} onClick={() => handleStatus(app.id, "rejected")}>Отклонить</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Sent Applications */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Ваши заявки на соавторство</h1>
            <p className="dash-subtitle">Следите за статусом отправленных предложений</p>

            {myApplications.length === 0 && <div className="empty-state"><Clock size={32} />Вы еще не подавали заявок.</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
              {myApplications.map(app => (
                <div className="lab-card" key={app.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3>{app.lab_name}</h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>Подано: {new Date(app.created_at).toLocaleDateString("ru")}</p>
                  </div>
                  <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Chat */}
        {activeTab === "chat" && (
          <div className="dash-content chat-tab-container" style={{ height: "calc(100vh - 120px)" }}>
            <h1>Обсуждения</h1>
            <div className="chat-window-layout" style={{ display: "flex", height: "90%", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", background: "var(--dash-sidebar)" }}>
              {/* Chat sidebar */}
              <div className="chat-list-sidebar" style={{ width: 250, borderRight: "1px solid var(--border-color)" }}>
                {chatApps.length === 0 ? (
                  <p style={{ padding: 15, fontSize: 12, color: "var(--text-muted)" }}>Нет чатов.</p>
                ) : (
                  chatApps.map(app => (
                    <div key={app.id} className={`chat-item-node ${activeChatId === app.id ? "active-node" : ""}`} onClick={() => setActiveChatId(app.id)} style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid var(--border-color)", background: activeChatId === app.id ? "var(--primary-glow)" : "transparent" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{app.lab_name}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>{app.student_name}</p>
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
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Чат участников проекта</p>
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
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Выберите чат для начала общения</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Profile */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Мой профиль</h1>
            <p className="dash-subtitle">Личные настройки соавтора</p>

            <div className="lab-card" style={{ padding: 24 }}>
              {editingProfile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="field-group">
                    <label>Имя</label>
                    <input type="text" value={profileForm.name} onChange={update("name")} />
                  </div>
                  <div className="field-group">
                    <label>О себе</label>
                    <textarea value={profileForm.bio} onChange={update("bio")} rows={3} />
                  </div>
                  <div className="field-group">
                    <label>GitHub</label>
                    <input type="text" value={profileForm.github} onChange={update("github")} />
                  </div>
                  <div className="field-group">
                    <label>LinkedIn</label>
                    <input type="text" value={profileForm.linkedin} onChange={update("linkedin")} />
                  </div>
                  <div className="field-group">
                    <label>Навыки</label>
                    <input type="text" value={profileForm.skills} onChange={update("skills")} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-apply" onClick={handleSaveProfile}>Сохранить</button>
                    <button className="btn-secondary" onClick={() => setEditingProfile(false)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2>{userData?.name}</h2>
                  <p style={{ color: "var(--primary-light)" }}>Независимый исследователь</p>
                  <p>{userData?.bio || "О себе не заполнено."}</p>
                  <hr style={{ borderColor: "var(--border-color)", margin: "15px 0" }} />
                  <p><strong>GitHub:</strong> {userData?.github}</p>
                  <p><strong>LinkedIn:</strong> {userData?.linkedin}</p>
                  <p><strong>Навыки:</strong> {userData?.skills}</p>
                  <button className="btn-apply" style={{ marginTop: 15 }} onClick={() => setEditingProfile(true)}>Редактировать</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Knowledge Hub */}
        {activeTab === "knowledge-hub" && (
          <div className="dash-content">
            <h1>📚 База Знаний</h1>
            <p className="dash-subtitle">Руководство по запуску независимого исследования</p>
            <div className="lab-card" style={{ padding: 20 }}>
              <h3>Как привлечь соавторов?</h3>
              <p>Четко формулируйте задачи и цели работы. Описывайте ожидаемый вклад соавтора.</p>
            </div>
          </div>
        )}

      </main>

      {/* Application Modal */}
      {applyingTo && (
        <div className="lightbox-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", zIndex: 100 }}>
          <div className="lab-card" style={{ width: "500px", padding: 24 }}>
            <h2>Предложение соавторства</h2>
            <p>Проект: {applyingTo.name}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
              <textarea
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                placeholder="Расскажите о своем опыте и видении..."
                rows={4}
                required
              />
              <input type="file" onChange={e => setCvFile(e.target.files[0])} />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn-apply" onClick={() => handleApply(applyingTo)} disabled={cvUploading}>
                  {cvUploading ? "Отправка..." : "Отправить"}
                </button>
                <button className="btn-secondary" onClick={() => setApplyingTo(null)}>Отмена</button>
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
