import { useState } from "react";
import { supabase } from "../supabaseClient.js";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

// 🔐 Секретный код — поменяй на свой и храни в .env
const ADMIN_SECRET = "inspirosk-admin-2024";

export default function RegisterAdmin() {
  const [form, setForm] = useState({ email: "", password: "", secretCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.secretCode !== ADMIN_SECRET) {
      setError("Неверный секретный код администратора");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authErr) throw authErr;

      const { error: dbErr } = await supabase.from("profiles").insert({
        id: user.id,
        role: "admin",
        name: "Администратор",
        email: form.email,
      });
      if (dbErr) throw dbErr;

      navigate("/dashboardAdmin");
    } catch (err) {
      setError(err.message || "Ошибка. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-text">inspirosk</span>
        </div>

        <div className="role-badge admin">Администратор</div>
        <h1 className="auth-title">Панель администратора</h1>
        <p className="auth-subtitle">Доступ только для авторизованных лиц</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={update("email")} placeholder="admin@inspirosk.kz" required />
          </div>
          <div className="field-group">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={update("password")} placeholder="Минимум 6 символов" required />
          </div>
          <div className="field-group">
            <label>Секретный код</label>
            <input type="password" value={form.secretCode} onChange={update("secretCode")} placeholder="Введи секретный код" required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn admin-btn" disabled={loading}>
            {loading ? "Проверяем..." : "Войти как администратор"}
          </button>
        </form>
      </div>
    </div>
  );
}