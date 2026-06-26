import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";
import { supabase } from "../supabaseClient.js";
import { useTranslation } from "../context/TranslationContext";
import AvatarCropper from "../components/AvatarCropper.jsx";
import { Camera } from "lucide-react";

const RESEARCH_AREAS = [
  "Machine Learning", "Биоинформатика", "Материаловедение",
  "Нейронауки", "Физика", "Химия", "Робототехника", "Data Science",
];

export default function RegisterProfessor() {
  const { lang, setLang, t } = useTranslation();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", email: "", password: "", university: "",
    department: "", labName: "", position: "professor",
    researchAreas: [], openPositions: "1", description: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const toggleArea = (area) => {
    setForm((prev) => ({
      ...prev,
      researchAreas: prev.researchAreas.includes(area)
        ? prev.researchAreas.filter((a) => a !== area)
        : [...prev.researchAreas, area],
    }));
  };

  // Real-time password validator
  useEffect(() => {
    if (!form.password) {
      setPasswordError("");
      return;
    }
    const hasLetter = /[a-zA-Zа-яА-Я]/.test(form.password);
    const hasDigit = /[0-9]/.test(form.password);
    const hasMinLength = form.password.length >= 8;

    if (!hasMinLength || !hasLetter || !hasDigit) {
      setPasswordError(t("auth.password_hint"));
    } else {
      setPasswordError("");
    }
  }, [form.password, t]);

  // Generate fallback initials canvas
  const generateInitialsAvatar = (name) => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    
    const hue = (name.length * 53) % 360;
    ctx.fillStyle = `hsl(${hue}, 60%, 45%)`;
    ctx.fillRect(0, 0, 200, 200);

    const parts = name.trim().split(" ");
    let initials = "";
    if (parts.length > 0 && parts[0]) initials += parts[0][0].toUpperCase();
    if (parts.length > 1 && parts[1]) initials += parts[1][0].toUpperCase();
    if (!initials) initials = "P";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 100, 100);

    return canvas.toDataURL("image/png");
  };

  // Check step validation status
  const isStepValid = () => {
    if (step === 1) {
      return (
        form.name.trim() !== "" &&
        form.email.trim() !== "" &&
        form.password.trim() !== "" &&
        passwordError === ""
      );
    }
    if (step === 2) {
      return (
        form.university.trim() !== "" &&
        form.department.trim() !== "" &&
        form.labName.trim() !== "" &&
        form.researchAreas.length > 0 &&
        form.description.trim() !== ""
      );
    }
    return true;
  };

  const handleNext = () => {
    if (isStepValid()) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const finalAvatar = avatarDataUrl || generateInitialsAvatar(form.name);

      const { data: { user }, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authErr) throw authErr;
      
      const { error: dbErr } = await supabase.from("profiles").insert({
        id: user.id,
        role: "professor",
        name: form.name,
        email: form.email,
        university: form.university,
        department: form.department,
        position: form.position,
        avatar_url: finalAvatar,
      });
      if (dbErr) throw dbErr;

      const { error: labErr } = await supabase.from("labs").insert({
        name: form.labName,
        research_areas: form.researchAreas,
        open_spots: form.openPositions === "5+" ? 5 : Number(form.openPositions || 1),
        description: form.description,
        professor_id: user.id,
        professor_name: form.name,
        is_independent: false,
      });
      if (labErr) throw labErr;

      setIsRegistered(true);
    } catch (err) {
      let friendlyError = err.message || "Ошибка регистрации. Попробуй ещё раз.";
      if (err.message && (err.message.toLowerCase().includes("rate limit") || err.message.toLowerCase().includes("exceeded") || err.message.toLowerCase().includes("once every"))) {
        friendlyError = "Вы слишком часто отправляете запросы. Пожалуйста, проверьте вашу почту или попробуйте зарегистрироваться снова через несколько минут.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="auth-page">
        <div className="auth-card wide" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="auth-logo" style={{ marginBottom: 24, justifyContent: "center", display: "flex" }}>
            <span className="logo-text">inspirosk</span>
          </div>
          <div style={{ fontSize: 54, marginBottom: 20 }}>✉️</div>
          <h2 style={{ marginBottom: 16, color: "var(--text-primary)" }}>{t("auth.check_email_title") || "Подтвердите Email"}</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: "1.6", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px auto" }}>
            Мы отправили ссылку для активации аккаунта на адрес <strong>{form.email}</strong>. 
            Пожалуйста, перейдите по ссылке в письме, чтобы подтвердить ваш адрес электронной почты и завершить регистрацию.
          </p>
          <Link to="/login" className="auth-btn" style={{ display: "inline-block", textDecoration: "none", width: "auto", padding: "12px 32px", margin: "0 auto" }}>
            {t("auth.back_to_login") || "Вернуться ко входу"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="auth-logo">
            <span className="logo-text">inspirosk</span>
          </div>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="role-select" style={{ width: "auto", margin: 0, padding: "4px 8px" }}>
            <option value="ru">RU</option>
            <option value="en">EN</option>
            <option value="kk">KK</option>
          </select>
        </div>

        <div className="role-badge professor">Лаборатория / Профессор</div>
        <h1 className="auth-title">{t("register.professor_title")}</h1>

        {/* Step Indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 24px 0", background: "var(--input-bg)", padding: "8px 16px", borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: step === 1 ? "bold" : "normal", color: step === 1 ? "var(--primary)" : "var(--text-muted)" }}>1. {t("auth.step_personal")}</span>
          <span style={{ fontSize: 13, fontWeight: step === 2 ? "bold" : "normal", color: step === 2 ? "var(--primary)" : "var(--text-muted)" }}>2. {t("auth.step_details")}</span>
          <span style={{ fontSize: 13, fontWeight: step === 3 ? "bold" : "normal", color: step === 3 ? "var(--primary)" : "var(--text-muted)" }}>3. {t("auth.step_avatar")}</span>
        </div>

        <div className="auth-form">
          {/* STEP 1: Personal credentials */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field-group">
                <label>{t("register.name")} *</label>
                <input value={form.name} onChange={update("name")} placeholder="Проф. Данияр Сейткали" required />
              </div>
              <div className="field-group">
                <label>{t("register.email")} *</label>
                <input type="email" value={form.email} onChange={update("email")} placeholder="d.seitkali@nu.edu.kz" required />
              </div>
              <div className="field-group">
                <label>Пароль *</label>
                <input type="password" value={form.password} onChange={update("password")} placeholder="••••••••" required />
                {passwordError && <p className="auth-error-inline" style={{ color: "var(--status-rejected)", fontSize: 12, marginTop: 4 }}>{passwordError}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: Lab Details */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="fields-row">
                <div className="field-group">
                  <label>{t("register.university")} *</label>
                  <input value={form.university} onChange={update("university")} placeholder="Назарбаев Университет" required />
                </div>
                <div className="field-group">
                  <label>{t("register.department")} *</label>
                  <input value={form.department} onChange={update("department")} placeholder="School of Engineering" required />
                </div>
              </div>

              <div className="fields-row">
                <div className="field-group">
                  <label>{t("register.lab_name")} *</label>
                  <input value={form.labName} onChange={update("labName")} placeholder="AI & Robotics Lab" required />
                </div>
                <div className="field-group">
                  <label>{t("register.position")} *</label>
                  <select value={form.position} onChange={update("position")}>
                    <option value="professor">Профессор</option>
                    <option value="associate">Ассоциированный профессор</option>
                    <option value="assistant">Ассистент-профессор</option>
                    <option value="researcher">Исследователь</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>{t("register.interests")} *</label>
                <div className="chips">
                  {RESEARCH_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      className={`chip ${form.researchAreas.includes(area) ? "active" : ""}`}
                      onClick={() => toggleArea(area)}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fields-row">
                <div className="field-group">
                  <label>{t("register.open_positions")} *</label>
                  <select value={form.openPositions} onChange={update("openPositions")}>
                    {["1","2","3","4","5+"].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>{t("register.lab_description")} *</label>
                <textarea
                  value={form.description}
                  onChange={update("description")}
                  placeholder="Чем занимается ваша лаборатория, какие проекты ведёте..."
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 3: Avatar Crop */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {avatarDataUrl ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ position: "relative", display: "inline-block", width: 120, height: 120 }}>
                    <img 
                      src={avatarDataUrl} 
                      alt="Avatar Preview" 
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)" }} 
                    />
                    <button 
                      type="button"
                      className="btn-secondary" 
                      style={{ position: "absolute", bottom: 0, right: 0, borderRadius: "50%", padding: 6 }} 
                      onClick={() => setAvatarDataUrl(null)}
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Фото профиля успешно настроено!</p>
                </div>
              ) : (
                <AvatarCropper 
                  onCropComplete={(croppedData) => setAvatarDataUrl(croppedData)} 
                  onCancel={() => setAvatarDataUrl(null)} 
                />
              )}
            </div>
          )}

          {error && <p className="auth-error" style={{ marginTop: 12 }}>{error}</p>}

          {/* Navigation Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 24 }}>
            {step > 1 && (
              <button type="button" className="btn-secondary" onClick={handleBack} style={{ flex: 1 }}>
                {t("common.prev")}
              </button>
            )}
            
            {step < 3 ? (
              <button type="button" className="auth-btn" onClick={handleNext} disabled={!isStepValid()} style={{ flex: 2 }}>
                {t("common.next")}
              </button>
            ) : (
              <button type="button" className="auth-btn" onClick={handleSubmit} disabled={loading} style={{ flex: 2, background: "var(--primary)" }}>
                {loading ? t("common.loading") : t("auth.register")}
              </button>
            )}
          </div>
        </div>

        <div className="auth-links" style={{ marginTop: 20 }}>
          <p>{t("auth.has_account")} <Link to="/login">{t("common.submit")}</Link></p>
          <p>Вы студент? <Link to="/register/student">Регистрация для студентов</Link></p>
        </div>
      </div>
    </div>
  );
}