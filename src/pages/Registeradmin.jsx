import { useState } from "react";
import { supabase } from "../supabaseClient.js";
import { Link } from "react-router-dom";
import "./Auth.css";

// 🔐 Секретный код — поменяй на свой и храни в .env
const ADMIN_SECRET = "inspirosk-admin-2024";

export default function RegisterAdmin() {
  const [form, setForm] = useState({ email: "", password: "", secretCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

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

      setIsRegistered(true);
    } catch (err) {
      let friendlyError = err.message || "Ошибка. Попробуй ещё раз.";
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
        <div className="auth-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="auth-logo" style={{ marginBottom: 24, justifyContent: "center", display: "flex" }}>
            <span className="logo-text">inspirosk</span>
          </div>
          <div style={{ fontSize: 54, marginBottom: 20 }}>✉️</div>
          <h2 style={{ marginBottom: 16, color: "var(--text-primary)" }}>Подтвердите Email</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: "1.6", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px auto" }}>
            Мы отправили ссылку для активации аккаунта администратора на адрес <strong>{form.email}</strong>. 
            Пожалуйста, перейдите по ссылке в письме, чтобы подтвердить ваш адрес электронной почты и завершить регистрацию.
          </p>
          <Link to="/login" className="auth-btn" style={{ display: "inline-block", textDecoration: "none", width: "auto", padding: "12px 32px", margin: "0 auto" }}>
            Вернуться ко входу
          </Link>
        </div>
      </div>
    );
  }

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