import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

const INDUSTRIES = [
  "IT & AI", "Биотехнологии & Медицина", "Энергетика & Зеленые технологии",
  "Материаловедение & Нанотехнологии", "Робототехника & Дроны", "Финтех & Блокчейн",
  "Агротехнологии", "Космические технологии",
];

export default function RegisterBusiness() {
  const [form, setForm] = useState({
    companyName: "", name: "", email: "", password: "",
    position: "", description: "", industry: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const toggleIndustry = (ind) => {
    setForm((prev) => ({
      ...prev,
      industry: prev.industry.includes(ind)
        ? prev.industry.filter((i) => i !== ind)
        : [...prev.industry, ind],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", user.uid), {
        role: "business",
        companyName: form.companyName,
        name: form.name,
        email: form.email,
        position: form.position,
        description: form.description,
        industry: form.industry,
        createdAt: new Date(),
      });
      navigate("/dashboardBusiness");
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

        <div className="role-badge business" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending)", border: "1px solid var(--status-pending)" }}>
          Бизнес / Инвестор
        </div>
        <h1 className="auth-title">Создай бизнес-профиль</h1>
        <p className="auth-subtitle">Находите прикладные научные проекты и инвестируйте в инновации</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="fields-row">
            <div className="field-group">
              <label>Название компании / Фонда</label>
              <input value={form.companyName} onChange={update("companyName")} placeholder="KazTech Ventures" required />
            </div>
            <div className="field-group">
              <label>Индустрия / Направление</label>
              <input value={form.position} onChange={update("position")} placeholder="Инвестиционный директор / Директор по инновациям" required />
            </div>
          </div>

          <div className="fields-row">
            <div className="field-group">
              <label>ФИО представителя</label>
              <input value={form.name} onChange={update("name")} placeholder="Арман Сериков" required />
            </div>
            <div className="field-group">
              <label>Рабочий Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="a.serikov@kaztech.kz" required />
            </div>
          </div>

          <div className="field-group">
            <label>Описание компании и целей поиска</label>
            <textarea
              value={form.description}
              onChange={update("description")}
              placeholder="Какого рода проекты, прототипы или команды вы ищете? Какую поддержку готовы предложить (инвестиции, гранты, менторство)..."
              rows={3}
              required
            />
          </div>

          <div className="field-group">
            <label>Интересующие сферы <span className="optional">(выберите несколько)</span></label>
            <div className="chips">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  className={`chip ${form.industry.includes(ind) ? "active" : ""}`}
                  onClick={() => toggleIndustry(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={update("password")} placeholder="Минимум 6 символов" required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" style={{ background: "var(--status-pending)" }} disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <div className="auth-links">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
          <p>Вы независимый ученый? <Link to="/register/independent">Регистрация для соавторства</Link></p>
        </div>
      </div>
    </div>
  );
}
