import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, updateDoc, serverTimestamp, deleteDoc, setDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const RESEARCH_AREAS = [
  "Machine Learning", "Data Science", "Robotics", "NLP", "Computer Vision",
  "Cybersecurity", "Bioinformatics", "HCI", "Networks", "Algorithms",
  "Биоинформатика", "Материаловедение", "Нейронауки", "Физика", "Химия"
];

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
  const [labForm, setLabForm] = useState({
    name: "", description: "", researchAreas: [], openSpots: 3,
    requirements: "", responsibilities: "", benefits: "", papers: ""
  });
  const [profileForm, setProfileForm] = useState({
    name: "", university: "", department: "", position: "",
    bio: "", website: "", googleScholar: "", linkedin: "",
    researchgate: "", achievements: "", papers: ""
  });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;
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
      const labSnap = await getDocs(query(collection(db, "labs"), where("professorId", "==", user.uid)));
      if (!labSnap.empty) {
        const labData = { id: labSnap.docs[0].id, ...labSnap.docs[0].data() };
        setLab(labData);
        const appsSnap = await getDocs(query(collection(db, "applications"), where("labId", "==", labData.id)));
        const apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setApplications(apps);

        // Load chats for accepted/interview apps
        const chatData = {};
        for (const app of apps) {
          if (app.status === "accepted" || app.status === "interview") {
            const msgSnap = await getDocs(
              query(collection(db, "chats", app.id, "messages"))
            );
            chatData[app.id] = msgSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
          }
        }
        setChats(chatData);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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
    } catch (err) {
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
    if (status === "accepted" || status === "interview") {
      setChats(prev => ({ ...prev, [appId]: prev[appId] || [] }));
    }
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const user = auth.currentUser;
    await addDoc(collection(db, "chats", appId, "messages"), {
      text: chatMessage,
      senderId: user.uid,
      senderName: userData?.name || "Профессор",
      senderRole: "professor",
      createdAt: serverTimestamp(),
    });
    setChats(prev => ({
      ...prev,
      [appId]: [...(prev[appId] || []), {
        text: chatMessage,
        senderRole: "professor",
        senderName: userData?.name || "Профессор",
        createdAt: { seconds: Date.now() / 1000 }
      }]
    }));
    setChatMessage("");
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

  const pending = applications.filter(a => a.status === "pending");
  const interview = applications.filter(a => a.status === "interview");
  const accepted = applications.filter(a => a.status === "accepted");
  const rejected = applications.filter(a => a.status === "rejected");
  const chatApps = applications.filter(a => a.status === "accepted" || a.status === "interview");

  if (loading) return <div className="dash-loading">Загрузка...</div>;

  const initials = userData?.name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "P";

  return (
    <div className="dashboard">
      <aside className="dash-sidebar">
        <div className="dash-logo">inspirosk</div>
        <div className="dash-user">
          <div className="dash-avatar" style={userData?.avatarUrl ? {padding:0,overflow:"hidden"} : {}}>
            {userData?.avatarUrl
              ? <img src={userData.avatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : initials}
          </div>
          <div>
            <div className="dash-username">{userData?.name || "Профессор"}</div>
            <div className="dash-role">Профессор</div>
          </div>
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
        <button className="dash-logout" onClick={() => { signOut(auth); navigate("/login"); }}>Выйти</button>
      </aside>

      <main className="dash-main">

        {/* ── ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Входящие заявки</h1>
            {!lab && <div className="empty-state">Сначала создай лабораторию во вкладке «Лаборатория».</div>}
            {pending.length === 0 && lab && <div className="empty-state">Новых заявок нет.</div>}
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
                    <p className="app-date">{app.createdAt?.toDate?.().toLocaleDateString("ru")}</p>
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
            {interview.length === 0
              ? <div className="empty-state">Никого на стадии интервью.</div>
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
            {accepted.length === 0
              ? <div className="empty-state">Пока нет принятых студентов.</div>
              : <div className="students-grid">
                  {accepted.map(app => (
                    <div className="student-card" key={app.id}>
                      <div className="student-avatar">{app.studentName?.[0] || "S"}</div>
                      <h3>{app.studentName}</h3>
                      <p>{app.studentEmail}</p>
                      <span className="status-badge status-accepted">В лаборатории</span>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── ЧАТ ── */}
        {activeTab === "chat" && (
          <div className="dash-content">
            <h1>Чат</h1>
            {chatApps.length === 0
              ? <div className="empty-state">Чат доступен после принятия студента или отправки на интервью.</div>
              : <div className="chat-layout">
                  <div className="chat-list">
                    {chatApps.map(app => (
                      <div
                        key={app.id}
                        className={`chat-person ${activeChatId === app.id ? "active" : ""}`}
                        onClick={() => setActiveChatId(app.id)}
                      >
                        <div className="student-avatar" style={{width:36,height:36,fontSize:14}}>{app.studentName?.[0]}</div>
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>{app.studentName}</div>
                          <div style={{fontSize:12,color:"#888"}}>{app.status === "interview" ? "🎯 Интервью" : "✓ Принят"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="chat-window">
                    {!activeChatId
                      ? <div className="empty-state">Выбери студента слева</div>
                      : <>
                          <div className="chat-messages">
                            {(chats[activeChatId] || []).map((msg, i) => (
                              <div key={i} className={`chat-bubble ${msg.senderRole === "professor" ? "mine" : "theirs"}`}>
                                <span>{msg.text}</span>
                              </div>
                            ))}
                          </div>
                          <div className="chat-input-row">
                            <input
                              value={chatMessage}
                              onChange={e => setChatMessage(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleSendMessage(activeChatId)}
                              placeholder="Написать сообщение..."
                            />
                            <button className="btn-apply" onClick={() => handleSendMessage(activeChatId)}>Отправить</button>
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
            {lab ? (
              <div className="profile-card" style={{flexDirection:"column",gap:16}}>
                <div className="profile-row"><span>Название:</span> {lab.name}</div>
                <div className="profile-row"><span>Описание:</span> {lab.description}</div>
                <div className="profile-row"><span>Требования:</span> {lab.requirements || "—"}</div>
                <div className="profile-row"><span>Обязанности:</span> {lab.responsibilities || "—"}</div>
                <div className="profile-row"><span>Что получит студент:</span> {lab.benefits || "—"}</div>
                <div className="profile-row">
                  <span>Направления:</span>
                  <div className="lab-tags">{lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                </div>
                <div className="profile-row"><span>Мест:</span> {lab.openSpots}</div>
                {lab.papers && <div className="profile-row"><span>Публикации:</span> {lab.papers}</div>}
              </div>
            ) : (
              <div>
                <div className="empty-state">У вас ещё нет лаборатории.</div>
                <button className="btn-apply" style={{marginTop:16}} onClick={() => setShowLabForm(true)}>+ Создать лабораторию</button>
              </div>
            )}
          </div>
        )}

        {/* ── ПРОФИЛЬ ── */}
        {activeTab === "profile" && (
          <div className="dash-content">
            <h1>Мой профиль</h1>
            <div className="profile-card" style={{flexDirection:"column",alignItems:"flex-start",gap:20}}>
              {/* Аватар */}
              <div style={{display:"flex",alignItems:"center",gap:20}}>
                <div className="profile-avatar" style={userData?.avatarUrl ? {padding:0,overflow:"hidden",width:80,height:80} : {width:80,height:80,fontSize:32}}>
                  {userData?.avatarUrl
                    ? <img src={userData.avatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : initials}
                </div>
                <div>
                  <button className="btn-secondary" onClick={() => fileInputRef.current.click()} disabled={avatarUploading}>
                    {avatarUploading ? "Загрузка..." : "📷 Сменить фото"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarUpload}/>
                  <p style={{fontSize:12,color:"#aaa",marginTop:6}}>JPG, PNG до 2МБ</p>
                </div>
              </div>

              {editingProfile ? (
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    ["name","Имя","Ваше имя"],
                    ["university","Университет","Назарбаев Университет"],
                    ["department","Кафедра","School of Engineering"],
                    ["position","Должность","Professor"],
                    ["website","Сайт","https://yoursite.com"],
                    ["googleScholar","Google Scholar","ссылка"],
                    ["linkedin","LinkedIn","ссылка"],
                    ["researchgate","ResearchGate","ссылка"],
                  ].map(([field, label, ph]) => (
                    <div className="profile-edit-row" key={field}>
                      <label>{label}</label>
                      <input value={profileForm[field]} onChange={e => setProfileForm(p=>({...p,[field]:e.target.value}))} placeholder={ph}/>
                    </div>
                  ))}
                  <div className="profile-edit-row">
                    <label>О себе</label>
                    <textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(p=>({...p,bio:e.target.value}))} placeholder="Кратко о ваших исследованиях и интересах..."/>
                  </div>
                  <div className="profile-edit-row">
                    <label>Достижения</label>
                    <textarea rows={3} value={profileForm.achievements} onChange={e => setProfileForm(p=>({...p,achievements:e.target.value}))} placeholder="Гранты, награды, публикации..."/>
                  </div>
                  <div className="profile-edit-row">
                    <label>Исследовательские работы (ссылки)</label>
                    <textarea rows={2} value={profileForm.papers} onChange={e => setProfileForm(p=>({...p,papers:e.target.value}))} placeholder="https://doi.org/..."/>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:8}}>
                    <button className="btn-apply" onClick={handleSaveProfile}>Сохранить</button>
                    <button className="btn-secondary" onClick={() => setEditingProfile(false)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{width:"100%"}}>
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
                    <div className="profile-row" key={label}><span>{label}:</span> {val}</div>
                  ) : null)}
                  <button className="btn-apply" style={{marginTop:16}} onClick={() => setEditingProfile(true)}>✏️ Редактировать профиль</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ПОДДЕРЖКА ── */}
        {activeTab === "support" && (
          <div className="dash-content">
            <h1>Поддержка и отзывы</h1>
            <p className="dash-subtitle">Напиши нам — что работает не так или что можно улучшить</p>
            {feedbackSent
              ? <div className="empty-state" style={{borderColor:"#27ae60",color:"#27ae60"}}>✓ Спасибо за отзыв! Мы всё прочитаем.</div>
              : <div style={{background:"white",borderRadius:14,padding:28,maxWidth:560,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <textarea
                    style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e0e0e0",borderRadius:10,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}
                    rows={6}
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Опиши проблему или предложение..."
                  />
                  <button className="btn-apply" style={{marginTop:12}} onClick={handleSendFeedback}>Отправить</button>
                </div>
            }
          </div>
        )}
      </main>

      {/* ── Модалка создания лабы ── */}
      {showLabForm && (
        <div className="modal-overlay" onClick={() => setShowLabForm(false)}>
          <div className="modal" style={{maxWidth:560,maxHeight:"90vh",overflowY:"auto"}} onClick={e => e.stopPropagation()}>
            <h2>Создать лабораторию</h2>
            {[
              ["name","Название лаборатории","AI & Robotics Lab"],
              ["description","Описание исследований","Чем занимается лаборатория..."],
              ["requirements","Требования к студентам","Знание Python, опыт в ML..."],
              ["responsibilities","Обязанности студента","Участие в экспериментах, написание кода..."],
              ["benefits","Что получит студент","Опыт, публикация, рекомендательное письмо..."],
              ["papers","Ссылки на публикации","https://doi.org/..."],
            ].map(([field, ph, hint]) => (
              <div key={field}>
                <label style={{fontSize:13,color:"#666",fontWeight:600}}>{ph}</label>
                <textarea rows={2} style={{width:"100%",marginTop:4,padding:"8px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontFamily:"inherit",fontSize:14,resize:"vertical",outline:"none",boxSizing:"border-box"}}
                  value={labForm[field]}
                  onChange={e => setLabForm({...labForm,[field]:e.target.value})}
                  placeholder={hint}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:13,color:"#666",fontWeight:600}}>Направления исследований</label>
              <div className="lab-tags" style={{marginTop:8,gap:8}}>
                {RESEARCH_AREAS.map(area => (
                  <span
                    key={area}
                    className={`tag ${labForm.researchAreas.includes(area) ? "tag-match" : ""}`}
                    style={{cursor:"pointer",padding:"5px 12px"}}
                    onClick={() => setLabForm(prev => ({
                      ...prev,
                      researchAreas: prev.researchAreas.includes(area)
                        ? prev.researchAreas.filter(a => a !== area)
                        : [...prev.researchAreas, area]
                    }))}
                  >{area}</span>
                ))}
              </div>
            </div>
            <input type="number" placeholder="Количество мест"
              style={{padding:"8px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:14,width:"100%",boxSizing:"border-box"}}
              value={labForm.openSpots}
              onChange={e => setLabForm({...labForm,openSpots:e.target.value})}/>
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