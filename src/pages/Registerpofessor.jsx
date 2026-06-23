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

export default function RegisterProfessor() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", university: "",
    department: "", labName: "", position: "professor",
    researchAreas: [], openPositions: "1", description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const toggleArea = (area) => {
    setForm((prev) => ({
      ...prev,
      researchAreas: prev.researchAreas.includes(area)
        ? prev.researchAreas.filter((a) => a !== area)
        : [...prev.researchAreas, area],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, "users", user.uid), {
        role: "professor",
        name: form.name,
        email: form.email,
        university: form.university,
        department: form.department,
        labName: form.labName,
        position: form.position,
        researchAreas: form.researchAreas,
        openPositions: Number(form.openPositions),
        description: form.description,
        createdAt: new Date(),
      });
      navigate("/dashboardProfessor");
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

        <div className="role-badge professor">Лаборатория / Профессор</div>
        <h1 className="auth-title">Создай профиль лаборатории</h1>
        <p className="auth-subtitle">Найди талантливых студентов для своих исследований</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="fields-row">
            <div className="field-group">
              <label>Ваше имя</label>
              <input value={form.name} onChange={update("name")} placeholder="Проф. Данияр Сейткали" required />
            </div>
            <div className="field-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update("email")} placeholder="d.seitkali@nu.edu.kz" required />
            </div>
          </div>

          <div className="fields-row">
            <div className="field-group">
              <label>Университет / Институт</label>
              <input value={form.university} onChange={update("university")} placeholder="Назарбаев Университет" required />
            </div>
            <div className="field-group">
              <label>Кафедра / Факультет</label>
              <input value={form.department} onChange={update("department")} placeholder="School of Engineering" required />
            </div>
          </div>

          <div className="fields-row">
            <div className="field-group">
              <label>Название лаборатории</label>
              <input value={form.labName} onChange={update("labName")} placeholder="AI & Robotics Lab" required />
            </div>
            <div className="field-group">
              <label>Должность</label>
              <select value={form.position} onChange={update("position")}>
                <option value="professor">Профессор</option>
                <option value="associate">Ассоциированный профессор</option>
                <option value="assistant">Ассистент-профессор</option>
                <option value="researcher">Исследователь</option>
              </select>
            </div>
          </div>

          <div className="field-group">
            <label>Направления исследований <span className="optional">(выбери подходящие)</span></label>
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

          <div className="field-group">
            <label>Открытые позиции для студентов</label>
            <select value={form.openPositions} onChange={update("openPositions")}>
              {["1","2","3","4","5+"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Краткое описание лаборатории</label>
            <textarea
              value={form.description}
              onChange={update("description")}
              placeholder="Чем занимается ваша лаборатория, какие проекты ведёте, что нужно от студентов..."
              rows={4}
            />
          </div>

          <div className="field-group">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={update("password")} placeholder="Минимум 6 символов" required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn professor-btn" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрировать лабораторию"}
          </button>
        </form>

        <div className="auth-links">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
          <p>Вы студент? <Link to="/register/student">Регистрация для студентов</Link></p>
        </div>
      </div>
    </div>
  );
}