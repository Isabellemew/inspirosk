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

export default function RegisterStudent() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", university: "",
    degree: "bachelor", year: "1", interests: [],
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
        role: "student",
        name: form.name,
        email: form.email,
        university: form.university,
        degree: form.degree,
        year: form.year,
        interests: form.interests,
        createdAt: new Date(),
      });
      navigate("/dashboardStudent");
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

        <div className="role-badge student">Студент</div>
        <h1 className="auth-title">Создай профиль</h1>
        <p className="auth-subtitle">Найди лабораторию, которая подходит именно тебе</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="fields-row">
            <div className="field-group">
              <label>Полное имя</label>
              <input value={form.name} onChange={update("name")} placeholder="Алия Нурланова" required />
            </div>
            <div className="field-group">
              <label>Email университета</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="a.nurlanova@nu.edu.kz" required />
            </div>
          </div>

          <div className="field-group">
            <label>Университет</label>
            <input value={form.university} onChange={update("university")} placeholder="Назарбаев Университет" required />
          </div>

          <div className="fields-row">
            <div className="field-group">
              <label>Степень</label>
              <select value={form.degree} onChange={update("degree")}>
                <option value="bachelor">Бакалавриат</option>
                <option value="master">Магистратура</option>
                <option value="phd">PhD</option>
              </select>
            </div>
            <div className="field-group">
              <label>Курс</label>
              <select value={form.year} onChange={update("year")}>
                {["1","2","3","4"].map((y) => (
                  <option key={y} value={y}>{y} курс</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-group">
            <label>Области интересов <span className="optional">(выбери несколько)</span></label>
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

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться как студент"}
          </button>
        </form>

        <div className="auth-links">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
          <p>Вы профессор? <Link to="/register/professor">Регистрация для лабораторий</Link></p>
        </div>
      </div>
    </div>
  );
}