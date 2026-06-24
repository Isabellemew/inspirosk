import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

const RESEARCH_AREAS = [
  "Machine Learning", "Биоинформатика", "Материаловедение",
  "Нейронауки", "Физика", "Химия", "Робототехника", "Data Science",
];

export default function RegisterIndependent() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", bio: "",
    github: "", linkedin: "", interests: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const toggleInterest = (area) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(area)
        ? prev.interests.filter((i) => i !== area)
        : [...prev.interests, area],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", user.uid), {
        role: "independent",
        name: form.name,
        email: form.email,
        bio: form.bio,
        github: form.github,
        linkedin: form.linkedin,
        interests: form.interests,
        createdAt: new Date(),
      });
      navigate("/dashboardIndependent");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Этот email уже зарегистрирован");
      } else if (err.code === "auth/weak-password") {
        setError("Пароль должен быть не менее 6 символов");
      } else {
        setError("Ошибка регистрации. Попробуй ещё раз.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <div className="auth-logo">
          <span className="logo-text">inspirosk</span>
        </div>

        <div className="role-badge independent" style={{ background: "var(--status-interview-bg)", color: "var(--status-interview)", border: "1px solid var(--status-interview)" }}>
          Независимый исследователь
        </div>
        <h1 className="auth-title">Создай независимый профиль</h1>
        <p className="auth-subtitle">Публикуй свои идеи и находи соавторов без ограничений</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="fields-row">
            <div className="field-group">
              <label>Полное имя</label>
              <input value={form.name} onChange={update("name")} placeholder="Иван Иванов" required />
            </div>
            <div className="field-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="ivan@example.com" required />
            </div>
          </div>

          <div className="field-group">
            <label>О себе / Научные интересы</label>
            <textarea
              value={form.bio}
              onChange={update("bio")}
              placeholder="Расскажите о вашем опыте, идеях и кого вы ищете..."
              rows={3}
              required
            />
          </div>

          <div className="fields-row">
            <div className="field-group">
              <label>GitHub (необязательно)</label>
              <input value={form.github} onChange={update("github")} placeholder="https://github.com/..." />
            </div>
            <div className="field-group">
              <label>LinkedIn (необязательно)</label>
              <input value={form.linkedin} onChange={update("linkedin")} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>

          <div className="field-group">
            <label>Области исследований <span className="optional">(выберите несколько)</span></label>
            <div className="chips">
              {RESEARCH_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  className={`chip ${form.interests.includes(area) ? "active" : ""}`}
                  onClick={() => toggleInterest(area)}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={update("password")} placeholder="Минимум 6 символов" required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" style={{ background: "var(--primary)" }} disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <div className="auth-links">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
          <p>Вы компания или инвестор? <Link to="/register/business">Регистрация для бизнеса</Link></p>
        </div>
      </div>
    </div>
  );
}
