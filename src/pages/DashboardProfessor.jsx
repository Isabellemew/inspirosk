import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, LogOut, CheckCircle, Clock,
  Info, Upload, Palette, Briefcase, ShieldAlert
} from "lucide-react";
import "./Dashboard.css";
import { useTranslation } from "../context/TranslationContext";
import Header from "../components/Header.jsx";
import InterviewBar from "../components/InterviewBar.jsx";

export default function DashboardProfessor() {
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
  const [lab, setLab] = useState(null);
  const [applications, setApplications] = useState([]);
  const [chats, setChats] = useState({});
  const [activeTab, setActiveTab] = useState("applications");
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLabForm, setShowLabForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [businessChallenges, setBusinessChallenges] = useState([]);

  // AI scoring states
  const [scoringAppId, setScoringAppId] = useState(null);
  const [profSearchQuery, setProfSearchQuery] = useState("");
  const [profMinAiScore, setProfMinAiScore] = useState("");
  const [joiningVideoRoom, setJoiningVideoRoom] = useState(null);
  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Lab and Profile Form states
  const [labForm, setLabForm] = useState({
    name: "", description: "", researchAreas: [], openSpots: 3,
    requirements: "", responsibilities: "", benefits: "", papers: "",
    noExperienceOk: false, prepLevel: "beginner", internationalOk: false,
    challenges: "", howToApply: "", isCommercial: false,
    fundingNeeded: "", prototypeStatus: "", marketPotential: ""
  });
  const [profileForm, setProfileForm] = useState({
    name: "", university: "", department: "", position: "",
    bio: "", website: "", googleScholar: "", linkedin: "",
    researchgate: "", achievements: "", papers: ""
  });

  // Themes
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("inspiro-theme") || "cosmic-dark"
  );

  // Lightbox States
  const [activeImageUrl, setActiveImageUrl] = useState(null);

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
    "Machine Learning", "Data Science", "Robotics", "NLP", "Computer Vision",
    "Cybersecurity", "Bioinformatics", "HCI", "Networks", "Algorithms",
    "Биоинформатика", "Материаловедение", "Нейронауки", "Физика", "Химия"
  ];

  const THEMES = [
    { id: "cosmic-dark", name: "🌌 Cosmic Dark" },
    { id: "modern-light", name: "☀️ Modern Light" },
    { id: "neon-cyberpunk", name: "⚡ Neon Cyberpunk" },
    { id: "emerald-forest", name: "🌲 Emerald Forest" },
    { id: "sunset-glow", name: "🌅 Sunset Glow" },
  ];

  const fetchApps = async (userId) => {
    const { data: appsData } = await supabase
      .from("applications")
      .select("*")
      .eq("professor_id", userId);
    setApplications(appsData || []);
  };

  // Fetch initial profile, labs, applications
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
          university: profile.university || "",
          department: profile.department || "",
          position: profile.position || "",
          bio: profile.bio || "",
          website: profile.website || "",
          googleScholar: profile.googleScholar || "",
          linkedin: profile.linkedin || "",
          researchgate: profile.researchgate || "",
          achievements: profile.achievements || "",
          papers: profile.papers || ""
        });
      }

      // 2. Fetch Lab Data
      const { data: labsData } = await supabase
        .from("labs")
        .select("*")
        .eq("professor_id", currentUser.id);

      if (labsData && labsData.length > 0) {
        const labData = labsData[0];
        setLab(labData);
        setLabForm({
          name: labData.name || "",
          description: labData.description || "",
          researchAreas: labData.research_areas || [],
          openSpots: labData.open_spots || 3,
          requirements: labData.requirements || "",
          responsibilities: labData.responsibilities || "",
          benefits: labData.benefits || "",
          papers: labData.papers || "",
          noExperienceOk: !!labData.no_experience_ok,
          prepLevel: labData.prep_level || "beginner",
          internationalOk: !!labData.international_ok,
          challenges: labData.challenges || "",
          howToApply: labData.how_to_apply || "",
          isCommercial: !!labData.is_commercial,
          fundingNeeded: labData.funding_needed || "",
          prototypeStatus: labData.prototype_status || "",
          marketPotential: labData.market_potential || ""
        });
      }

      // 3. Fetch applications
      await fetchApps(currentUser.id);

      // 4. Fetch Business Challenges
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

  // REAL-TIME Chat Listener for selected activeChatId
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

  // Theme changer
  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("inspiro-theme", newTheme);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fileName = `${user.id}_${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setUserData(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (err) {
      alert("Ошибка загрузки фото: " + err.message);
    }
    setAvatarUploading(false);
  };

  const handleSaveProfile = async () => {
    await supabase.from("profiles").update({ ...profileForm }).eq("id", user.id);
    setUserData(prev => ({ ...prev, ...profileForm }));
    setEditingProfile(false);
  };

  const handleCreateLab = async () => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете редактировать лабораторию.");
      return;
    }
    const labData = {
      name: labForm.name,
      description: labForm.description,
      research_areas: labForm.researchAreas,
      open_spots: Number(labForm.openSpots),
      requirements: labForm.requirements || "",
      responsibilities: labForm.responsibilities || "",
      benefits: labForm.benefits || "",
      papers: labForm.papers || "",
      no_experience_ok: !!labForm.noExperienceOk,
      prep_level: labForm.prepLevel || "beginner",
      international_ok: !!labForm.internationalOk,
      challenges: labForm.challenges || "",
      how_to_apply: labForm.howToApply || "",
      is_commercial: !!labForm.isCommercial,
      funding_needed: labForm.isCommercial ? Number(labForm.fundingNeeded || 0) : 0,
      prototype_status: labForm.isCommercial ? labForm.prototypeStatus || "" : "",
      market_potential: labForm.isCommercial ? labForm.marketPotential || "" : "",
      professor_id: user.id,
      professor_name: userData?.name || user.email,
    };

    if (lab?.id) {
      await supabase.from("labs").update(labData).eq("id", lab.id);
      setLab({ id: lab.id, ...labData });
    } else {
      const { data: newLabRes } = await supabase.from("labs").insert(labData).select().single();
      if (newLabRes) setLab(newLabRes);
    }
    setShowLabForm(false);
  };

  const handleStatus = async (appId, status) => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете совершать действия с заявками.");
      return;
    }
    const matchedApp = applications.find(a => a.id === appId);
    if (!matchedApp) return;

    const timeline = matchedApp.timeline_data || [];
    const notes = {
      accepted: "Принят в лабораторию. Поздравляем!",
      rejected: "К сожалению, ваша кандидатура отклонена.",
      interview: "Руководитель пригласил вас на видео-собеседование."
    };
    
    const updatedTimeline = [
      ...timeline,
      { status, date: new Date().toLocaleDateString("ru"), note: notes[status] || "Статус обновлен" }
    ];

    await supabase.from("applications").update({ status, timeline_data: updatedTimeline }).eq("id", appId);
    await fetchApps(user.id);
  };


  // AI applicant score trigger
  const handleScoreApplication = async (appId) => {
    setScoringAppId(appId);
    try {
      const res = await fetch("http://localhost:8000/api/score-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`Оценка кандидата завершена! Балл: ${data.score}/100`);
        await fetchApps(user.id);
      } else {
        alert("Не удалось рассчитать балл.");
      }
    } catch {
      alert("Ошибка подключения к backend на http://localhost:8000. Запустите Python сервер.");
    }
    setScoringAppId(null);
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const textToSend = chatMessage;
    setChatMessage("");

    await supabase.from("messages").insert({
      application_id: appId,
      text: textToSend,
      sender_id: user.id,
      sender_name: userData?.name || "Профессор",
      sender_role: "professor",
    });
  };


  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    await supabase.from("feedback").insert({
      text: feedbackText,
      user_id: user.id,
      user_role: "professor",
      user_name: userData?.name || "",
    });
    setFeedbackText("");
    setFeedbackSent(true);
  };

  const handleJumpToChat = (appId) => {
    setActiveTab("chat");
    setActiveChatId(appId);
  };

  const applyProfFilters = (list) => {
    return list.filter(app => {
      const matchesSearch = !profSearchQuery || 
        app.student_name?.toLowerCase().includes(profSearchQuery.toLowerCase()) || 
        app.student_email?.toLowerCase().includes(profSearchQuery.toLowerCase()) ||
        app.motivation?.toLowerCase().includes(profSearchQuery.toLowerCase());
      
      const matchesAi = !profMinAiScore || (app.ai_score !== undefined && app.ai_score !== null && app.ai_score >= Number(profMinAiScore));
      
      return matchesSearch && matchesAi;
    });
  };

  const pending = applyProfFilters(applications.filter(a => a.status === "pending"));
  const interview = applyProfFilters(applications.filter(a => a.status === "interview"));
  const accepted = applyProfFilters(applications.filter(a => a.status === "accepted"));
  const chatApps = applications.filter(a => a.status === "accepted" || a.status === "interview");
  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "P";

  const activeChatApp = chatApps.find(a => a.id === activeChatId);

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
          <div className="dash-avatar professor-avatar" style={userData?.avatar_url ? { padding: 0, overflow: "hidden" } : {}}>
            {userData?.avatar_url
              ? <img src={userData.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials}
          </div>
          <div>
            <div className="dash-username">{userData?.name || "Профессор"}</div>
            <div className="dash-role">Профессор</div>
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
            ["applications", "📥 Заявки", pending.length],
            ["interview", "🎯 Интервью", interview.length],
            ["students", "👥 Студенты", accepted.length],
            ["chat", "💬 Чат", chatApps.length],
            ["lab", "🏛 Лаборатория", 0],
            ["business-challenges", "💼 Запросы бизнеса", businessChallenges.length],
            ["profile", "👤 Профиль", 0],
            ["support", "🛠 Поддержка", 0],
          ].map(([tab, label, count]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setMobileSidebarOpen(false); }}>
              {label}
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={() => { supabase.auth.signOut(); navigate("/login"); }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
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

        {/* ── ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Входящие заявки</h1>
            <p className="dash-subtitle">Рассмотрите кандидатуры студентов на свободные места</p>

            {lab && (
              <div className="filters-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "var(--dash-card)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <input
                  type="text"
                  placeholder="Поиск по имени, email или мотивации..."
                  value={profSearchQuery}
                  onChange={e => setProfSearchQuery(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", flex: 1, minWidth: "200px" }}
                />
                <select
                  value={profMinAiScore}
                  onChange={e => setProfMinAiScore(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", outline: "none" }}
                >
                  <option value="">Все оценки AI</option>
                  <option value="90">AI-Оценка &gt;= 90 🏆</option>
                  <option value="80">AI-Оценка &gt;= 80 🌟</option>
                  <option value="50">AI-Оценка &gt;= 50 👍</option>
                </select>
              </div>
            )}

            {!lab && <div className="empty-state"><Info size={32} />Сначала создайте лабораторию во вкладке «Лаборатория».</div>}
            {pending.length === 0 && lab && <div className="empty-state"><CheckCircle size={32} />Новых заявок нет.</div>}
            <div className="applications-list">
              {pending.map(app => (
                <div className="app-card app-card-full" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="app-info">
                      <h3 style={{ margin: 0 }}>{app.student_name}</h3>
                      <p className="app-email" style={{ margin: "2px 0 0 0" }}>{app.student_email}</p>
                      <p className="app-motivation" style={{ marginTop: 10 }}>«{app.motivation}»</p>
                      {app.cv_url && (
                        <a href={app.cv_url} target="_blank" rel="noreferrer" className="cv-link">📄 Резюме (CV)</a>
                      )}
                      <p className="app-date" style={{ marginTop: 6 }}><Clock size={12} /> {new Date(app.created_at).toLocaleDateString("ru")}</p>
                    </div>

                    {/* AI Scoring Area on card */}
                    <div style={{ background: "var(--input-bg)", padding: 12, borderRadius: 10, maxWidth: 260, border: "1px solid var(--border-color)" }}>
                      {app.ai_score ? (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "bold" }}>
                            <span>🤖 AI-Оценка:</span>
                            <span style={{ color: app.ai_score >= 80 ? "var(--status-accepted)" : app.ai_score >= 50 ? "var(--status-pending)" : "var(--status-rejected)" }}>
                              {app.ai_score} / 100
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.3 }}>{app.ai_feedback}</p>
                        </div>
                      ) : (
                        <button className="btn-secondary" style={{ width: "100%", fontSize: 11 }} onClick={() => handleScoreApplication(app.id)} disabled={scoringAppId === app.id}>
                          🤖 {scoringAppId === app.id ? "Оцениваем..." : "Оценить по AI"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="app-actions" style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
                    <button className="btn-accept" onClick={() => handleStatus(app.id, "accepted")}>✓ Принять</button>
                    <button className="btn-interview" onClick={() => handleStatus(app.id, "interview")}>🎯 Интервью</button>
                    <button className="btn-reject" onClick={() => handleStatus(app.id, "rejected")}>✗ Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ИНТЕРВЬЮ ── */}
        {activeTab === "interview" && (
          <div className="dash-content">
            <h1>{t("nav.interviews")}</h1>
            <p className="dash-subtitle">Управление расписанием собеседований с кандидатами</p>

            <div className="filters-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "var(--dash-card)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <input
                type="text"
                placeholder="Поиск по имени, email или мотивации..."
                value={profSearchQuery}
                onChange={e => setProfSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", flex: 1, minWidth: "200px" }}
              />
              <select
                value={profMinAiScore}
                onChange={e => setProfMinAiScore(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", outline: "none" }}
              >
                <option value="">Все оценки AI</option>
                <option value="90">AI-Оценка &gt;= 90 🏆</option>
                <option value="80">AI-Оценка &gt;= 80 🌟</option>
                <option value="50">AI-Оценка &gt;= 50 👍</option>
              </select>
            </div>

            {interview.length === 0 ? (
              <div className="empty-state">
                <Info size={32} />
                Никого на стадии интервью.
              </div>
            ) : (
              <div className="labs-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
                {interview.map(app => (
                  <div className="lab-card" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0" }}>{app.student_name}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{app.student_email}</p>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                      <InterviewBar 
                        application={app} 
                        currentUserRole="professor" 
                        onUpdate={async () => fetchApps(user.id)} 
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                      <button className="btn-accept" style={{ padding: "6px 12px", fontSize: 12, flex: 1 }} onClick={() => handleStatus(app.id, "accepted")}>✓ Принять</button>
                      <button className="btn-reject" style={{ padding: "6px 12px", fontSize: 12, flex: 1 }} onClick={() => handleStatus(app.id, "rejected")}>✗ Отклонить</button>
                      <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleJumpToChat(app.id)}>
                        <MessageSquare size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── СТУДЕНТЫ ── */}
        {activeTab === "students" && (
          <div className="dash-content">
            <h1>Принятые соавторы</h1>
            <p className="dash-subtitle">Список студентов, успешно прошедших отбор</p>

            <div className="filters-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "var(--dash-card)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <input
                type="text"
                placeholder="Поиск по имени, email или мотивации..."
                value={profSearchQuery}
                onChange={e => setProfSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", flex: 1, minWidth: "200px" }}
              />
              <select
                value={profMinAiScore}
                onChange={e => setProfMinAiScore(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", outline: "none" }}
              >
                <option value="">Все оценки AI</option>
                <option value="90">AI-Оценка &gt;= 90 🏆</option>
                <option value="80">AI-Оценка &gt;= 80 🌟</option>
                <option value="50">AI-Оценка &gt;= 50 👍</option>
              </select>
            </div>

            {accepted.length === 0
              ? <div className="empty-state"><Info size={32} />Принятых студентов пока нет.</div>
              : <div className="applications-list">
                  {accepted.map(app => (
                    <div className="app-card app-card-full" key={app.id}>
                      <div className="app-info">
                        <h3>{app.student_name}</h3>
                        <p className="app-email">{app.student_email}</p>
                      </div>
                      <div className="app-actions">
                        <button className="btn-secondary" onClick={() => handleJumpToChat(app.id)}>
                          <MessageSquare size={14} style={{ marginRight: 4 }} /> Написать в чат
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── ЧАТ ── */}
        {activeTab === "chat" && (
          <div className="dash-content chat-tab-container" style={{ height: "calc(100vh - 120px)" }}>
            <h1>Чат обсуждения</h1>
            <div className="chat-window-layout" style={{ display: "flex", height: "90%", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", background: "var(--dash-sidebar)" }}>
              {/* Chat sidebar */}
              <div className="chat-list-sidebar" style={{ width: 250, borderRight: "1px solid var(--border-color)" }}>
                {chatApps.length === 0 ? (
                  <p style={{ padding: 15, fontSize: 12, color: "var(--text-muted)" }}>Нет активных чатов.</p>
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
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Диалог со студентом: {activeChatApp.student_name}</p>
                    </div>
                    <div className="chat-messages-container" style={{ flex: 1, padding: 15, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                      {(chats[activeChatId] || []).map(msg => {
                        const isMe = msg.sender_id === user.id;
                        return (
                          <div key={msg.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", background: isMe ? "var(--primary)" : "var(--dash-card)", padding: "10px 14px", borderRadius: 12, maxWidth: "60%" }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: "bold", color: isMe ? "#fff" : "var(--primary-light)" }}>{msg.sender_name}</p>
                            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#fff" }}>{msg.text}</p>
                            {msg.file_url && (
                              <div style={{ marginTop: 5 }}>
                                <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ color: "#00ffcc", fontSize: 12, textDecoration: "underline" }}>📄 Открыть вложение</a>
                              </div>
                            )}
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

        {/* ── ЛАБОРАТОРИЯ ── */}
        {activeTab === "lab" && (
          <div className="dash-content">
            <h1>Моя лаборатория</h1>
            <p className="dash-subtitle">Информация о вашем исследовательском проекте</p>
            {lab ? (
              <div className="profile-card" style={{ flexDirection: "column", gap: 16 }}>
                <div className="profile-row"><span>Название:</span> <span>{lab.name}</span></div>
                <div className="profile-row"><span>Описание:</span> <span>{lab.description}</span></div>
                <div className="profile-row"><span>Требования:</span> <span>{lab.requirements || "—"}</span></div>
                <div className="profile-row"><span>Обязанности:</span> <span>{lab.responsibilities || "—"}</span></div>
                <div className="profile-row"><span>Что получит студент:</span> <span>{lab.benefits || "—"}</span></div>
                
                <hr style={{ borderColor: "var(--border-color)", margin: "8px 0" }} />
                <h3 style={{ margin: 0, color: "var(--primary-light)" }}>Прозрачность для студентов</h3>
                <div className="profile-row"><span>Без опыта:</span> <span>{lab.no_experience_ok ? "Да 👍" : "Нет"}</span></div>
                <div className="profile-row"><span>Уровень подготовки:</span> <span>{lab.prep_level === "beginner" ? "Начальный" : lab.prep_level === "intermediate" ? "Средний" : "Продвинутый"}</span></div>
                <div className="profile-row"><span>Иностранные студенты:</span> <span>{lab.international_ok ? "Да 🌍" : "Нет"}</span></div>
                <div className="profile-row"><span>Сложности/Вызовы:</span> <span>{lab.challenges || "—"}</span></div>
                <div className="profile-row"><span>Инструкция по подаче:</span> <span>{lab.how_to_apply || "—"}</span></div>

                <hr style={{ borderColor: "var(--border-color)", margin: "8px 0" }} />
                <h3 style={{ margin: 0, color: "var(--status-pending)" }}>Коммерциализация и бизнес</h3>
                <div className="profile-row"><span>Статус продукта:</span> <span>{lab.is_commercial ? "Прикладной коммерческий продукт 💰" : "Академическое исследование"}</span></div>
                {lab.is_commercial && (
                  <>
                    <div className="profile-row"><span>Финансирование ($):</span> <span>{lab.funding_needed?.toLocaleString() || "—"}</span></div>
                    <div className="profile-row"><span>Статус прототипа:</span> <span>{lab.prototype_status || "—"}</span></div>
                    <div className="profile-row"><span>Рыночный потенциал:</span> <span>{lab.market_potential || "—"}</span></div>
                  </>
                )}

                <div className="profile-row" style={{ marginTop: 12 }}>
                  <span>Направления:</span>
                  <div className="lab-tags">{lab.research_areas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                </div>
                <div className="profile-row"><span>Мест всего:</span> <span>{lab.open_spots}</span></div>
                {lab.papers && <div className="profile-row"><span>Публикации:</span> <span>{lab.papers}</span></div>}
                
                <button className="btn-apply" style={{ marginTop: 16, width: "max-content" }} onClick={() => setShowLabForm(true)}>✏️ Редактировать лабораторию</button>
              </div>
            ) : (
              <div className="empty-state">
                <Info size={32} />
                У вас ещё нет лаборатории. Создайте её, чтобы начать привлекать студентов.
                <button className="btn-apply" style={{ marginTop: 16 }} onClick={() => setShowLabForm(true)}>+ Создать лабораторию</button>
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
                  <div className="lab-card" key={ch.id} style={{ borderLeft: "4px solid var(--status-pending)" }}>
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
                    <button className="btn-apply" onClick={async () => {
                      const coopData = {
                        student_id: ch.company_id,
                        student_name: ch.company_name,
                        student_email: "",
                        lab_id: ch.id,
                        lab_name: `R&D: ${ch.title}`,
                        professor_id: user.id,
                        motivation: `Наша лаборатория заинтересована в решении вашего R&D запроса: "${ch.title}". Готовы обсудить сотрудничество.`,
                        status: "accepted", // Accepted immediately so chat is active
                        timeline_data: [{ status: "accepted", date: new Date().toLocaleDateString("ru"), note: "Сотрудничество по R&D начато." }]
                      };
                      await supabase.from("applications").insert(coopData);
                      await fetchApps(user.id);
                      alert("Диалог начат! Перейдите во вкладку 'Чат' для связи.");
                      setActiveTab("chat");
                    }}>
                      Связаться / Предложить решение
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ПРОФИЛЬ ── */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Мой профиль</h1>
            <p className="dash-subtitle">Управление личной информацией исследователя</p>
            <div className="profile-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 24, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className="profile-avatar professor-avatar" style={userData?.avatar_url ? { padding: 0, overflow: "hidden", width: 80, height: 80 } : { width: 80, height: 80, fontSize: 32 }}>
                  {userData?.avatar_url
                    ? <img src={userData.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials}
                </div>
                <div>
                  <button className="btn-secondary" onClick={() => fileInputRef.current.click()} disabled={avatarUploading}>
                    <Upload size={14} style={{ marginRight: 6 }} /> {avatarUploading ? "Загрузка..." : "Сменить фото"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
                </div>
              </div>

              {editingProfile ? (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    ["name", "Имя", "Ваше имя"],
                    ["university", "Университет", "Назарбаев Университет"],
                    ["department", "Кафедра", "School of Engineering"],
                    ["position", "Должность", "Professor"],
                    ["website", "Сайт", "https://yoursite.com"],
                    ["googleScholar", "Google Scholar", "ссылка"],
                    ["linkedin", "LinkedIn", "ссылка"],
                    ["researchgate", "ResearchGate", "ссылка"],
                  ].map(([field, label, ph]) => (
                    <div className="profile-edit-row" key={field} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: "bold" }}>{label}</label>
                      <input style={{ padding: "8px 12px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "#fff", borderRadius: 8 }} value={profileForm[field]} onChange={e => setProfileForm(p => ({ ...p, [field]: e.target.value }))} placeholder={ph} />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button className="btn-apply" onClick={handleSaveProfile}>Сохранить</button>
                    <button className="btn-secondary" onClick={() => setEditingProfile(false)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    ["Имя", userData?.name],
                    ["Email", user?.email],
                    ["Должность", userData?.position],
                    ["Кафедра", userData?.department],
                    ["Университет", userData?.university],
                    ["Сайт", userData?.website],
                    ["Google Scholar", userData?.googleScholar],
                    ["LinkedIn", userData?.linkedin],
                    ["ResearchGate", userData?.researchgate],
                  ].map(([label, val]) => val ? (
                    <div className="profile-row" key={label}><span>{label}:</span> <span>{val}</span></div>
                  ) : null)}
                  <button className="btn-apply" style={{ marginTop: 16, width: "max-content" }} onClick={() => setEditingProfile(true)}>
                    ✏️ Редактировать профиль
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ПОДДЕРЖКА ── */}
        {activeTab === "support" && (
          <div className="dash-content">
            <h1>Поддержка и отзывы</h1>
            <p className="dash-subtitle">Напишите нам — мы ответим вам на почту в ближайшее время</p>
            {feedbackSent
              ? <div className="empty-state" style={{ borderColor: "var(--status-accepted)", color: "var(--status-accepted)" }}><CheckCircle size={32} />✓ Спасибо за отзыв! Мы всё прочитаем.</div>
              : <div style={{ background: "var(--dash-card)", border: "1px solid var(--border-color)", borderRadius: 20, padding: 32, maxWidth: 580, boxShadow: "0 4px 20px var(--shadow)" }}>
                  <textarea
                    style={{ width: "100%", padding: "14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 12, fontSize: 14.5, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                    rows={6}
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Опишите проблему или предложение..."
                  />
                  <button className="btn-apply" style={{ marginTop: 16 }} onClick={handleSendFeedback}>Отправить</button>
                </div>
            }
          </div>
        )}
      </main>

      {/* ── IMAGE LIGHTBOX MODAL ── */}
      {activeImageUrl && (
        <div className="lightbox-overlay" onClick={() => setActiveImageUrl(null)}>
          <button className="lightbox-close" onClick={() => setActiveImageUrl(null)}>×</button>
          <img src={activeImageUrl} alt="Fullscreen Attachment" className="lightbox-img" onClick={e => e.stopPropagation()} />
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

      {/* ── МОДАЛКА СОЗДАНИЯ ЛАБОРАТОРИИ ── */}
      {showLabForm && (
        <div className="modal-overlay" onClick={() => setShowLabForm(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h2>{lab ? "Редактировать лабораторию" : "Создать лабораторию"}</h2>
            {[
              ["name", "Название лаборатории", "AI & Robotics Lab"],
              ["description", "Описание исследований", "Чем занимается лаборатория..."],
              ["requirements", "Требования к студентам", "Знание Python, опыт в ML..."],
              ["responsibilities", "Обязанности студента", "Участие в экспериментах, написание кода..."],
              ["benefits", "Что получит студент", "Опыт, публикация, рекомендации..."],
              ["papers", "Ссылки на публикации", "https://doi.org/..."],
            ].map(([field, label, hint]) => (
              <div key={field} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>{label}</label>
                <textarea
                  rows={2}
                  style={{ width: "100%", padding: "10px 14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 10, fontFamily: "inherit", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                  value={labForm[field]}
                  onChange={e => setLabForm({ ...labForm, [field]: e.target.value })}
                  placeholder={hint}
                />
              </div>
            ))}

            <hr style={{ borderColor: "var(--border-color)", margin: "10px 0" }} />
            <h3 style={{ margin: 0, color: "var(--primary-light)" }}>Прозрачность</h3>
            
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={labForm.noExperienceOk} onChange={e => setLabForm({ ...labForm, noExperienceOk: e.target.checked })} />
              <label style={{ fontSize: 13 }}>Готовы брать студентов без опыта?</label>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={labForm.internationalOk} onChange={e => setLabForm({ ...labForm, internationalOk: e.target.checked })} />
              <label style={{ fontSize: 13 }}>Подходит для иностранных студентов?</label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Требуемый уровень подготовки</label>
              <select
                style={{ padding: "10px 14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 10, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" }}
                value={labForm.prepLevel}
                onChange={e => setLabForm({ ...labForm, prepLevel: e.target.value })}
              >
                <option value="beginner">Начальный (Beginner)</option>
                <option value="intermediate">Средний (Intermediate)</option>
                <option value="advanced">Продвинутый (Advanced)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Сложности и вызовы (Честно опишите трудности/нагрузку)</label>
              <textarea
                rows={2}
                style={{ width: "100%", padding: "10px 14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 10, fontFamily: "inherit", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                value={labForm.challenges}
                onChange={e => setLabForm({ ...labForm, challenges: e.target.value })}
                placeholder="Например: Высокая математическая сложность, требуется 15 часов в неделю..."
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Инструкция: как подать заявку</label>
              <textarea
                rows={2}
                style={{ width: "100%", padding: "10px 14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 10, fontFamily: "inherit", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                value={labForm.howToApply}
                onChange={e => setLabForm({ ...labForm, howToApply: e.target.value })}
                placeholder="Например: 1. Отправьте резюме. 2. Решите тестовое задание по ссылке..."
              />
            </div>

            <hr style={{ borderColor: "var(--border-color)", margin: "10px 0" }} />
            <h3 style={{ margin: 0, color: "var(--status-pending)" }}>Коммерциализация</h3>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={labForm.isCommercial} onChange={e => setLabForm({ ...labForm, isCommercial: e.target.checked })} />
              <label style={{ fontSize: 13, fontWeight: "bold" }}>Проект имеет коммерческую ценность / прикладной характер</label>
            </div>

            {labForm.isCommercial && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 12, borderLeft: "2px solid var(--status-pending)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12 }}>Необходимый объем финансирования ($)</label>
                  <input
                    type="number"
                    style={{ padding: "8px 12px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 8, fontSize: 13 }}
                    value={labForm.fundingNeeded}
                    onChange={e => setLabForm({ ...labForm, fundingNeeded: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12 }}>Статус прототипа</label>
                  <input
                    type="text"
                    style={{ padding: "8px 12px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 8, fontSize: 13 }}
                    value={labForm.prototypeStatus}
                    onChange={e => setLabForm({ ...labForm, prototypeStatus: e.target.value })}
                    placeholder="MVP / Альфа / Чертежи"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12 }}>Рыночный потенциал</label>
                  <textarea
                    rows={2}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}
                    value={labForm.marketPotential}
                    onChange={e => setLabForm({ ...labForm, marketPotential: e.target.value })}
                    placeholder="Какую проблему на рынке решает?"
                  />
                </div>
              </div>
            )}

            <hr style={{ borderColor: "var(--border-color)", margin: "10px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Направления исследований</label>
              <div className="lab-tags" style={{ gap: 8 }}>
                {RESEARCH_AREAS.map(area => (
                  <span
                    key={area}
                    className={`tag ${labForm.researchAreas.includes(area) ? "tag-match" : ""}`}
                    style={{ cursor: "pointer", padding: "6px 14px" }}
                    onClick={() => setLabForm(prev => ({
                      ...prev,
                      researchAreas: prev.researchAreas.includes(area)
                        ? prev.researchAreas.filter(a => a !== area)
                        : [...prev.researchAreas, area]
                    }))}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Количество вакантных мест</label>
              <input
                type="number"
                placeholder="Количество мест"
                style={{ padding: "10px 14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 10, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" }}
                value={labForm.openSpots}
                onChange={e => setLabForm({ ...labForm, openSpots: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLabForm(false)}>Отмена</button>
              <button className="btn-apply" onClick={handleCreateLab}>{lab ? "Сохранить" : "Создать"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}