import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import { supabase } from "../supabaseClient.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authErr) throw authErr;
      
      const { data: profile, error: dbErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
      if (dbErr || !profile) {
        throw new Error("Профиль пользователя не найден");
      }
      
      const role = profile.role;
      if (role === "admin") navigate("/dashboardAdmin");
      else if (role === "professor") navigate("/dashboardProfessor");
      else if (role === "independent") navigate("/dashboardIndependent");
      else if (role === "business") navigate("/dashboardBusiness");
      else navigate("/dashboardStudent");

    } catch (err) {
      setError(err.message || "Неверный email или пароль");
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
        <h1 className="auth-title">Добро пожаловать</h1>
        <p className="auth-subtitle">Войдите в свой аккаунт</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="field-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
            />
          </div>
          <div className="field-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="auth-links">
          <p>Нет аккаунта?</p>
          <div className="role-links" style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register/student">Студент</Link>
            <span>·</span>
            <Link to="/register/professor">Профессор</Link>
            <span>·</span>
            <Link to="/register/independent">Соавтор</Link>
            <span>·</span>
            <Link to="/register/business">Бизнес / Инвестор</Link>
          </div>
        </div>
      </div>
    </div>
  );
}