import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Paperclip, Mic, Download,
  Image as ImageIcon, LogOut, CheckCircle, Clock, FileText,
  Info, Star, Upload, Palette, Video, ShieldAlert
} from "lucide-react";
import "./Dashboard.css";
import { useTranslation } from "../context/TranslationContext";
import Header from "../components/Header.jsx";
import InterviewBar from "../components/InterviewBar.jsx";

// ── CUSTOM AUDIO PLAYER COMPONENT ──
function AudioPlayer({ src, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSliderChange = (e) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changeSpeed = () => {
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="audio-message-player">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <button className="audio-play-btn" onClick={togglePlay}>
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="audio-wave-container">
        <input
          type="range"
          min="0"
          max={audioRef.current?.duration || duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          className="audio-progress-bar"
        />
        <div className="audio-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || audioRef.current?.duration)}</span>
        </div>
      </div>
      <button className="audio-speed-btn" onClick={changeSpeed}>
        {playbackRate}x
      </button>
    </div>
  );
}

export default function DashboardStudent() {
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
  const [labs, setLabs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [chats, setChats] = useState({});
  const [activeTab, setActiveTab] = useState("discover");
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState(null);
  const [motivation, setMotivation] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // AI motivation draft generator state
  const [aiGenerating, setAiGenerating] = useState(false);
  // Video room joining state
  const [joiningVideoRoom, setJoiningVideoRoom] = useState(null);
  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterNoExp, setFilterNoExp] = useState(false);
  const [filterIntl, setFilterIntl] = useState(false);
  const [filterPrepLevel, setFilterPrepLevel] = useState("");
  const [filterCommercial, setFilterCommercial] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: "", university: "", degree: "", year: "",
    bio: "", github: "", linkedin: "", telegram: "",
    skills: "", languages: "", achievements: "", interests: []
  });

  // Theme State
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("inspiro-theme") || "cosmic-dark"
  );

  // Lightbox States
  const [activeImageUrl, setActiveImageUrl] = useState(null);

  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const imageAttachInputRef = useRef(null);
  const fileAttachInputRef = useRef(null);
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

  // Fetch initial profile & labs
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
          degree: profile.degree || "",
          year: profile.year || "",
          bio: profile.bio || "",
          github: profile.github || "",
          linkedin: profile.linkedin || "",
          telegram: profile.telegram || "",
          skills: profile.skills || "",
          languages: profile.languages || "",
          achievements: profile.achievements || "",
          interests: profile.interests || [],
        });
      }

      // 2. Fetch All Labs
      const { data: labsData } = await supabase.from("labs").select("*");
      setLabs(labsData || []);

      // 3. Fetch Applications
      const { data: appsData } = await supabase
        .from("applications")
        .select("*")
        .eq("student_id", currentUser.id);
      setMyApplications(appsData || []);

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

  // Theme Changer
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

  const handleApply = async (lab) => {
    const warnings = getWarnings();
    if (warnings.some(w => w.level === "ban")) {
      alert("Вы заблокированы администратором и не можете подавать заявки.");
      return;
    }
    if (!motivation.trim()) return alert("Напиши мотивационное письмо");
    setCvUploading(true);
    let cvUrl = null;
    if (cvFile) {
      try {
        const fileName = `${user.id}_${lab.id}_${Date.now()}_${cvFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("cvs")
          .upload(fileName, cvFile);

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from("cvs")
          .getPublicUrl(fileName);
        cvUrl = publicUrl;
      } catch (err) {
        alert("Ошибка загрузки CV: " + err.message);
        setCvUploading(false);
        return;
      }
    }

    const { error: appErr } = await supabase.from("applications").insert({
      student_id: user.id,
      student_name: userData?.name || user.email,
      student_email: user.email,
      lab_id: lab.id,
      lab_name: lab.name,
      professor_id: lab.professor_id,
      motivation,
      cv_url: cvUrl,
      status: "pending",
      timeline_data: [
        { status: "pending", date: new Date().toLocaleDateString("ru"), note: "Заявка подана. Ожидает рассмотрения." }
      ]
    });

    if (appErr) {
      alert("Ошибка подачи заявки: " + appErr.message);
    } else {
      setApplyingTo(null);
      setMotivation("");
      setCvFile(null);
      
      const { data: appsData } = await supabase
        .from("applications")
        .select("*")
        .eq("student_id", user.id);
      setMyApplications(appsData || []);
    }
    setCvUploading(false);
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const textToSend = chatMessage;
    setChatMessage(""); // Clear input early for better UX

    await supabase.from("messages").insert({
      application_id: appId,
      text: textToSend,
      sender_id: user.id,
      sender_name: userData?.name || "Студент",
      sender_role: "student",
    });
  };

  // Upload Files / Photos to Storage and Add Message to Supabase
  const handleAttachUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      return alert("Файл слишком большой. Максимальный лимит: 10МБ.");
    }

    try {
      const fileName = `${activeChatId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("chats")
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("chats")
        .getPublicUrl(fileName);

      await supabase.from("messages").insert({
        application_id: activeChatId,
        text: type === "image" ? "" : file.name,
        file_url: publicUrl,
        file_name: file.name,
        file_type: type,
        sender_id: user.id,
        sender_name: userData?.name || "Студент",
        sender_role: "student",
      });
    } catch (err) {
      alert("Не удалось отправить файл: " + err.message);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    await supabase.from("feedback").insert({
      text: feedbackText,
      user_id: user.id,
      user_role: "student",
      user_name: userData?.name || "",
    });
    setFeedbackText("");
    setFeedbackSent(true);
  };

  const handleJumpToChat = (labId) => {
    const matchedApp = myApplications.find(
      a => a.lab_id === labId && (a.status === "accepted" || a.status === "interview")
    );
    if (matchedApp) {
      setActiveTab("chat");
      setActiveChatId(matchedApp.id);
    }
  };

  const statusLabel = s => ({ pending: "На рассмотрении", accepted: "Принят ✓", rejected: "Отклонено", interview: "🎯 Интервью" }[s] || s);
  const statusClass = s => ({ pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected", interview: "status-interview" }[s] || "");

  const hiddenLabIds = JSON.parse(localStorage.getItem("inspiro-hidden-labs") || "[]");
  const verifiedLabIds = JSON.parse(localStorage.getItem("inspiro-verified-labs") || "[]");
  const myInterests = userData?.interests || [];
  const recommendedLabs = labs.filter(l => !hiddenLabIds.includes(l.id) && l.research_areas?.some(a => myInterests.includes(a)));
  const appliedLabIds = myApplications.map(a => a.lab_id);
  const chatApps = myApplications.filter(a => a.status === "accepted" || a.status === "interview");
  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "S";

  // Filter Labs Logic
  const filteredLabs = labs.filter(lab => {
    if (hiddenLabIds.includes(lab.id)) return false;
    const matchesSearch = lab.name?.toLowerCase().includes(searchQuery.toLowerCase()) || lab.description?.toLowerCase().includes(searchQuery.toLowerCase()) || lab.professor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = !filterArea || lab.research_areas?.includes(filterArea);
    const matchesNoExp = !filterNoExp || lab.no_experience_ok === true;
    const matchesIntl = !filterIntl || lab.international_ok === true;
    const matchesPrep = !filterPrepLevel || lab.prep_level === filterPrepLevel;
    const matchesComm = !filterCommercial || lab.is_commercial === true;
    return matchesSearch && matchesArea && matchesNoExp && matchesIntl && matchesPrep && matchesComm;
  });

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
          <div className="dash-avatar" style={userData?.avatar_url ? { padding: 0, overflow: "hidden" } : {}}>
            {userData?.avatar_url
              ? <img src={userData.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials}
          </div>
          <div>
            <div className="dash-username">{userData?.name || "Студент"}</div>
            <div className="dash-role">Студент</div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="theme-selector-container">
          <label className="theme-label"><Palette size={12} style={{ marginRight: 4 }} /> Тема</label>
          <select value={activeTheme} onChange={(e) => handleThemeChange(e.target.value)} className="theme-dropdown">
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <nav className="dash-nav">
          {[
            ["discover", "🔍 " + t("nav.discover"), filteredLabs.length],
            ["recommended", "⭐ " + t("nav.discover") + " (Rec)", recommendedLabs.length],
            ["applications", "📋 " + t("nav.my_applications"), myApplications.length],
            ["interviews", "🎯 " + t("nav.interviews"), myApplications.filter(a => a.status === "interview").length],
            ["chat", "💬 " + t("nav.chats"), chatApps.length],
            ["profile", "👤 " + t("common.profile"), 0],
            ["support", "🛠 " + t("nav.feedback"), 0],
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

        {/* ── ИНТЕРВЬЮ ── */}
        {activeTab === "interviews" && (
          <div className="dash-content">
            <h1>{t("nav.interviews")}</h1>
            <p className="dash-subtitle">Собеседования и расписание встреч</p>

            {myApplications.filter(a => a.status === "interview").length === 0 ? (
              <div className="empty-state">
                <Video size={32} />
                У вас нет приглашений на интервью.
              </div>
            ) : (
              <div className="labs-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
                {myApplications.filter(a => a.status === "interview").map(app => (
                  <div className="lab-card" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px 0" }}>{app.lab_name}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--primary-light)" }}>
                        Профессор: {labs.find(l => l.id === app.lab_id)?.professor_name || "Научный руководитель"}
                      </p>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                      <InterviewBar 
                        application={app} 
                        currentUserRole="student" 
                        onUpdate={async () => {
                          const { data: appsData } = await supabase
                            .from("applications")
                            .select("*")
                            .eq("student_id", user.id);
                          setMyApplications(appsData || []);
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ЛАБОРАТОРИИ ── */}
        {activeTab === "discover" && (
          <div className="dash-content">
            <h1>Все лаборатории</h1>
            <p className="dash-subtitle">Найдите научный проект для старта карьеры</p>
            
            {/* Filters Bar */}
            <div className="filters-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "var(--dash-card)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <input
                type="text"
                placeholder="Поиск по названию или профессору..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", flex: 1, minWidth: "200px" }}
              />
              <select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
              >
                <option value="">Все направления</option>
                {RESEARCH_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={filterPrepLevel}
                onChange={e => setFilterPrepLevel(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
              >
                <option value="">Любая подготовка</option>
                <option value="beginner">Начальный уровень</option>
                <option value="intermediate">Средний уровень</option>
                <option value="advanced">Продвинутый уровень</option>
              </select>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={filterNoExp} onChange={e => setFilterNoExp(e.target.checked)} />
                  Без опыта 👍
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={filterIntl} onChange={e => setFilterIntl(e.target.checked)} />
                  Ин. студенты 🌍
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={filterCommercial} onChange={e => setFilterCommercial(e.target.checked)} />
                  Коммерческие 💰
                </label>
              </div>
            </div>

            {filteredLabs.length === 0 && <div className="empty-state"><Info size={32} />Совпадений не найдено. Попробуйте сбросить фильтры.</div>}
            
            <div className="labs-grid">
              {filteredLabs.map(lab => {
                const chatApp = myApplications.find(a => a.lab_id === lab.id && (a.status === "accepted" || a.status === "interview"));
                return (
                  <div className="lab-card" key={lab.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: lab.is_commercial ? "4px solid var(--status-pending)" : "1px solid var(--border-color)" }}>
                    <div>
                      <div className="lab-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {lab.name}
                          {verifiedLabIds.includes(lab.id) && (
                            <CheckCircle size={16} style={{ color: "var(--status-accepted)", fill: "rgba(16,185,129,0.1)", flexShrink: 0 }} title="Верифицировано" />
                          )}
                        </h3>
                        {lab.is_commercial && <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)", fontSize: 11 }}>💰 Прикладной/R&D</span>}
                      </div>
                      
                      <div
                        className="lab-professor-row"
                        onClick={() => chatApp && handleJumpToChat(lab.id)}
                        title={chatApp ? "Нажмите, чтобы открыть чат с профессором" : ""}
                        style={{ margin: "8px 0" }}
                      >
                        <div className="lab-prof-avatar">👨‍🔬</div>
                        <p className="lab-professor">
                          👨‍🔬 {lab.professor_name} {lab.is_independent ? "(Независимый)" : ""}
                          {chatApp && <span style={{ fontSize: 11, marginLeft: 6, textDecoration: "underline" }}>(Чат 💬)</span>}
                        </p>
                      </div>
                      
                      <p className="lab-desc">{lab.description}</p>
                      
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "8px 0" }}>
                        {lab.no_experience_ok && <span className="tag" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", fontSize: 11 }}>Без опыта 👍</span>}
                        {lab.international_ok && <span className="tag" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", fontSize: 11 }}>Ин. студенты 🌍</span>}
                        <span className="tag" style={{ background: "rgba(129,140,248,0.12)", color: "var(--primary-light)", fontSize: 11 }}>
                          Подготовка: {lab.prep_level === "beginner" ? "Начальный" : lab.prep_level === "intermediate" ? "Средний" : "Продвинутый"}
                        </span>
                      </div>
                      
                      {lab.requirements && <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0" }}>📋 Требования: {lab.requirements.slice(0, 80)}...</p>}
                    </div>

                    <div>
                      <div className="lab-tags">{lab.research_areas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                      
                      <div className="lab-footer">
                        <span className="lab-spots">Мест: {lab.open_spots || "?"}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {appliedLabIds.includes(lab.id) ? (
                            <>
                              <span className={`status-badge ${statusClass(myApplications.find(a => a.lab_id === lab.id)?.status)}`}>
                                {statusLabel(myApplications.find(a => a.lab_id === lab.id)?.status)}
                              </span>
                              {chatApp && (
                                <button className="btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleJumpToChat(lab.id)}>
                                  <MessageSquare size={13} />
                                </button>
                              )}
                            </>
                          ) : (
                            <button className="btn-apply" onClick={() => setApplyingTo(lab)}>Подробнее & Подать</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── РЕКОМЕНДАЦИИ ── */}
        {activeTab === "recommended" && (
          <div className="dash-content">
            <h1>Рекомендовано для вас</h1>
            <p className="dash-subtitle">На основе интересов: {myInterests.join(", ") || "не указаны"}</p>
            {recommendedLabs.length === 0
              ? <div className="empty-state"><Star size={32} />Нет совпадений. Обновите интересы в профиле.</div>
              : <div className="labs-grid">
                  {recommendedLabs.map(lab => {
                    const chatApp = myApplications.find(a => a.lab_id === lab.id && (a.status === "accepted" || a.status === "interview"));
                    return (
                      <div className="lab-card highlight" key={lab.id}>
                        <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {lab.name}
                          {verifiedLabIds.includes(lab.id) && (
                            <CheckCircle size={16} style={{ color: "var(--status-accepted)", fill: "rgba(16,185,129,0.1)", flexShrink: 0 }} title="Верифицировано" />
                          )}
                        </h3>
                        <div
                          className="lab-professor-row"
                          onClick={() => chatApp && handleJumpToChat(lab.id)}
                          title={chatApp ? "Открыть чат" : ""}
                        >
                          <div className="lab-prof-avatar">👨‍🔬</div>
                          <p className="lab-professor">👨‍🔬 {lab.professor_name}</p>
                        </div>
                        <p className="lab-desc">{lab.description}</p>
                        <div className="lab-tags">
                          {lab.research_areas?.map(a => (
                            <span key={a} className={`tag ${myInterests.includes(a) ? "tag-match" : ""}`}>{a}</span>
                          ))}
                        </div>
                        <div className="lab-footer">
                          <span className="lab-spots">Мест: {lab.open_spots || "?"}</span>
                          {appliedLabIds.includes(lab.id)
                            ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span className={`status-badge ${statusClass(myApplications.find(a => a.lab_id === lab.id)?.status)}`}>
                                  {statusLabel(myApplications.find(a => a.lab_id === lab.id)?.status)}
                                </span>
                                {chatApp && (
                                  <button className="btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleJumpToChat(lab.id)}>
                                    <MessageSquare size={13} />
                                  </button>
                                )}
                              </div>
                            )
                            : <button className="btn-apply" onClick={() => setApplyingTo(lab)}>Подать заявку</button>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ── МОИ ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Мои заявки</h1>
            <p className="dash-subtitle">Подробная история и таймлайны рассмотрения заявок с датами</p>
            {myApplications.length === 0
              ? <div className="empty-state"><FileText size={32} />Вы ещё не подавали заявки.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {myApplications.map(app => (
                    <div className="lab-card" key={app.id} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h3 style={{ margin: 0 }}>{app.lab_name}</h3>
                          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>Подано: {new Date(app.created_at).toLocaleDateString("ru")}</p>
                        </div>
                        <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
                      </div>

                      {/* Timeline component */}
                      <div className="timeline-container" style={{ margin: "10px 0", borderLeft: "2px solid var(--border-color)", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Always show step 1: Submission */}
                        <div className="timeline-step" style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: -21, top: 4, width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />
                          <p style={{ margin: 0, fontSize: 13, fontWeight: "bold" }}>Заявка отправлена — {new Date(app.created_at).toLocaleDateString("ru")}</p>
                          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>Вы написали мотивационное письмо и предложили соавторство.</p>
                        </div>

                        {/* Show step 2: Interview or accepted/rejected from timeline_data */}
                        {app.timeline_data?.slice(1).map((step, idx) => (
                          <div className="timeline-step" key={idx} style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: -21, top: 4, width: 8, height: 8, borderRadius: "50%", background: step.status === "rejected" ? "var(--status-rejected)" : step.status === "accepted" ? "var(--status-accepted)" : "var(--status-interview)" }} />
                            <p style={{ margin: 0, fontSize: 13, fontWeight: "bold" }}>
                              {step.status === "interview" ? "🎯 Интервью назначено" : step.status === "accepted" ? "✓ Принят в проект" : "✗ Заявка отклонена"} — {step.date}
                            </p>
                            <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>{step.note}</p>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons (Chat & Daily Video) */}
                      <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                        {(app.status === "accepted" || app.status === "interview") && (
                          <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { setActiveTab("chat"); setActiveChatId(app.id); }}>
                            <MessageSquare size={13} style={{ marginRight: 4 }} /> Чат обсуждения
                          </button>
                        )}
                        {app.video_room_url && (
                          <button className="btn-apply" style={{ padding: "6px 12px", fontSize: 12, background: "var(--status-interview-bg)", color: "var(--status-interview)", border: "1px solid var(--status-interview)" }} onClick={() => setJoiningVideoRoom(app.video_room_url)}>
                            🎥 Войти в видео-интервью
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── ЧАТ ── */}
        {activeTab === "chat" && (
          <div className="dash-content" style={{ height: "calc(100vh - 120px)" }}>
            <h1>Чат обсуждения</h1>
            <div className="chat-window-layout" style={{ display: "flex", height: "90%", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", background: "var(--dash-sidebar)" }}>
              {/* Chat sidebar */}
              <div className="chat-list-sidebar" style={{ width: 250, borderRight: "1px solid var(--border-color)" }}>
                {chatApps.length === 0 ? (
                  <p style={{ padding: 15, fontSize: 12, color: "var(--text-muted)" }}>Нет активных чатов. Чаты открываются при принятии заявок.</p>
                ) : (
                  chatApps.map(app => (
                    <div key={app.id} className={`chat-item-node ${activeChatId === app.id ? "active-node" : ""}`} onClick={() => setActiveChatId(app.id)} style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid var(--border-color)", background: activeChatId === app.id ? "var(--primary-glow)" : "transparent" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{app.lab_name}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>{app.student_name === userData?.name ? "Владелец" : app.student_name}</p>
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
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Диалог с руководителем</p>
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

        {/* ── ПРОФИЛЬ ── */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Мой профиль</h1>
            <p className="dash-subtitle">Управление вашей личной информацией и интересами</p>
            <div className="profile-card" style={{ padding: 24, background: "var(--dash-card)", border: "1px solid var(--border-color)", borderRadius: 16 }}>
              {editingProfile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
                  <div className="field-group">
                    <label>Полное имя</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label>Университет</label>
                    <input type="text" value={profileForm.university} onChange={e => setProfileForm({ ...profileForm, university: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label>О себе / Опыт</label>
                    <textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} />
                  </div>
                  <div className="field-group">
                    <label>Степень</label>
                    <select value={profileForm.degree} onChange={e => setProfileForm({ ...profileForm, degree: e.target.value })}>
                      <option value="bachelor">Бакалавриат</option>
                      <option value="master">Магистратура</option>
                      <option value="phd">PhD</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Курс</label>
                    <input type="number" value={profileForm.year} onChange={e => setProfileForm({ ...profileForm, year: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label>GitHub</label>
                    <input type="text" value={profileForm.github} onChange={e => setProfileForm({ ...profileForm, github: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label>LinkedIn</label>
                    <input type="text" value={profileForm.linkedin} onChange={e => setProfileForm({ ...profileForm, linkedin: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label>Telegram</label>
                    <input type="text" value={profileForm.telegram} onChange={e => setProfileForm({ ...profileForm, telegram: e.target.value })} />
                  </div>
                  <div className="field-group">
                    <label>Навыки</label>
                    <input type="text" value={profileForm.skills} onChange={e => setProfileForm({ ...profileForm, skills: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-apply" onClick={handleSaveProfile}>Сохранить</button>
                    <button className="btn-secondary" onClick={() => setEditingProfile(false)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2>{userData?.name || "Имя не заполнено"}</h2>
                  <p style={{ color: "var(--primary-light)" }}>Университет: {userData?.university || "не указан"}</p>
                  <p>{userData?.bio || "О себе не заполнено."}</p>
                  <hr style={{ borderColor: "var(--border-color)", margin: "15px 0" }} />
                  <p><strong>Степень:</strong> {userData?.degree === "bachelor" ? "Бакалавриат" : userData?.degree === "master" ? "Магистратура" : userData?.degree || "не указана"}</p>
                  <p><strong>Курс:</strong> {userData?.year || "не указан"}</p>
                  <p><strong>GitHub:</strong> {userData?.github ? <a href={userData.github} target="_blank" rel="noreferrer">{userData.github}</a> : "не привязан"}</p>
                  <p><strong>LinkedIn:</strong> {userData?.linkedin ? <a href={userData.linkedin} target="_blank" rel="noreferrer">{userData.linkedin}</a> : "не привязан"}</p>
                  <p><strong>Навыки:</strong> {userData?.skills || "не указаны"}</p>
                  <button className="btn-apply" style={{ marginTop: 15 }} onClick={() => setEditingProfile(true)}>Редактировать профиль</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── БАЗА ЗНАНИЙ ── */}
        {activeTab === "knowledge-hub" && (
          <div className="dash-content">
            <h1>📚 База Знаний (Knowledge Hub)</h1>
            <p className="dash-subtitle">Руководство для студентов без опыта о том, как начать научную карьеру</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--primary-light)" }}>🔬 С чего начать, если нет опыта?</h3>
                <p style={{ fontSize: 14 }}>
                  Профессора не ожидают от студентов младших курсов готовых научных открытий. Главное — это ваши <strong>интересы</strong> и <strong>готовность учиться</strong>.
                </p>
                <ul style={{ fontSize: 14, paddingLeft: 20, margin: "10px 0" }}>
                  <li>Изучите фильтр <strong>«Без опыта»</strong>, чтобы найти лаборатории, открытые к новичкам.</li>
                  <li>Посмотрите требования: часто достаточно базового понимания программирования (Python) или школьной программы химии/физики.</li>
                  <li>Будьте готовы уделить проекту от 8 до 15 часов в неделю.</li>
                </ul>
              </div>

              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--status-pending)" }}>✍️ Как написать сильное мотивационное письмо?</h3>
                <p style={{ fontSize: 14 }}>
                  Мотивационное письмо — ваш главный шанс выделиться. Не пишите общие фразы. Используйте этот шаблон:
                </p>
                <div style={{ background: "var(--input-bg)", padding: 12, borderRadius: 8, margin: "10px 0", fontSize: 13, borderLeft: "3px solid var(--status-pending)" }}>
                  <p style={{ margin: "2px 0" }}>1. <strong>Приветствие и цель:</strong> «Здравствуйте! Я студент 2 курса КБТУ, меня очень интересует ваша работа в области ИИ в медицине...»</p>
                  <p style={{ margin: "2px 0" }}>2. <strong>Почему эта тема:</strong> «Я прочитал абстракт вашей последней статьи о сегментации снимков МРТ. Хотел бы помочь вашей команде в оптимизации этой модели...»</p>
                  <p style={{ margin: "2px 0" }}>3. <strong>Ваши навыки:</strong> «Я прошел курс Python для Data Science, умею работать с Git и библиотекой PyTorch. Готов выполнять рутинные задачи и учиться...»</p>
                </div>
              </div>

              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--status-accepted)" }}>🌍 Возможности для иностранных студентов</h3>
                <p style={{ fontSize: 14 }}>
                  Многие лаборатории ведут исследования полностью на английском языке и открыты для иностранных студентов. Используйте фильтр <strong>«Иностранные студенты»</strong>, чтобы найти проекты, где рабочий язык — английский, и нет жестких требований к гражданству.
                </p>
              </div>

              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--status-interview)" }}>💡 Что такое прикладные (коммерческие) проекты?</h3>
                <p style={{ fontSize: 14 }}>
                  Некоторые работы направлены на создание реальных стартапов и продуктов. Если проект отмечен тегом <strong>💰 Коммерческий</strong>, это значит, что команда ищет не просто академический интерес, а планирует привлечь инвесторов, создать MVP или выйти на рынок. Работа в таких проектах даст вам неоценимый продуктовый и инженерный опыт.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ПОДДЕРЖКА ── */}
        {activeTab === "support" && (
          <div className="dash-content">
            <h1>Поддержка и отзывы</h1>
            <p className="dash-subtitle">Напишите нам — мы рады любым отзывам и предложениям</p>
            {feedbackSent
              ? <div className="empty-state" style={{ borderColor: "var(--status-accepted)", color: "var(--status-accepted)" }}><CheckCircle size={32} />✓ Спасибо за отзыв!</div>
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

      {/* ── МОДАЛКА ЗАЯВКИ И ПОДРОБНОСТЕЙ (ПОДРОБНЫЙ TRANSPARENCY VIEW) ── */}
      {applyingTo && (
        <div className="modal-overlay" onClick={() => setApplyingTo(null)}>
          <div className="modal" style={{ maxWidth: 800, width: "90%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{applyingTo.name}</h2>
              <button className="btn-secondary" onClick={() => setApplyingTo(null)} style={{ padding: "4px 8px", fontSize: 16 }}>×</button>
            </div>
            
            <p className="lab-professor" style={{ color: "var(--primary-light)", marginTop: 8 }}>
              👨‍🔬 Руководитель: {applyingTo.professor_name} {applyingTo.is_independent ? "(Независимый проект)" : ""}
            </p>
            
            <div className="unified-modal-content" style={{ display: "flex", gap: "24px", marginTop: "15px", flexWrap: "wrap" }}>
              <div className="unified-modal-details" style={{ flex: 1.2, minWidth: "280px" }}>
                <h4 style={{ margin: "0 0 6px 0", color: "var(--primary-light)" }}>🔬 Описание проекта:</h4>
                <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{applyingTo.description}</p>
                
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "14px 0" }}>
                  {applyingTo.no_experience_ok ? (
                    <span className="tag" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 600 }}>Без опыта 👍</span>
                  ) : (
                    <span className="tag" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Опыт обязателен</span>
                  )}
                  {applyingTo.international_ok && <span className="tag" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontWeight: 600 }}>Иностранным студентам 🌍</span>}
                  <span className="tag" style={{ background: "rgba(129,140,248,0.15)", color: "var(--primary-light)" }}>
                    Подготовка: {applyingTo.prep_level === "beginner" ? "Начальный" : applyingTo.prep_level === "intermediate" ? "Средний" : "Продвинутый"}
                  </span>
                  {applyingTo.is_commercial && <span className="tag" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>💰 Коммерческий</span>}
                </div>
                
                <h4 style={{ margin: "14px 0 4px 0", color: "var(--primary-light)" }}>📋 Требования и квалификации:</h4>
                <p style={{ fontSize: 13, background: "var(--input-bg)", padding: 10, borderRadius: 8 }}>{applyingTo.requirements || "Специфических требований нет"}</p>
                
                <h4 style={{ margin: "14px 0 4px 0", color: "var(--status-rejected)" }}>⚠️ Вызовы и сложности (Честный обзор):</h4>
                <p style={{ fontSize: 13, background: "rgba(239,68,68,0.05)", padding: 10, borderRadius: 8, borderLeft: "3px solid var(--status-rejected)" }}>
                  {applyingTo.challenges || "Типичная нагрузка исследовательской работы. Особых вызовов не указано."}
                </p>

                <h4 style={{ margin: "14px 0 4px 0", color: "var(--status-accepted)" }}>📝 Инструкции по подаче:</h4>
                <p style={{ fontSize: 13, background: "rgba(16,185,129,0.05)", padding: 10, borderRadius: 8, borderLeft: "3px solid var(--status-accepted)" }}>
                  {applyingTo.how_to_apply || "Напишите краткое мотивационное письмо справа и прикрепите резюме."}
                </p>

                {applyingTo.is_commercial && (
                  <div style={{ background: "rgba(245,158,11,0.05)", padding: 12, borderRadius: 8, marginTop: 14, borderLeft: "3px solid var(--status-pending)" }}>
                    <h4 style={{ margin: "0 0 6px 0", color: "var(--status-pending)" }}>💰 Коммерческий потенциал:</h4>
                    <p style={{ margin: "4px 0", fontSize: 12 }}><strong>Необходимое финансирование:</strong> ${applyingTo.funding_needed?.toLocaleString() || "не указано"}</p>
                    <p style={{ margin: "4px 0", fontSize: 12 }}><strong>Статус прототипа:</strong> {applyingTo.prototype_status || "в разработке"}</p>
                    <p style={{ margin: "4px 0", fontSize: 12 }}><strong>Рыночная ценность:</strong> {applyingTo.market_potential || "высокая"}</p>
                  </div>
                )}
              </div>
              
              <div className="unified-modal-form" style={{ flex: 1, minWidth: "280px", borderLeft: "1px solid var(--border-color)", paddingLeft: "24px" }}>
                {appliedLabIds.includes(applyingTo.id) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center", height: "100%", alignItems: "center", padding: "40px 0" }}>
                    <span className={`status-badge ${statusClass(myApplications.find(a => a.lab_id === applyingTo.id)?.status)}`} style={{ fontSize: 14, padding: "8px 16px" }}>
                      Статус: {statusLabel(myApplications.find(a => a.lab_id === applyingTo.id)?.status)}
                    </span>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>Вы уже подали заявку в этот проект. Вы можете связаться с руководителем в чате, если статус «Принят» или «Интервью».</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h3 style={{ margin: 0 }}>Подать заявку</h3>
                    <div className="field-group">
                      <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Мотивационное письмо</label>
                      <textarea
                        value={motivation}
                        onChange={e => setMotivation(e.target.value)}
                        placeholder="Напишите, почему вы хотите участвовать, какие навыки планируете применить..."
                        rows={6}
                        style={{ width: "100%", padding: "10px 14px", background: "var(--input-bg)", border: "1px solid var(--border-color)", color: "#fff", borderRadius: 8, fontFamily: "inherit", fontSize: 13.5 }}
                      />
                      
                      {/* AI Letter Assist */}
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center", background: "rgba(79, 70, 229, 0.1)", border: "1px solid var(--primary-light)", color: "var(--primary-light)" }}
                          onClick={async () => {
                            if (aiGenerating) return;
                            setAiGenerating(true);
                            try {
                              const res = await fetch("http://localhost:8000/api/generate-motivation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  student_name: userData?.name || "",
                                  student_bio: userData?.bio || "",
                                  student_skills: userData?.skills || "",
                                  student_interests: userData?.interests || [],
                                  project_name: applyingTo.name,
                                  project_desc: applyingTo.description,
                                  project_requirements: applyingTo.requirements || ""
                                })
                              });
                              const data = await res.json();
                              if (data.draft) {
                                setMotivation(data.draft);
                              } else {
                                alert("Не удалось получить ответ от AI-ассистента.");
                              }
                            } catch {
                              alert("Не удалось соединиться с AI-сервером на http://localhost:8000. Убедитесь, что Python бэкенд запущен.");
                            }
                            setAiGenerating(false);
                          }}
                        >
                          🤖 {aiGenerating ? "Составляем письмо..." : "Написать письмо с помощью AI"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>📄 Прикрепить резюме / CV (PDF, необязательно)</label>
                      <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => setCvFile(e.target.files[0])} />
                      <button className="btn-secondary" onClick={() => cvInputRef.current.click()} style={{ width: "100%" }}>
                        {cvFile ? `✓ ${cvFile.name}` : "Выбрать файл резюме"}
                      </button>
                    </div>
                    <button className="btn-apply" onClick={() => handleApply(applyingTo)} disabled={cvUploading} style={{ width: "100%", marginTop: 12, padding: "12px" }}>
                      {cvUploading ? "Отправка..." : "Отправить заявку в проект"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}