import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase.js";
import { signOut } from "firebase/auth";
import {
  doc, getDoc, collection, getDocs, query, where,
  addDoc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

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
  const [profileForm, setProfileForm] = useState({
    name: "", university: "", degree: "", year: "",
    bio: "", github: "", linkedin: "", telegram: "",
    skills: "", languages: "", achievements: "", interests: []
  });
  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const navigate = useNavigate();

  const RESEARCH_AREAS = [
    "Machine Learning", "Биоинформатика", "Материаловедение",
    "Нейронауки", "Физика", "Химия", "Робототехника", "Data Science",
  ];

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
      const labsSnap = await getDocs(collection(db, "labs"));
      setLabs(labsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const appsSnap = await getDocs(query(collection(db, "applications"), where("studentId", "==", user.uid)));
      const apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyApplications(apps);

      const chatData = {};
      for (const app of apps) {
        if (app.status === "accepted" || app.status === "interview") {
          const msgSnap = await getDocs(query(collection(db, "chats", app.id, "messages")));
          chatData[app.id] = msgSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
        }
      }
      setChats(chatData);
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
    const appsSnap = await getDocs(query(collection(db, "applications"), where("studentId", "==", user.uid)));
    setMyApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSendMessage = async (appId) => {
    if (!chatMessage.trim()) return;
    const user = auth.currentUser;
    await addDoc(collection(db, "chats", appId, "messages"), {
      text: chatMessage,
      senderId: user.uid,
      senderName: userData?.name || "Студент",
      senderRole: "student",
      createdAt: serverTimestamp(),
    });
    setChats(prev => ({
      ...prev,
      [appId]: [...(prev[appId] || []), {
        text: chatMessage,
        senderRole: "student",
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
      userRole: "student",
      userName: userData?.name || "",
      createdAt: serverTimestamp(),
    });
    setFeedbackText("");
    setFeedbackSent(true);
  };

  const statusLabel = s => ({ pending: "На рассмотрении", accepted: "Принят ✓", rejected: "Отклонено", interview: "🎯 Интервью" }[s] || s);
  const statusClass = s => ({ pending: "status-pending", accepted: "status-accepted", rejected: "status-rejected", interview: "status-interview" }[s] || "");

  const myInterests = userData?.interests || [];
  const recommendedLabs = labs.filter(l => l.researchAreas?.some(a => myInterests.includes(a)));
  const appliedLabIds = myApplications.map(a => a.labId);
  const chatApps = myApplications.filter(a => a.status === "accepted" || a.status === "interview");
  const initials = userData?.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "S";

  if (loading) return <div className="dash-loading">Загрузка...</div>;

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
            <div className="dash-username">{userData?.name || "Студент"}</div>
            <div className="dash-role">Студент</div>
          </div>
        </div>
        <nav className="dash-nav">
          {[
            ["discover","🔍 Лаборатории", 0],
            ["recommended","⭐ Рекомендации", recommendedLabs.length],
            ["applications","📋 Мои заявки", myApplications.length],
            ["chat","💬 Чат", chatApps.length],
            ["profile","👤 Профиль", 0],
            ["support","🛠 Поддержка", 0],
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

        {/* ── ЛАБОРАТОРИИ ── */}
        {activeTab === "discover" && (
          <div className="dash-content">
            <h1>Все лаборатории</h1>
            {labs.length === 0 && <div className="empty-state">Пока нет лабораторий. Подожди, пока профессора зарегистрируются.</div>}
            <div className="labs-grid">
              {labs.map(lab => (
                <div className="lab-card" key={lab.id}>
                  <h3>{lab.name}</h3>
                  <p className="lab-professor">👨‍🔬 {lab.professorName}</p>
                  <p className="lab-desc">{lab.description}</p>
                  {lab.requirements && <p style={{fontSize:12,color:"#888",margin:0}}>📋 {lab.requirements}</p>}
                  <div className="lab-tags">{lab.researchAreas?.map(a => <span key={a} className="tag">{a}</span>)}</div>
                  <div className="lab-footer">
                    <span className="lab-spots">Мест: {lab.openSpots || "?"}</span>
                    {appliedLabIds.includes(lab.id)
                      ? <span className="status-badge status-pending">Заявка подана</span>
                      : <button className="btn-apply" onClick={() => setApplyingTo(lab)}>Подать заявку</button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── РЕКОМЕНДАЦИИ ── */}
        {activeTab === "recommended" && (
          <div className="dash-content">
            <h1>Рекомендовано для вас</h1>
            <p className="dash-subtitle">На основе интересов: {myInterests.join(", ") || "не указаны"}</p>
            {recommendedLabs.length === 0
              ? <div className="empty-state">Нет совпадений. Обнови интересы в профиле.</div>
              : <div className="labs-grid">
                  {recommendedLabs.map(lab => (
                    <div className="lab-card highlight" key={lab.id}>
                      <h3>{lab.name}</h3>
                      <p className="lab-professor">👨‍🔬 {lab.professorName}</p>
                      <p className="lab-desc">{lab.description}</p>
                      <div className="lab-tags">
                        {lab.researchAreas?.map(a => (
                          <span key={a} className={`tag ${myInterests.includes(a) ? "tag-match" : ""}`}>{a}</span>
                        ))}
                      </div>
                      {appliedLabIds.includes(lab.id)
                        ? <span className="status-badge status-pending">Заявка подана</span>
                        : <button className="btn-apply" onClick={() => setApplyingTo(lab)}>Подать заявку</button>
                      }
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── ЗАЯВКИ ── */}
        {activeTab === "applications" && (
          <div className="dash-content">
            <h1>Мои заявки</h1>
            {myApplications.length === 0
              ? <div className="empty-state">Вы ещё не подавали заявки.</div>
              : <div className="applications-list">
                  {myApplications.map(app => (
                    <div className="app-card" key={app.id}>
                      <div className="app-info">
                        <h3>{app.labName}</h3>
                        <p className="app-date">{app.createdAt?.toDate?.().toLocaleDateString("ru")}</p>
                      </div>
                      <span className={`status-badge ${statusClass(app.status)}`}>{statusLabel(app.status)}</span>
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
              ? <div className="empty-state">Чат откроется после того, как профессор примет заявку или пригласит на интервью.</div>
              : <div className="chat-layout">
                  <div className="chat-list">
                    {chatApps.map(app => (
                      <div key={app.id} className={`chat-person ${activeChatId === app.id ? "active" : ""}`} onClick={() => setActiveChatId(app.id)}>
                        <div className="student-avatar" style={{width:36,height:36,fontSize:14,background:"#7c6df0"}}>{app.labName?.[0]}</div>
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>{app.labName}</div>
                          <div style={{fontSize:12,color:"#888"}}>{app.status === "interview" ? "🎯 Интервью" : "✓ Принят"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="chat-window">
                    {!activeChatId
                      ? <div className="empty-state">Выбери чат слева</div>
                      : <>
                          <div className="chat-messages">
                            {(chats[activeChatId] || []).map((msg, i) => (
                              <div key={i} className={`chat-bubble ${msg.senderRole === "student" ? "mine" : "theirs"}`}>
                                <span>{msg.text}</span>
                              </div>
                            ))}
                          </div>
                          <div className="chat-input-row">
                            <input value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleSendMessage(activeChatId)}
                              placeholder="Написать сообщение..."/>
                            <button className="btn-apply" onClick={() => handleSendMessage(activeChatId)}>Отправить</button>
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
            <div className="profile-card" style={{flexDirection:"column",alignItems:"flex-start",gap:20}}>
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
                </div>
              </div>

              {editingProfile ? (
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    ["name","Имя"],["university","Университет"],
                    ["github","GitHub"],["linkedin","LinkedIn"],["telegram","Telegram"],
                    ["skills","Навыки (через запятую)"],
                    ["languages","Языки"],["achievements","Достижения"],
                  ].map(([field, label]) => (
                    <div className="profile-edit-row" key={field}>
                      <label>{label}</label>
                      <input value={profileForm[field]} onChange={e => setProfileForm(p=>({...p,[field]:e.target.value}))} />
                    </div>
                  ))}
                  <div className="profile-edit-row">
                    <label>О себе</label>
                    <textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(p=>({...p,bio:e.target.value}))} placeholder="Кратко о себе..."/>
                  </div>
                  <div className="profile-edit-row">
                    <label>Интересы</label>
                    <div className="lab-tags" style={{marginTop:6}}>
                      {RESEARCH_AREAS.map(area => (
                        <span key={area} className={`tag ${profileForm.interests.includes(area) ? "tag-match" : ""}`}
                          style={{cursor:"pointer",padding:"5px 12px"}} onClick={() => toggleInterest(area)}>{area}</span>
                      ))}
                    </div>
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
                    <div className="profile-row" key={label}><span>{label}:</span> {val}</div>
                  ) : null)}
                  {(userData?.interests || []).length > 0 && (
                    <div className="profile-row">
                      <span>Интересы:</span>
                      <div className="lab-tags" style={{marginTop:4}}>
                        {userData.interests.map(i => <span key={i} className="tag">{i}</span>)}
                      </div>
                    </div>
                  )}
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
              ? <div className="empty-state" style={{borderColor:"#27ae60",color:"#27ae60"}}>✓ Спасибо за отзыв!</div>
              : <div style={{background:"white",borderRadius:14,padding:28,maxWidth:560,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <textarea style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e0e0e0",borderRadius:10,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}
                    rows={6} value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Опиши проблему или предложение..."/>
                  <button className="btn-apply" style={{marginTop:12}} onClick={handleSendFeedback}>Отправить</button>
                </div>
            }
          </div>
        )}
      </main>

      {/* ── Модалка заявки ── */}
      {applyingTo && (
        <div className="modal-overlay" onClick={() => setApplyingTo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Заявка в «{applyingTo.name}»</h2>
            <p>Расскажи, почему хочешь попасть именно в эту лабораторию:</p>
            <textarea value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Мотивационное письмо..." rows={5}/>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:"#555",display:"block",marginBottom:6}}>📄 Прикрепи CV (PDF, необязательно)</label>
              <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e => setCvFile(e.target.files[0])}/>
              <button className="btn-secondary" onClick={() => cvInputRef.current.click()}>
                {cvFile ? `✓ ${cvFile.name}` : "Выбрать файл"}
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setApplyingTo(null)}>Отмена</button>
              <button className="btn-apply" onClick={() => handleApply(applyingTo)} disabled={cvUploading}>
                {cvUploading ? "Отправка..." : "Отправить заявку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}