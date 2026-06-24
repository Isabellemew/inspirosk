import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Send, Paperclip, LogOut, CheckCircle, Clock, FileText,
  Info, Star, Upload, Palette, Plus, Landmark, Briefcase, HelpCircle
} from "lucide-react";
import "./Dashboard.css";

export default function DashboardBusiness() {
  const [userData, setUserData] = useState(null);
  const [commercialProjects, setCommercialProjects] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [myCooperations, setMyCooperations] = useState([]); // requests I sent to researchers
  const [chats, setChats] = useState({});
  const [activeTab, setActiveTab] = useState("commercial-projects");
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [proposingTo, setProposingTo] = useState(null);
  const [proposalText, setProposalText] = useState("");

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

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch User Data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }

      // 2. Fetch Commercial Projects (labs where isCommercial is true)
      const labsSnap = await getDocs(collection(db, "labs"));
      const commProjs = labsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.isCommercial);
      setCommercialProjects(commProjs);

      // 3. Fetch My Posted Challenges
      const challengesSnap = await getDocs(
        query(collection(db, "business_challenges"), where("companyId", "==", user.uid))
      );
      setMyChallenges(challengesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Fetch My Cooperations (chat nodes / applications with researchers)
      const coopsSnap = await getDocs(
        query(collection(db, "applications"), where("studentId", "==", user.uid)) // we map investor to studentId for system simplicity
      );
      setMyCooperations(coopsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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

  const handleCreateChallenge = async () => {
    if (!challengeForm.title || !challengeForm.description) return alert("Заполните заголовок и описание");
    const user = auth.currentUser;
    const challengeData = {
      title: challengeForm.title,
      description: challengeForm.description,
      researchArea: challengeForm.researchArea,
      budget: Number(challengeForm.budget || 0),
      deadline: challengeForm.deadline || "",
      companyId: user.uid,
      companyName: userData?.companyName || "Бизнес Партнер",
      representativeName: userData?.name || user.email,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "business_challenges"), challengeData);
    setMyChallenges(prev => [...prev, { id: docRef.id, ...challengeData }]);
    setShowChallengeForm(false);
    setChallengeForm({
      title: "", description: "", researchArea: "Machine Learning", budget: "", deadline: ""
    });
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("Удалить этот технологический запрос?")) return;
    await deleteDoc(doc(db, "business_challenges", id));
    setMyChallenges(prev => prev.filter(c => c.id !== id));
  };

  const handleProposeCooperation = async (proj) => {
    if (!proposalText.trim()) return alert("Введите текст предложения");
    const user = auth.currentUser;

    const coopData = {
      studentId: user.uid,
      studentName: `${userData?.companyName || "Инвестор"} (${userData?.name || user.email})`,
      studentEmail: user.email,
      labId: proj.id,
      labName: proj.name,
      professorId: proj.professorId,
      motivation: proposalText,
      status: "pending", // starts as pending, researcher accepts to start chat
      isInvestorProposal: true,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "applications"), coopData);
    setMyCooperations(prev => [...prev, { id: docRef.id, ...coopData }]);
    setProposingTo(null);
    setProposalText("");

    alert("Предложение отправлено автору проекта!");
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const user = auth.currentUser;
    const textToSend = chatMessage;
    setChatMessage("");

    await addDoc(collection(db, "chats", appId, "messages"), {
      text: textToSend,
      senderId: user.uid,
      senderName: userData?.companyName || "Инвестор",
      senderRole: "business",
      createdAt: serverTimestamp(),
    });
  };

  const initials = userData?.companyName?.slice(0, 2).toUpperCase() || "BI";

  const chatApps = myCooperations.filter(c => c.status === "accepted" || c.status === "interview");
  const activeChatApp = chatApps.find(a => a.id === activeChatId);

  const statusLabel = s => ({ pending: "На рассмотрении у авторов", accepted: "Связь установлена ✓", rejected: "Отклонено", interview: "🎯 Назначена встреча" }[s] || s);
  const statusClass = s => ({ pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected", interview: "status-interview" }[s] || "");

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="dash-sidebar">
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
            ["commercial-projects", "📈 Рынок разработок", commercialProjects.length],
            ["my-challenges", "🎯 Запросы бизнеса (R&D)", myChallenges.length],
            ["cooperations", "📥 Мои предложения", myCooperations.length],
            ["chat", "💬 Переговоры", chatApps.length],
            ["profile", "👤 Профиль", 0],
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

        {/* Tab 1: Commercial Projects Marketplace */}
        {activeTab === "commercial-projects" && (
          <div className="dash-content">
            <h1>Рынок прикладных разработок</h1>
            <p className="dash-subtitle">Научные проекты и продукты с коммерческим потенциалом в Казахстане</p>

            {commercialProjects.length === 0 && <div className="empty-state"><Landmark size={32} />Прикладных проектов пока нет.</div>}

            <div className="labs-grid">
              {commercialProjects.map(proj => {
                const coop = myCooperations.find(c => c.labId === proj.id);
                return (
                  <div className="lab-card" key={proj.id} style={{ borderLeft: "4px solid var(--status-pending)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3>{proj.name}</h3>
                      <span className="tag" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)" }}>$ {proj.fundingNeeded?.toLocaleString() || "Финансирование"}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--primary-light)", margin: "4px 0" }}>
                      👨‍🔬 Автор: {proj.professorName} {proj.isIndependent ? "(Независимый)" : `(${proj.university || "Лаборатория"})`}
                    </p>
                    <p className="lab-desc">{proj.description}</p>
                    
                    <div style={{ background: "var(--input-bg)", padding: 12, borderRadius: 8, margin: "12px 0", fontSize: 13 }}>
                      <p style={{ margin: "4px 0" }}>🛠 <strong>Статус прототипа:</strong> {proj.prototypeStatus || "В разработке"}</p>
                      <p style={{ margin: "4px 0" }}>📊 <strong>Рыночный потенциал:</strong> {proj.marketPotential || "Ожидает оценки"}</p>
                    </div>

                    <div className="lab-tags">
                      {proj.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}
                    </div>

                    <div className="lab-footer" style={{ marginTop: 15 }}>
                      <span>Мест / Доля: договорная</span>
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
          </div>
        )}

        {/* Tab 2: My Challenges (R&D queries) */}
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
                    <label>Название проблемы / Тема</label>
                    <input type="text" placeholder="Пример: Оптимизация маршрутов логистики с помощью ИИ" value={challengeForm.title} onChange={e => setChallengeForm({...challengeForm, title: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Подробное описание задачи (Что нужно сделать, какие данные есть)</label>
                    <textarea placeholder="Опишите требования, условия тестирования..." value={challengeForm.description} onChange={e => setChallengeForm({...challengeForm, description: e.target.value})} rows={4} />
                  </div>
                  <div className="field-group">
                    <label>Научная область</label>
                    <select value={challengeForm.researchArea} onChange={e => setChallengeForm({...challengeForm, researchArea: e.target.value})}>
                      {RESEARCH_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Бюджет на R&D ($)</label>
                    <input type="number" placeholder="Пример: 20000" value={challengeForm.budget} onChange={e => setChallengeForm({...challengeForm, budget: e.target.value})} />
                  </div>
                  <div className="field-group">
                    <label>Сроки (Срок подачи предложений)</label>
                    <input type="text" placeholder="Пример: До конца 2026 года" value={challengeForm.deadline} onChange={e => setChallengeForm({...challengeForm, deadline: e.target.value})} />
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
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: 11, background: "var(--status-rejected-bg)", color: "var(--status-rejected)" }} onClick={() => handleDeleteChallenge(ch.id)}>Удалить</button>
                  </div>
                  <p className="lab-desc">{ch.description}</p>
                  <div style={{ background: "var(--input-bg)", padding: 10, borderRadius: 8, margin: "10px 0", fontSize: 12 }}>
                    <p style={{ margin: "2px 0" }}>💰 <strong>Грант / Бюджет:</strong> ${ch.budget}</p>
                    <p style={{ margin: "2px 0" }}>⏳ <strong>Дедлайн:</strong> {ch.deadline || "Не ограничен"}</p>
                  </div>
                  <div className="lab-tags">
                    <span className="tag">{ch.researchArea}</span>
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
                    <h3>{coop.labName}</h3>
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

        {/* Tab 4: Chats & Negotiations */}
        {activeTab === "chat" && (
          <div className="dash-content chat-tab-container" style={{ height: "calc(100vh - 120px)" }}>
            <h1>Переговоры</h1>
            <div className="chat-window-layout" style={{ display: "flex", height: "90%", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", background: "var(--dash-sidebar)" }}>
              {/* Chat sidebar */}
              <div className="chat-list-sidebar" style={{ width: 250, borderRight: "1px solid var(--border-color)" }}>
                {chatApps.length === 0 ? (
                  <p style={{ padding: 15, fontSize: 12, color: "var(--text-muted)" }}>Нет активных переписок. Связь открывается после одобрения предложения автором проекта.</p>
                ) : (
                  chatApps.map(app => (
                    <div key={app.id} className={`chat-item-node ${activeChatId === app.id ? "active-node" : ""}`} onClick={() => setActiveChatId(app.id)} style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid var(--border-color)", background: activeChatId === app.id ? "var(--primary-glow)" : "transparent" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{app.labName}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "var(--text-muted)" }}>Автор: {app.studentName === userData?.companyName ? "Сделка" : app.studentName}</p>
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
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Диалог по сделке</p>
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
              <h2>{userData?.companyName}</h2>
              <p style={{ color: "var(--status-pending)" }}>Бизнес-партнер / Инвестор</p>
              <p><strong>Представитель:</strong> {userData?.name}</p>
              <p><strong>Email:</strong> {userData?.email}</p>
              <p><strong>Индустрия:</strong> {userData?.position}</p>
              <p><strong>О компании и целях:</strong></p>
              <p style={{ background: "var(--input-bg)", padding: 12, borderRadius: 8 }}>{userData?.description}</p>
            </div>
          </div>
        )}

      </main>

      {/* Propose Modal */}
      {proposingTo && (
        <div className="lightbox-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", zIndex: 100 }}>
          <div className="lab-card" style={{ width: "500px", padding: 24 }}>
            <h2>Предложение сотрудничества / инвестиций</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Проект: {proposingTo.name}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 15 }}>
              <div className="field-group">
                <label>Опишите ваше предложение (Формат сотрудничества, бюджет, контакты)</label>
                <textarea
                  value={proposalText}
                  onChange={e => setProposalText(e.target.value)}
                  placeholder="Пример: Добрый день, нас очень заинтересовала ваша разработка. Готовы обсудить пилотное внедрение на базе нашей компании и инвестиции в размере $20,000..."
                  rows={5}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button className="btn-apply" onClick={() => handleProposeCooperation(proposingTo)}>Отправить предложение</button>
                <button className="btn-secondary" onClick={() => { setProposingTo(null); setProposalText(""); }}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
