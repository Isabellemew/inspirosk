import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Paperclip, Mic, Download,
  Image as ImageIcon, LogOut, CheckCircle, Clock, FileText,
  Info, Star, Upload, Palette, Plus, UserPlus, Heart
} from "lucide-react";
import "./Dashboard.css";

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

export default function DashboardIndependent() {
  const [userData, setUserData] = useState(null);
  const [myProjects, setMyProjects] = useState([]);
  const [allIndependentProjects, setAllIndependentProjects] = useState([]);
  const [myApplications, setMyApplications] = useState([]); // applications I sent to others
  const [receivedApplications, setReceivedApplications] = useState([]); // applications sent to my projects
  const [chats, setChats] = useState({});
  const [activeTab, setActiveTab] = useState("discover");
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [applyingTo, setApplyingTo] = useState(null);
  const [motivation, setMotivation] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);

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

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterNoExp, setFilterNoExp] = useState(false);
  const [filterIntl, setFilterIntl] = useState(false);
  const [filterCommercial, setFilterCommercial] = useState(false);

  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch User Data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setProfileForm({
          name: data.name || "",
          bio: data.bio || "",
          github: data.github || "",
          linkedin: data.linkedin || "",
          skills: data.skills || "",
          interests: data.interests || [],
        });
      }

      // 2. Fetch Independent Projects
      const labsSnap = await getDocs(collection(db, "labs"));
      const allLabs = labsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // My created projects (where professorId/creatorId matches user uid AND isIndependent is true)
      const myProjs = allLabs.filter(l => l.professorId === user.uid && l.isIndependent);
      setMyProjects(myProjs);

      // Other independent projects
      const otherInd = allLabs.filter(l => l.isIndependent && l.professorId !== user.uid);
      setAllIndependentProjects(otherInd);

      // 3. Fetch applications I sent
      const myAppsSnap = await getDocs(
        query(collection(db, "applications"), where("studentId", "==", user.uid))
      );
      setMyApplications(myAppsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Fetch applications received for my projects
      if (myProjs.length > 0) {
        const myProjIds = myProjs.map(p => p.id);
        const allAppsSnap = await getDocs(collection(db, "applications"));
        const appsRec = allAppsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => myProjIds.includes(a.labId));
        setReceivedApplications(appsRec);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Chat listener
  useEffect(() => {
    if (!activeChatId) return;

    const q = query(
      collection(db, "chats", activeChatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setChats(prev => ({
        ...prev,
        [activeChatId]: msgs
      }));
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const handleThemeChange = (newTheme) => {
    setActiveTheme(newTheme);
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("inspiro-theme", newTheme);
  };

  const update = (field) => (e) => setProfileForm(p => ({ ...p, [field]: e.target.value }));

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { avatarUrl: url });
      setUserData(prev => ({ ...prev, avatarUrl: url }));
    } catch {
      alert("Ошибка загрузки фото");
    }
    setAvatarUploading(false);
  };

  const handleSaveProfile = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { ...profileForm });
    setUserData(prev => ({ ...prev, ...profileForm }));
    setEditingProfile(false);
  };

  const handleCreateProject = async () => {
    if (!projectForm.name || !projectForm.description) return alert("Заполните название и описание");
    const user = auth.currentUser;
    const newProjData = {
      name: projectForm.name,
      description: projectForm.description,
      researchAreas: projectForm.researchAreas,
      openSpots: Number(projectForm.openSpots),
      requirements: projectForm.requirements || "",
      challenges: projectForm.challenges || "",
      howToApply: projectForm.howToApply || "",
      isIndependent: true,
      professorId: user.uid,
      professorName: userData?.name || user.email,
      noExperienceOk: true, // Independent researchers are usually open to beginners
      internationalOk: true,
      prepLevel: "beginner",
      isCommercial: !!projectForm.isCommercial,
      fundingNeeded: projectForm.isCommercial ? Number(projectForm.fundingNeeded || 0) : 0,
      prototypeStatus: projectForm.isCommercial ? projectForm.prototypeStatus || "" : "",
      marketPotential: projectForm.isCommercial ? projectForm.marketPotential || "" : "",
      createdAt: serverTimestamp(),
    };

    const newProj = await addDoc(collection(db, "labs"), newProjData);
    setMyProjects(prev => [...prev, { id: newProj.id, ...newProjData }]);
    setShowProjectForm(false);
    setProjectForm({
      name: "", description: "", researchAreas: [], openSpots: 2,
      requirements: "", challenges: "", howToApply: "",
      isCommercial: false, fundingNeeded: "", prototypeStatus: "", marketPotential: ""
    });
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Удалить этот проект?")) return;
    await deleteDoc(doc(db, "labs", id));
    setMyProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleApply = async (proj) => {
    if (!motivation.trim()) return alert("Напишите мотивационное письмо");
    const user = auth.currentUser;
    setCvUploading(true);
    let cvUrl = null;
    if (cvFile) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `cvs/${user.uid}_${proj.id}`);
        await uploadBytes(storageRef, cvFile);
        cvUrl = await getDownloadURL(storageRef);
      } catch {
        alert("Ошибка загрузки резюме");
        setCvUploading(false);
        return;
      }
    }

    await addDoc(collection(db, "applications"), {
      studentId: user.uid,
      studentName: userData?.name || user.email,
      studentEmail: user.email,
      labId: proj.id,
      labName: proj.name,
      professorId: proj.professorId,
      motivation,
      cvUrl,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setApplyingTo(null);
    setMotivation("");
    setCvFile(null);
    setCvUploading(false);

    const appsSnap = await getDocs(
      query(collection(db, "applications"), where("studentId", "==", user.uid))
    );
    setMyApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleStatus = async (appId, status) => {
    await updateDoc(doc(db, "applications", appId), { status });
    setReceivedApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const user = auth.currentUser;
    const textToSend = chatMessage;
    setChatMessage("");

    await addDoc(collection(db, "chats", appId, "messages"), {
      text: textToSend,
      senderId: user.uid,
      senderName: userData?.name || "Исследователь",
      senderRole: "independent",
      createdAt: serverTimestamp(),
    });
  };

  const toggleArea = (area) => {
    setProjectForm(prev => ({
      ...prev,
      researchAreas: prev.researchAreas.includes(area)
        ? prev.researchAreas.filter(a => a !== area)
        : [...prev.researchAreas, area]
    }));
  };

  const toggleInterest = (area) => {
    setProfileForm(prev => ({
      ...prev,
      interests: prev.interests.includes(area)
        ? prev.interests.filter(i => i !== area)
        : [...prev.interests, area]
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
    const matchesArea = !filterArea || p.researchAreas?.includes(filterArea);
    const matchesComm = !filterCommercial || p.isCommercial;
    return matchesSearch && matchesArea && matchesComm;
  });

  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "IR";
  const activeChatApp = chatApps.find(a => a.id === activeChatId);

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-logo">inspirosk</div>

        <div className="dash-user">
          <div className="dash-avatar" style={userData?.avatarUrl ? { padding: 0, overflow: "hidden" } : {}}>
            {userData?.avatarUrl ? <img src={userData.avatarUrl} alt="avatar" /> : initials}
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
            ["discover", "🔍 Искать соавторов", filteredProjects.length],
            ["my-projects", "💡 Мои проекты", myProjects.length],
            ["requests", "📥 Заявки в проекты", receivedApplications.filter(a => a.status === "pending").length],
            ["applications", "📤 Отправленные", myApplications.length],
            ["chat", "💬 Обсуждения", chatApps.length],
            ["profile", "👤 Профиль", 0],
            ["knowledge-hub", "📚 База знаний", 0],
          ].map(([tab, label, count]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); if(tab === "chat" && chatApps.length > 0) setActiveChatId(chatApps[0].id); }}>
              {label}
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={() => { signOut(auth); navigate("/login"); }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* Main Content */}
      <main className="dash-main">

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
                const applied = myApplications.find(a => a.labId === proj.id);
                return (
                  <div className="lab-card" key={proj.id} style={{ borderLeft: proj.isCommercial ? "4px solid var(--status-pending)" : "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3>{proj.name}</h3>
                      {proj.isCommercial && <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)" }}>💰 Коммерческий</span>}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--primary-light)", margin: "4px 0" }}>👤 Автор: {proj.professorName}</p>
                    <p className="lab-desc">{proj.description}</p>
                    {proj.requirements && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0 0" }}>📋 Требуемые соавторы: {proj.requirements}</p>}
                    {proj.challenges && <p style={{ fontSize: 12, color: "var(--status-rejected)", margin: "4px 0 0 0" }}>⚠️ Сложности: {proj.challenges}</p>}
                    
                    <div className="lab-tags" style={{ marginTop: 10 }}>
                      {proj.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}
                    </div>

                    <div className="lab-footer" style={{ marginTop: 15 }}>
                      <span>Ищет соавторов: {proj.openSpots || 2}</span>
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
                <p className="dash-subtitle">Создавайте свои работы и ищите заинтересованных соавторов</p>
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
                    <input type="text" placeholder="Пример: Разработка децентрализованной энергосети" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Описание идеи и методологии</label>
                    <textarea placeholder="Опишите гипотезу, цели работы..." value={projectForm.description} onChange={e => setProjectForm({...projectForm, description: e.target.value})} rows={4} />
                  </div>
                  <div className="field-group">
                    <label>Кого вы ищете (Навыки / Задачи соавтора)</label>
                    <input type="text" placeholder="Пример: Frontend-разработчик со знанием D3.js для визуализации" value={projectForm.requirements} onChange={e => setProjectForm({...projectForm, requirements: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Сложности и вызовы проекта (Будьте честны о нагрузке)</label>
                    <input type="text" placeholder="Пример: Ограниченные ресурсы вычислений, сложный математический аппарат" value={projectForm.challenges} onChange={e => setProjectForm({...projectForm, challenges: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Направления исследований</label>
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

                  <div className="field-group" style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid var(--border-color)", padding: 12, borderRadius: 8, background: "var(--card-hover-bg)" }}>
                    <input type="checkbox" checked={projectForm.isCommercial} onChange={e => setProjectForm({...projectForm, isCommercial: e.target.checked})} />
                    <div>
                      <label style={{ margin: 0, fontWeight: "bold" }}>Проект имеет коммерческую ценность</label>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Позволит инвесторам и компаниям найти ваш проект в маркете</p>
                    </div>
                  </div>

                  {projectForm.isCommercial && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 16, borderLeft: "2px solid var(--status-pending)" }}>
                      <div className="field-group">
                        <label>Необходимое финансирование ($)</label>
                        <input type="number" placeholder="Пример: 15000" value={projectForm.fundingNeeded} onChange={e => setProjectForm({...projectForm, fundingNeeded: e.target.value})} />
                      </div>
                      <div className="field-group">
                        <label>Статус прототипа</label>
                        <input type="text" placeholder="Пример: MVP готов / Математическая модель / Альфа-версия" value={projectForm.prototypeStatus} onChange={e => setProjectForm({...projectForm, prototypeStatus: e.target.value})} />
                      </div>
                      <div className="field-group">
                        <label>Описание рыночного потенциала</label>
                        <textarea placeholder="Какую проблему решает продукт на рынке?" value={projectForm.marketPotential} onChange={e => setProjectForm({...projectForm, marketPotential: e.target.value})} rows={2} />
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
                <div className="lab-card" key={proj.id} style={{ borderLeft: proj.isCommercial ? "4px solid var(--status-pending)" : "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3>{proj.name}</h3>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: 11, background: "var(--status-rejected-bg)", color: "var(--status-rejected)" }} onClick={() => handleDeleteProject(proj.id)}>Удалить</button>
                  </div>
                  <p className="lab-desc">{proj.description}</p>
                  {proj.isCommercial && (
                    <div style={{ background: "var(--input-bg)", padding: 10, borderRadius: 8, margin: "10px 0", fontSize: 12 }}>
                      <p style={{ margin: "2px 0" }}>💰 <strong>Бюджет:</strong> ${proj.fundingNeeded}</p>
                      <p style={{ margin: "2px 0" }}>🛠 <strong>Прототип:</strong> {proj.prototypeStatus}</p>
                    </div>
                  )}
                  <div className="lab-tags">
                    {proj.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Received Applications (Co-author requests) */}
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
                      <h3 style={{ margin: 0 }}>{app.studentName}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--primary-light)" }}>Проект: {app.labName}</p>
                    </div>
                    <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
                  </div>
                  <p style={{ fontSize: 13, background: "var(--input-bg)", padding: 12, borderRadius: 8 }}>
                    <strong>Мотивация:</strong> {app.motivation}
                  </p>
                  {app.cvUrl && (
                    <a href={app.cvUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: "fit-content", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
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
                    <h3>{app.labName}</h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>Подано: {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString() : "Недавно"}</p>
                  </div>
                  <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Chat & Communication */}
        {activeTab === "chat" && (
          <div className="dash-content chat-tab-container" style={{ height: "calc(100vh - 120px)" }}>
            <h1>Обсуждения</h1>
            <div className="chat-window-layout" style={{ display: "flex", height: "90%", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", background: "var(--dash-sidebar)" }}>
              {/* Chat sidebar */}
              <div className="chat-list-sidebar" style={{ width: 250, borderRight: "1px solid var(--border-color)" }}>
                {chatApps.length === 0 ? (
                  <p style={{ padding: 15, fontSize: 12, color: "var(--text-muted)" }}>Нет активных чатов. Чаты открываются при принятии заявок.</p>
                ) : (
                  chatApps.map(app => (
                    <div key={app.id} className={`chat-item-node ${activeChatId === app.id ? "active-node" : ""}`} onClick={() => setActiveChatId(app.id)} style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid var(--border-color)", background: activeChatId === app.id ? "var(--primary-glow)" : "transparent" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{app.labName}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>{app.studentName === userData?.name ? "Владелец" : app.studentName}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat messages */}
              <div className="chat-main-window" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {activeChatId && activeChatApp ? (
                  <>
                    <div className="chat-header" style={{ padding: 12, borderBottom: "1px solid var(--border-color)", background: "var(--dash-card)" }}>
                      <h4 style={{ margin: 0 }}>{activeChatApp.labName}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                        Чат между {activeChatApp.studentName} и {activeChatApp.studentEmail}
                      </p>
                    </div>
                    <div className="chat-messages-container" style={{ flex: 1, padding: 15, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                      {chats[activeChatId]?.map(msg => {
                        const isMe = msg.senderId === auth.currentUser.uid;
                        return (
                          <div key={msg.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", background: isMe ? "var(--primary)" : "var(--dash-card)", padding: "10px 14px", borderRadius: 12, maxWidth: "60%" }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: "bold", color: isMe ? "#fff" : "var(--primary-light)" }}>{msg.senderName}</p>
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
            <p className="dash-subtitle">Управляйте вашим резюме и профессиональными интересами</p>

            <div className="lab-card" style={{ padding: 24 }}>
              {editingProfile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="field-group">
                    <label>Имя</label>
                    <input type="text" value={profileForm.name} onChange={update("name")} />
                  </div>
                  <div className="field-group">
                    <label>О себе / Опыт</label>
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
                    <label>Навыки (через запятую)</label>
                    <input type="text" value={profileForm.skills} onChange={update("skills")} placeholder="Python, React, Data Analysis" />
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
                  <p><strong>GitHub:</strong> {userData?.github ? <a href={userData.github} target="_blank" rel="noreferrer">{userData.github}</a> : "не привязан"}</p>
                  <p><strong>LinkedIn:</strong> {userData?.linkedin ? <a href={userData.linkedin} target="_blank" rel="noreferrer">{userData.linkedin}</a> : "не привязан"}</p>
                  <p><strong>Навыки:</strong> {userData?.skills || "не заполнены"}</p>
                  <button className="btn-apply" style={{ marginTop: 15 }} onClick={() => setEditingProfile(true)}>Редактировать</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Knowledge Hub */}
        {activeTab === "knowledge-hub" && (
          <div className="dash-content">
            <h1>📚 База Знаний (Knowledge Hub)</h1>
            <p className="dash-subtitle">Всё, что вам нужно знать для старта независимого научного проекта</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--primary-light)" }}>🔬 С чего начать исследование?</h3>
                <p style={{ fontSize: 14 }}>
                  Любая научная работа начинается с <strong>формулирования гипотезы</strong>. Прежде чем писать код или собирать данные:
                </p>
                <ol style={{ fontSize: 14, paddingLeft: 20, margin: "10px 0" }}>
                  <li>Сделайте <em>Literature Review</em> — найдите 5-10 свежих статей по теме в Google Scholar.</li>
                  <li>Опишите <em>Research Question</em> — какую именно нерешенную задачу вы хотите рассмотреть?</li>
                  <li>Определите <em>Methodology</em> — какие методы и инструменты вам понадобятся.</li>
                </ol>
              </div>

              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--status-pending)" }}>📝 Как привлечь соавторов в проект?</h3>
                <p style={{ fontSize: 14 }}>
                  Соавторам должно быть понятно, в чем заключается их роль. При создании проекта укажите:
                </p>
                <ul style={{ fontSize: 14, paddingLeft: 20, margin: "10px 0" }}>
                  <li>Конкретные навыки (например, "нужен человек для проведения опросов" или "ML-инженер для обучения модели").</li>
                  <li>Планируемый результат (публикация на arXiv, участие в конференции или создание коммерческого стартапа).</li>
                  <li>Честно опишите <strong>вызовы и сложности</strong>: сколько времени нужно уделять проекту каждую неделю.</li>
                </ul>
              </div>

              <div className="lab-card" style={{ padding: 20 }}>
                <h3 style={{ color: "var(--status-accepted)" }}>💵 Коммерциализация вашей работы</h3>
                <p style={{ fontSize: 14 }}>
                  Если ваша разработка имеет прикладную пользу (например, новый софт, девайс или алгоритм оптимизации), вы можете пометить проект как <strong>коммерческий</strong>. Это откроет его для инвесторов и бизнес-партнеров на платформе, которые смогут предложить финансирование или пилотное внедрение.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Proposal Modal */}
      {applyingTo && (
        <div className="lightbox-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", zIndex: 100 }}>
          <div className="lab-card" style={{ width: "500px", padding: 24 }}>
            <h2>Предложение соавторства</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Проект: {applyingTo.name}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
              <div className="field-group">
                <label>Расскажите о себе и вашем опыте в этой сфере</label>
                <textarea
                  value={motivation}
                  onChange={e => setMotivation(e.target.value)}
                  placeholder="Почему вас интересует этот проект? Какую часть работы вы готовы взять на себя?"
                  rows={4}
                  required
                />
              </div>

              <div className="field-group">
                <label>Прикрепить резюме / CV (необязательно)</label>
                <input type="file" onChange={e => setCvFile(e.target.files[0])} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn-apply" onClick={() => handleApply(applyingTo)} disabled={cvUploading}>
                  {cvUploading ? "Отправка..." : "Отправить заявку"}
                </button>
                <button className="btn-secondary" onClick={() => { setApplyingTo(null); setMotivation(""); setCvFile(null); }}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
