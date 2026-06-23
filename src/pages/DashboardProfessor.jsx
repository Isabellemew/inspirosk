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
  Info, Upload, Palette
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

export default function DashboardProfessor() {
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

  // Lab and Profile Form states
  const [labForm, setLabForm] = useState({
    name: "", description: "", researchAreas: [], openSpots: 3,
    requirements: "", responsibilities: "", benefits: "", papers: ""
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

  // Lightbox & Voice recorder States
  const [activeImageUrl, setActiveImageUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const fileInputRef = useRef(null);
  const imageAttachInputRef = useRef(null);
  const fileAttachInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const navigate = useNavigate();

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

  // Fetch initial profile, labs, applications
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
          department: data.department || "",
          position: data.position || "",
          bio: data.bio || "",
          website: data.website || "",
          googleScholar: data.googleScholar || "",
          linkedin: data.linkedin || "",
          researchgate: data.researchgate || "",
          achievements: data.achievements || "",
          papers: data.papers || ""
        });
      }

      // 2. Fetch Lab Data
      const labSnap = await getDocs(
        query(collection(db, "labs"), where("professorId", "==", user.uid))
      );

      if (!labSnap.empty) {
        const labData = { id: labSnap.docs[0].id, ...labSnap.docs[0].data() };
        setLab(labData);

        // Fetch Applications for this lab
        const appsSnap = await getDocs(
          query(collection(db, "applications"), where("labId", "==", labData.id))
        );
        const apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setApplications(apps);
      }
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

  const handleCreateLab = async () => {
    const user = auth.currentUser;
    const newLab = await addDoc(collection(db, "labs"), {
      ...labForm,
      professorId: user.uid,
      professorName: userData?.name || user.email,
      openSpots: Number(labForm.openSpots),
      createdAt: serverTimestamp(),
    });
    setLab({ id: newLab.id, ...labForm, professorId: user.uid });
    setShowLabForm(false);
  };

  const handleStatus = async (appId, status) => {
    await updateDoc(doc(db, "applications", appId), { status });
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const user = auth.currentUser;
    const textToSend = chatMessage;
    setChatMessage(""); // Clear input early

    await addDoc(collection(db, "chats", appId, "messages"), {
      text: textToSend,
      senderId: user.uid,
      senderName: userData?.name || "Профессор",
      senderRole: "professor",
      createdAt: serverTimestamp(),
    });
  };

  // Upload Files / Photos to Storage
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
        senderName: userData?.name || "Профессор",
        senderRole: "professor",
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
        senderName: userData?.name || "Профессор",
        senderRole: "professor",
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
      userRole: "professor",
      userName: userData?.name || "",
      createdAt: serverTimestamp(),
    });
    setFeedbackText("");
    setFeedbackSent(true);
  };

  // Helper to jump to a student's chat from dashboard lists
  const handleJumpToChat = (appId) => {
    setActiveTab("chat");
    setActiveChatId(appId);
  };

  const pending = applications.filter(a => a.status === "pending");
  const interview = applications.filter(a => a.status === "interview");
  const accepted = applications.filter(a => a.status === "accepted");
  const chatApps = applications.filter(a => a.status === "accepted" || a.status === "interview");

  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "P";
  const activeChatApp = chatApps.find(a => a.id === activeChatId);

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      {/* ── SIDEBAR ── */}
      <aside className="dash-sidebar">
        <div className="dash-logo">inspirosk</div>

        <div className="dash-user">
          <div className="dash-avatar professor-avatar" style={userData?.avatarUrl ? { padding: 0, overflow: "hidden" } : {}}>
            {userData?.avatarUrl
              ? <img src={userData.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            ["profile", "👤 Профиль", 0],
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

        {/* ── ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Входящие заявки</h1>
            <p className="dash-subtitle">Рассмотрите кандидатуры студентов на свободные места</p>
            {!lab && <div className="empty-state"><Info size={32} />Сначала создайте лабораторию во вкладке «Лаборатория».</div>}
            {pending.length === 0 && lab && <div className="empty-state"><CheckCircle size={32} />Новых заявок нет.</div>}
            <div className="applications-list">
              {pending.map(app => (
                <div className="app-card app-card-full" key={app.id}>
                  <div className="app-info">
                    <h3>{app.studentName}</h3>
                    <p className="app-email">{app.studentEmail}</p>
                    <p className="app-motivation">«{app.motivation}»</p>
                    {app.cvUrl && (
                      <a href={app.cvUrl} target="_blank" rel="noreferrer" className="cv-link">📄 Резюме (CV)</a>
                    )}
                    <p className="app-date"><Clock size={12} /> {app.createdAt?.toDate?.().toLocaleDateString("ru")}</p>
                  </div>
                  <div className="app-actions">
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
            <h1>На стадии интервью</h1>
            <p className="dash-subtitle">Собеседование и отбор подходящих кандидатов</p>
            {interview.length === 0
              ? <div className="empty-state"><Info size={32} />Никого на стадии интервью.</div>
              : <div className="applications-list">
                  {interview.map(app => (
                    <div className="app-card app-card-full" key={app.id}>
                      <div className="app-info">
                        <h3>{app.studentName}</h3>
                        <p className="app-email">{app.studentEmail}</p>
                      </div>
                      <div className="app-actions">
                        <button className="btn-accept" onClick={() => handleStatus(app.id, "accepted")}>✓ Принять</button>
                        <button className="btn-reject" onClick={() => handleStatus(app.id, "rejected")}>✗ Отклонить</button>
                        <button className="btn-secondary" onClick={() => handleJumpToChat(app.id)}>
                          <MessageSquare size={14} /> Чат
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── СТУДЕНТЫ ── */}
        {activeTab === "students" && (
          <div className="dash-content">
            <h1>Мои студенты</h1>
            <p className="dash-subtitle">Студенты, которые уже работают в вашей лаборатории</p>
            {accepted.length === 0
              ? <div className="empty-state"><Info size={32} />Пока нет принятых студентов.</div>
              : <div className="students-grid">
                  {accepted.map(app => (
                    <div className="student-card" key={app.id} onClick={() => handleJumpToChat(app.id)}>
                      <div className="student-card-avatar">{app.studentName?.[0] || "S"}</div>
                      <h3>{app.studentName}</h3>
                      <p>{app.studentEmail}</p>
                      <span className="status-badge status-accepted" style={{ marginTop: 8 }}>В лаборатории</span>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textDecoration: "underline" }}>Открыть чат 💬</div>
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
            <p className="dash-subtitle">Обсуждайте исследования и задачи напрямую</p>
            {chatApps.length === 0
              ? <div className="empty-state"><MessageSquare size={32} />Чат доступен после принятия студента или отправки на интервью.</div>
              : <div className="chat-layout">
                  {/* Chat list */}
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
                        <div
                          key={app.id}
                          className={`chat-person ${activeChatId === app.id ? "active" : ""}`}
                          onClick={() => setActiveChatId(app.id)}
                        >
                          <div className="student-avatar">{app.studentName?.[0]}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{app.studentName}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              {app.status === "interview" ? "🎯 Интервью" : "✓ Принят"}
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
                      ? <div className="empty-state"><MessageSquare size={32} />Выберите студента слева для начала общения</div>
                      : <>
                          {/* Chat Header */}
                          <div className="chat-header">
                            <div className="chat-header-user">
                              <div className="student-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{activeChatApp?.studentName?.[0]}</div>
                              <div>
                                <div className="chat-header-name">{activeChatApp?.studentName}</div>
                                <div className="chat-header-sub">{activeChatApp?.studentEmail}</div>
                              </div>
                            </div>
                          </div>

                          {/* Chat Messages scroll area */}
                          <div className="chat-messages">
                            {(chats[activeChatId] || []).map((msg, i) => {
                              const isMine = msg.senderRole === "professor";
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
                            {/* Hidden file pickers */}
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
                <div className="profile-row">
                  <span>Направления:</span>
                  <div className="lab-tags">{lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                </div>
                <div className="profile-row"><span>Мест всего:</span> <span>{lab.openSpots}</span></div>
                {lab.papers && <div className="profile-row"><span>Публикации:</span> <span>{lab.papers}</span></div>}
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

        {/* ── ПРОФИЛЬ ── */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Мой профиль</h1>
            <p className="dash-subtitle">Управление личной информацией исследователя</p>
            <div className="profile-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div className="profile-avatar professor-avatar" style={userData?.avatarUrl ? { padding: 0, overflow: "hidden", width: 80, height: 80 } : { width: 80, height: 80, fontSize: 32 }}>
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
                    ["name", "Имя", "Ваше имя"],
                    ["university", "Университет", "Назарбаев Университет"],
                    ["department", "Кафедра", "School of Engineering"],
                    ["position", "Должность", "Professor"],
                    ["website", "Сайт", "https://yoursite.com"],
                    ["googleScholar", "Google Scholar", "ссылка"],
                    ["linkedin", "LinkedIn", "ссылка"],
                    ["researchgate", "ResearchGate", "ссылка"],
                  ].map(([field, label, ph]) => (
                    <div className="profile-edit-row" key={field}>
                      <label>{label}</label>
                      <input value={profileForm[field]} onChange={e => setProfileForm(p => ({ ...p, [field]: e.target.value }))} placeholder={ph} />
                    </div>
                  ))}
                  <div className="profile-edit-row">
                    <label>О себе</label>
                    <textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Кратко о ваших исследованиях..." />
                  </div>
                  <div className="profile-edit-row">
                    <label>Достижения</label>
                    <textarea rows={3} value={profileForm.achievements} onChange={e => setProfileForm(p => ({ ...p, achievements: e.target.value }))} placeholder="Гранты, награды..." />
                  </div>
                  <div className="profile-edit-row">
                    <label>Исследовательские работы (ссылки)</label>
                    <textarea rows={2} value={profileForm.papers} onChange={e => setProfileForm(p => ({ ...p, papers: e.target.value }))} placeholder="https://doi.org/..." />
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
                    ["Должность", userData?.position],
                    ["Кафедра", userData?.department],
                    ["Университет", userData?.university],
                    ["О себе", userData?.bio],
                    ["Достижения", userData?.achievements],
                    ["Публикации", userData?.papers],
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

      {/* ── МОДАЛКА СОЗДАНИЯ ЛАБОРАТОРИИ ── */}
      {showLabForm && (
        <div className="modal-overlay" onClick={() => setShowLabForm(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h2>Создать лабораторию</h2>
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
              <button className="btn-apply" onClick={handleCreateLab}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}