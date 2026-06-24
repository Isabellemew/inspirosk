import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, updateDoc, serverTimestamp, orderBy, onSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Paperclip, Mic, Download,
  Image as ImageIcon, LogOut, CheckCircle, Clock, FileText,
  Info, Star, Upload, Palette
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

export default function DashboardStudent() {
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

  // Lightbox & Voice recorder States
  const [activeImageUrl, setActiveImageUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const imageAttachInputRef = useRef(null);
  const fileAttachInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const navigate = useNavigate();

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
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch User Data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setProfileForm({
          name: data.name || "",
          university: data.university || "",
          degree: data.degree || "",
          year: data.year || "",
          bio: data.bio || "",
          github: data.github || "",
          linkedin: data.linkedin || "",
          telegram: data.telegram || "",
          skills: data.skills || "",
          languages: data.languages || "",
          achievements: data.achievements || "",
          interests: data.interests || [],
        });
      }

      // 2. Fetch All Labs
      const labsSnap = await getDocs(collection(db, "labs"));
      setLabs(labsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Fetch Applications
      const appsSnap = await getDocs(
        query(collection(db, "applications"), where("studentId", "==", user.uid))
      );
      const apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyApplications(apps);

      setLoading(false);
    };

    fetchData();
  }, []);

  // REAL-TIME Chat Listener for selected activeChatId
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
      // Scroll to bottom
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    });

    return () => unsubscribe();
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
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { avatarUrl: url });
      setUserData(prev => ({ ...prev, avatarUrl: url }));
    } catch {
      alert("Ошибка загрузки фото. Проверь Firebase Storage правила.");
    }
    setAvatarUploading(false);
  };

  const handleSaveProfile = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { ...profileForm });
    setUserData(prev => ({ ...prev, ...profileForm }));
    setEditingProfile(false);
  };

  const toggleInterest = (area) => {
    setProfileForm(prev => ({
      ...prev,
      interests: prev.interests.includes(area)
        ? prev.interests.filter(i => i !== area)
        : [...prev.interests, area]
    }));
  };

  const handleApply = async (lab) => {
    if (!motivation.trim()) return alert("Напиши мотивационное письмо");
    const user = auth.currentUser;
    setCvUploading(true);
    let cvUrl = null;
    if (cvFile) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `cvs/${user.uid}_${lab.id}`);
        await uploadBytes(storageRef, cvFile);
        cvUrl = await getDownloadURL(storageRef);
      } catch {
        alert("Ошибка загрузки CV");
        setCvUploading(false);
        return;
      }
    }
    await addDoc(collection(db, "applications"), {
      studentId: user.uid,
      studentName: userData?.name || user.email,
      studentEmail: user.email,
      labId: lab.id,
      labName: lab.name,
      professorId: lab.professorId,
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

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const user = auth.currentUser;
    const textToSend = chatMessage;
    setChatMessage(""); // Clear input early for better UX

    await addDoc(collection(db, "chats", appId, "messages"), {
      text: textToSend,
      senderId: user.uid,
      senderName: userData?.name || "Студент",
      senderRole: "student",
      createdAt: serverTimestamp(),
    });
  };

  // Upload Files / Photos to Storage and Add Message to Firestore
  const handleAttachUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      return alert("Файл слишком большой. Максимальный лимит: 10МБ.");
    }

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `chats/${activeChatId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text: type === "image" ? "" : file.name,
        fileUrl: url,
        fileName: file.name,
        fileType: type,
        senderId: auth.currentUser.uid,
        senderName: userData?.name || "Студент",
        senderRole: "student",
        createdAt: serverTimestamp(),
      });
    } catch {
      alert("Не удалось отправить файл. Проверьте подключение.");
    }
  };

  // AUDIO RECORDING FUNCTIONS
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      alert("Не удалось получить доступ к микрофону");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        const stream = mediaRecorderRef.current.stream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
  };

  const uploadAudioMessage = async (blob) => {
    try {
      const storage = getStorage();
      const fileName = `voice_${Date.now()}.webm`;
      const storageRef = ref(storage, `chats/${activeChatId}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text: "",
        fileUrl: url,
        fileName: fileName,
        fileType: "audio",
        audioDuration: recordingDuration,
        senderId: auth.currentUser.uid,
        senderName: userData?.name || "Студент",
        senderRole: "student",
        createdAt: serverTimestamp(),
      });
    } catch {
      alert("Ошибка сохранения голосового сообщения.");
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    await addDoc(collection(db, "feedback"), {
      text: feedbackText,
      userId: auth.currentUser.uid,
      userRole: "student",
      userName: userData?.name || "",
      createdAt: serverTimestamp(),
    });
    setFeedbackText("");
    setFeedbackSent(true);
  };

  // Clickable Avatar navigation helper to jump directly to chat tab
  const handleJumpToChat = (labId) => {
    const matchedApp = myApplications.find(
      a => a.labId === labId && (a.status === "accepted" || a.status === "interview")
    );
    if (matchedApp) {
      setActiveTab("chat");
      setActiveChatId(matchedApp.id);
    }
  };

  const statusLabel = s => ({ pending: "На рассмотрении", accepted: "Принят ✓", rejected: "Отклонено", interview: "🎯 Интервью" }[s] || s);
  const statusClass = s => ({ pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected", interview: "status-interview" }[s] || "");

  const myInterests = userData?.interests || [];
  const recommendedLabs = labs.filter(l => l.researchAreas?.some(a => myInterests.includes(a)));
  const appliedLabIds = myApplications.map(a => a.labId);
  const chatApps = myApplications.filter(a => a.status === "accepted" || a.status === "interview");
  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "S";

  // Filter Labs Logic
  const filteredLabs = labs.filter(lab => {
    const matchesSearch = lab.name?.toLowerCase().includes(searchQuery.toLowerCase()) || lab.description?.toLowerCase().includes(searchQuery.toLowerCase()) || lab.professorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = !filterArea || lab.researchAreas?.includes(filterArea);
    const matchesNoExp = !filterNoExp || lab.noExperienceOk === true;
    const matchesIntl = !filterIntl || lab.internationalOk === true;
    const matchesPrep = !filterPrepLevel || lab.prepLevel === filterPrepLevel;
    const matchesComm = !filterCommercial || lab.isCommercial === true;
    return matchesSearch && matchesArea && matchesNoExp && matchesIntl && matchesPrep && matchesComm;
  });

  // Find active chat details
  const activeChatApp = chatApps.find(a => a.id === activeChatId);

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      {/* ── SIDEBAR ── */}
      <aside className="dash-sidebar">
        <div className="dash-logo">inspirosk</div>

        <div className="dash-user">
          <div className="dash-avatar" style={userData?.avatarUrl ? { padding: 0, overflow: "hidden" } : {}}>
            {userData?.avatarUrl
              ? <img src={userData.avatarUrl} alt="avatar" />
              : initials}
          </div>
          <div>
            <div className="dash-username">{userData?.name || "Студент"}</div>
            <div className="dash-role">Студент</div>
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
            ["discover", "🔍 Лаборатории", filteredLabs.length],
            ["recommended", "⭐ Рекомендации", recommendedLabs.length],
            ["applications", "📋 Мои заявки", myApplications.length],
            ["chat", "💬 Чат", chatApps.length],
            ["profile", "👤 Профиль", 0],
            ["knowledge-hub", "📚 База знаний", 0],
            ["support", "🛠 Поддержка", 0],
          ].map(([tab, label, count]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {label}
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          ))}
        </nav>

        <button className="dash-logout" onClick={() => { signOut(auth); navigate("/login"); }}>
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="dash-main">

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
                const chatApp = myApplications.find(a => a.labId === lab.id && (a.status === "accepted" || a.status === "interview"));
                return (
                  <div className="lab-card" key={lab.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: lab.isCommercial ? "4px solid var(--status-pending)" : "1px solid var(--border-color)" }}>
                    <div>
                      <div className="lab-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <h3>{lab.name}</h3>
                        {lab.isCommercial && <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)", fontSize: 11 }}>💰 Прикладной/R&D</span>}
                      </div>
                      
                      <div
                        className="lab-professor-row"
                        onClick={() => chatApp && handleJumpToChat(lab.id)}
                        title={chatApp ? "Нажмите, чтобы открыть чат с профессором" : ""}
                        style={{ margin: "8px 0" }}
                      >
                        <div className="lab-prof-avatar">👨‍🔬</div>
                        <p className="lab-professor">
                          👨‍🔬 {lab.professorName} {lab.isIndependent ? "(Независимый)" : ""}
                          {chatApp && <span style={{ fontSize: 11, marginLeft: 6, textDecoration: "underline" }}>(Чат 💬)</span>}
                        </p>
                      </div>
                      
                      <p className="lab-desc">{lab.description}</p>
                      
                      {/* Transparency and Commercial tags on card */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "8px 0" }}>
                        {lab.noExperienceOk && <span className="tag" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", fontSize: 11 }}>Без опыта 👍</span>}
                        {lab.internationalOk && <span className="tag" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", fontSize: 11 }}>Ин. студенты 🌍</span>}
                        <span className="tag" style={{ background: "rgba(129,140,248,0.12)", color: "var(--primary-light)", fontSize: 11 }}>
                          Подготовка: {lab.prepLevel === "beginner" ? "Начальный" : lab.prepLevel === "intermediate" ? "Средний" : "Продвинутый"}
                        </span>
                      </div>
                      
                      {lab.requirements && <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0" }}>📋 Требования: {lab.requirements.slice(0, 80)}...</p>}
                    </div>

                    <div>
                      <div className="lab-tags">{lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                      
                      <div className="lab-footer">
                        <span className="lab-spots">Мест: {lab.openSpots || "?"}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {appliedLabIds.includes(lab.id) ? (
                            <>
                              <span className={`status-badge ${statusClass(myApplications.find(a => a.labId === lab.id)?.status)}`}>
                                {statusLabel(myApplications.find(a => a.labId === lab.id)?.status)}
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
                    const chatApp = myApplications.find(a => a.labId === lab.id && (a.status === "accepted" || a.status === "interview"));
                    return (
                      <div className="lab-card highlight" key={lab.id}>
                        <h3>{lab.name}</h3>
                        <div
                          className="lab-professor-row"
                          onClick={() => chatApp && handleJumpToChat(lab.id)}
                          title={chatApp ? "Открыть чат" : ""}
                        >
                          <div className="lab-prof-avatar">👨‍🔬</div>
                          <p className="lab-professor">👨‍🔬 {lab.professorName}</p>
                        </div>
                        <p className="lab-desc">{lab.description}</p>
                        <div className="lab-tags">
                          {lab.researchAreas?.map(a => (
                            <span key={a} className={`tag ${myInterests.includes(a) ? "tag-match" : ""}`}>{a}</span>
                          ))}
                        </div>
                        <div className="lab-footer">
                          <span className="lab-spots">Мест: {lab.openSpots || "?"}</span>
                          {appliedLabIds.includes(lab.id)
                            ? (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span className={`status-badge ${statusClass(myApplications.find(a => a.labId === lab.id)?.status)}`}>
                                  {statusLabel(myApplications.find(a => a.labId === lab.id)?.status)}
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

        {/* ── ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Мои заявки</h1>
            <p className="dash-subtitle">История и текущие статусы ваших обращений</p>
            {myApplications.length === 0
              ? <div className="empty-state"><FileText size={32} />Вы ещё не подавали заявки.</div>
              : <div className="applications-list">
                  {myApplications.map(app => (
                    <div className="app-card" key={app.id}>
                      <div className="app-info">
                        <h3>{app.labName}</h3>
                        <p className="app-date"><Clock size={12} /> {app.createdAt?.toDate?.().toLocaleDateString("ru")}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
                        {(app.status === "accepted" || app.status === "interview") && (
                          <button className="btn-secondary" onClick={() => { setActiveTab("chat"); setActiveChatId(app.id); }}>
                            <MessageSquare size={14} /> Написать
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── RICH CHAT ── */}
        {activeTab === "chat" && (
          <div className="dash-content">
            <h1>Сообщения</h1>
            <p className="dash-subtitle">Официальный чат с профессорами</p>
            {chatApps.length === 0
              ? <div className="empty-state"><MessageSquare size={32} />Чат откроется после того, как профессор примет заявку или пригласит на интервью.</div>
              : <div className="chat-layout">
                  {/* Chat sidebar list */}
                  <div className="chat-list">
                    {chatApps.map(app => {
                      const lastMsgs = chats[app.id] || [];
                      const lastMsg = lastMsgs[lastMsgs.length - 1];
                      let previewText = "Сообщений нет";
                      if (lastMsg) {
                        if (lastMsg.fileType === "image") previewText = "📷 Фотография";
                        else if (lastMsg.fileType === "audio") previewText = "🎤 Голосовое сообщение";
                        else if (lastMsg.fileType === "file") previewText = `📄 ${lastMsg.fileName}`;
                        else previewText = lastMsg.text;
                      }

                      return (
                        <div key={app.id} className={`chat-person ${activeChatId === app.id ? "active" : ""}`} onClick={() => setActiveChatId(app.id)}>
                          <div className="student-avatar" style={{ background: "var(--primary)" }}>{app.labName?.[0]}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{app.labName}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                              <span>{app.status === "interview" ? "🎯 Интервью" : "✓ Принят"}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: 4 }}>
                              {previewText}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chat Window Panel */}
                  <div className="chat-window">
                    {!activeChatId
                      ? <div className="empty-state"><MessageSquare size={32} />Выберите беседу для начала общения</div>
                      : <>
                          {/* Chat Header */}
                          <div className="chat-header">
                            <div className="chat-header-user">
                              <div className="student-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{activeChatApp?.labName?.[0]}</div>
                              <div>
                                <div className="chat-header-name">{activeChatApp?.labName}</div>
                                <div className="chat-header-sub">Профессор ID: {activeChatApp?.professorId?.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </div>

                          {/* Chat Messages scroll area */}
                          <div className="chat-messages">
                            {(chats[activeChatId] || []).map((msg, i) => {
                              const isMine = msg.senderRole === "student";
                              return (
                                <div key={msg.id || i} className={`chat-bubble ${isMine ? "mine" : "theirs"}`}>
                                  {/* Render Image type */}
                                  {msg.fileType === "image" && msg.fileUrl && (
                                    <img
                                      src={msg.fileUrl}
                                      alt="attachment"
                                      className="chat-image-preview"
                                      onClick={() => setActiveImageUrl(msg.fileUrl)}
                                    />
                                  )}

                                  {/* Render Document/File type */}
                                  {msg.fileType === "file" && msg.fileUrl && (
                                    <div className="chat-file-card">
                                      <div className="chat-file-icon">
                                        <FileText size={16} />
                                      </div>
                                      <div className="chat-file-info">
                                        <div className="chat-file-name">{msg.fileName}</div>
                                      </div>
                                      <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="chat-file-download">
                                        <Download size={16} />
                                      </a>
                                    </div>
                                  )}

                                  {/* Render Audio type */}
                                  {msg.fileType === "audio" && msg.fileUrl && (
                                    <AudioPlayer src={msg.fileUrl} duration={msg.audioDuration} />
                                  )}

                                  {/* Text Content */}
                                  {msg.text && <span>{msg.text}</span>}

                                  <span className="chat-time">
                                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </span>
                                </div>
                              );
                            })}
                            <div ref={chatBottomRef} />
                          </div>

                          {/* Bottom input area */}
                          <div className="chat-input-row">
                            {/* Hidden file input pickers */}
                            <input
                              type="file"
                              ref={imageAttachInputRef}
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => handleAttachUpload(e, "image")}
                            />
                            <input
                              type="file"
                              ref={fileAttachInputRef}
                              accept="*"
                              style={{ display: "none" }}
                              onChange={(e) => handleAttachUpload(e, "file")}
                            />

                            {/* Attach menu buttons */}
                            <button className="chat-attach-btn" onClick={() => imageAttachInputRef.current.click()} title="Прикрепить фото">
                              <ImageIcon size={20} />
                            </button>
                            <button className="chat-attach-btn" onClick={() => fileAttachInputRef.current.click()} title="Прикрепить файл">
                              <Paperclip size={20} />
                            </button>

                            {/* Voice Recorder Indicator / Text Input */}
                            {isRecording ? (
                              <div className="voice-recorder-bar">
                                <div>
                                  <span className="voice-pulser" />
                                  Запись голосового: {recordingDuration}с
                                </div>
                                <button className="voice-cancel-btn" onClick={cancelRecording}>Отмена</button>
                              </div>
                            ) : (
                              <input
                                className="chat-text-input"
                                value={chatMessage}
                                onChange={e => setChatMessage(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSendMessage(activeChatId)}
                                placeholder="Написать сообщение..."
                              />
                            )}

                            {/* Mic/Send button toggles */}
                            {chatMessage.trim() ? (
                              <button className="chat-send-btn" onClick={() => handleSendMessage(activeChatId)}>
                                <Send size={16} />
                              </button>
                            ) : (
                              <button
                                className={`chat-mic-btn ${isRecording ? "recording" : ""}`}
                                onClick={isRecording ? stopRecording : startRecording}
                                title={isRecording ? "Отправить голосовое" : "Записать голосовое"}
                              >
                                {isRecording ? <Send size={16} /> : <Mic size={20} />}
                              </button>
                            )}
                          </div>
                        </>
                    }
                  </div>
                </div>
            }
          </div>
        )}

        {/* ── ПРОФИЛЬ ── */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Мой профиль</h1>
            <p className="dash-subtitle">Расскажите лабораториям о себе</p>
            <div className="profile-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className="profile-avatar" style={userData?.avatarUrl ? { padding: 0, overflow: "hidden", width: 80, height: 80 } : { width: 80, height: 80, fontSize: 32 }}>
                  {userData?.avatarUrl
                    ? <img src={userData.avatarUrl} alt="avatar" />
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
                    ["name", "Имя"], ["university", "Университет"],
                    ["github", "GitHub"], ["linkedin", "LinkedIn"], ["telegram", "Telegram"],
                    ["skills", "Навыки (через запятую)"],
                    ["languages", "Языки"], ["achievements", "Достижения"],
                  ].map(([field, label]) => (
                    <div className="profile-edit-row" key={field}>
                      <label>{label}</label>
                      <input value={profileForm[field]} onChange={e => setProfileForm(p => ({ ...p, [field]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="profile-edit-row">
                    <label>О себе</label>
                    <textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Кратко о себе..." />
                  </div>
                  <div className="profile-edit-row">
                    <label>Интересы</label>
                    <div className="lab-tags" style={{ marginTop: 6 }}>
                      {RESEARCH_AREAS.map(area => (
                        <span
                          key={area}
                          className={`tag ${profileForm.interests.includes(area) ? "tag-match" : ""}`}
                          style={{ cursor: "pointer", padding: "6px 14px" }}
                          onClick={() => toggleInterest(area)}
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button className="btn-apply" onClick={handleSaveProfile}>Сохранить</button>
                    <button className="btn-secondary" onClick={() => setEditingProfile(false)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    ["Имя", userData?.name],
                    ["Email", auth.currentUser?.email],
                    ["Университет", userData?.university],
                    ["Степень", userData?.degree],
                    ["Курс", userData?.year ? `${userData.year} курс` : null],
                    ["О себе", userData?.bio],
                    ["Навыки", userData?.skills],
                    ["Языки", userData?.languages],
                    ["Достижения", userData?.achievements],
                    ["GitHub", userData?.github],
                    ["LinkedIn", userData?.linkedin],
                    ["Telegram", userData?.telegram],
                  ].map(([label, val]) => val ? (
                    <div className="profile-row" key={label}><span>{label}:</span> <span>{val}</span></div>
                  ) : null)}
                  {(userData?.interests || []).length > 0 && (
                    <div className="profile-row">
                      <span>Интересы:</span>
                      <div className="lab-tags" style={{ marginTop: 4 }}>
                        {userData.interests.map(i => <span key={i} className="tag">{i}</span>)}
                      </div>
                    </div>
                  )}
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
      </main>

      {/* ── IMAGE LIGHTBOX MODAL ── */}
      {activeImageUrl && (
        <div className="lightbox-overlay" onClick={() => setActiveImageUrl(null)}>
          <button className="lightbox-close" onClick={() => setActiveImageUrl(null)}>×</button>
          <img src={activeImageUrl} alt="Fullscreen Attachment" className="lightbox-img" onClick={e => e.stopPropagation()} />
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
              👨‍🔬 Руководитель: {applyingTo.professorName} {applyingTo.isIndependent ? "(Независимый проект)" : ""}
            </p>
            
            <div className="unified-modal-content" style={{ display: "flex", gap: "24px", marginTop: "15px", flexWrap: "wrap" }}>
              <div className="unified-modal-details" style={{ flex: 1.2, minWidth: "280px" }}>
                <h4 style={{ margin: "0 0 6px 0", color: "var(--primary-light)" }}>🔬 Описание проекта:</h4>
                <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{applyingTo.description}</p>
                
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "14px 0" }}>
                  {applyingTo.noExperienceOk ? (
                    <span className="tag" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 600 }}>Без опыта 👍</span>
                  ) : (
                    <span className="tag" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>Опыт обязателен</span>
                  )}
                  {applyingTo.internationalOk && <span className="tag" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", fontWeight: 600 }}>Иностранным студентам 🌍</span>}
                  <span className="tag" style={{ background: "rgba(129,140,248,0.15)", color: "var(--primary-light)" }}>
                    Подготовка: {applyingTo.prepLevel === "beginner" ? "Начальный" : applyingTo.prepLevel === "intermediate" ? "Средний" : "Продвинутый"}
                  </span>
                  {applyingTo.isCommercial && <span className="tag" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600 }}>💰 Коммерческий</span>}
                </div>
                
                <h4 style={{ margin: "14px 0 4px 0", color: "var(--primary-light)" }}>📋 Требования и квалификации:</h4>
                <p style={{ fontSize: 13, background: "var(--input-bg)", padding: 10, borderRadius: 8 }}>{applyingTo.requirements || "Специфических требований нет"}</p>
                
                <h4 style={{ margin: "14px 0 4px 0", color: "var(--status-rejected)" }}>⚠️ Вызовы и сложности (Честный обзор):</h4>
                <p style={{ fontSize: 13, background: "rgba(239,68,68,0.05)", padding: 10, borderRadius: 8, borderLeft: "3px solid var(--status-rejected)" }}>
                  {applyingTo.challenges || "Типичная нагрузка исследовательской работы. Особых вызовов не указано."}
                </p>

                <h4 style={{ margin: "14px 0 4px 0", color: "var(--status-accepted)" }}>📝 Инструкции по подаче:</h4>
                <p style={{ fontSize: 13, background: "rgba(16,185,129,0.05)", padding: 10, borderRadius: 8, borderLeft: "3px solid var(--status-accepted)" }}>
                  {applyingTo.howToApply || "Напишите краткое мотивационное письмо справа и прикрепите резюме."}
                </p>

                {applyingTo.isCommercial && (
                  <div style={{ background: "rgba(245,158,11,0.05)", padding: 12, borderRadius: 8, marginTop: 14, borderLeft: "3px solid var(--status-pending)" }}>
                    <h4 style={{ margin: "0 0 6px 0", color: "var(--status-pending)" }}>💰 Коммерческий потенциал:</h4>
                    <p style={{ margin: "4px 0", fontSize: 12 }}><strong>Необходимое финансирование:</strong> ${applyingTo.fundingNeeded?.toLocaleString() || "не указано"}</p>
                    <p style={{ margin: "4px 0", fontSize: 12 }}><strong>Статус прототипа:</strong> {applyingTo.prototypeStatus || "в разработке"}</p>
                    <p style={{ margin: "4px 0", fontSize: 12 }}><strong>Рыночная ценность:</strong> {applyingTo.marketPotential || "высокая"}</p>
                  </div>
                )}
              </div>
              
              <div className="unified-modal-form" style={{ flex: 1, minWidth: "280px", borderLeft: "1px solid var(--border-color)", paddingLeft: "24px" }}>
                {appliedLabIds.includes(applyingTo.id) ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center", height: "100%", alignItems: "center", padding: "40px 0" }}>
                    <span className={`status-badge ${statusClass(myApplications.find(a => a.labId === applyingTo.id)?.status)}`} style={{ fontSize: 14, padding: "8px 16px" }}>
                      Статус: {statusLabel(myApplications.find(a => a.labId === applyingTo.id)?.status)}
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