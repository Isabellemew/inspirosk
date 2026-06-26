import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import { supabase } from "../supabaseClient.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Views: "login", "forgot", "reset"
  const [view, setView] = useState("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Listen to Auth state changes to detect PASSWORD_RECOVERY redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset");
      }
    });

    // Check if recovery parameter is already in URL hash
    if (window.location.hash && window.location.hash.includes("type=recovery")) {
      setView("reset");
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetErr) throw resetErr;
      setSuccess("Ссылка для восстановления пароля отправлена на ваш Email!");
    } catch (err) {
      setError(err.message || "Не удалось отправить ссылку");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Пароль должен содержать не менее 8 символов");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateErr) throw updateErr;
      setSuccess("Пароль успешно изменен! Перенаправление на страницу входа...");
      setTimeout(() => {
        setView("login");
        setSuccess("");
        setNewPassword("");
      }, 3000);
    } catch (err) {
      setError(err.message || "Не удалось обновить пароль");
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

        {view === "login" && (
          <>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Пароль</label>
                  <button 
                    type="button" 
                    onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}
                    style={{ background: "none", border: "none", color: "var(--primary-light)", fontSize: "12px", cursor: "pointer", padding: 0 }}
                  >
                    Забыли пароль?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success" style={{ color: "var(--status-accepted)", fontSize: "13px", marginTop: "8px", textAlign: "center" }}>{success}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Вход..." : "Войти"}
              </button>
            </form>
          </>
        )}

        {view === "forgot" && (
          <>
            <h1 className="auth-title">Восстановление пароля</h1>
            <p className="auth-subtitle">Введите ваш Email для сброса пароля</p>

            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="field-group">
                <label>Email адрес</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success" style={{ color: "var(--status-accepted)", fontSize: "13px", margin: "8px 0", textAlign: "center" }}>{success}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Отправка..." : "Отправить ссылку"}
              </button>

              <button 
                type="button" 
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="auth-btn"
                style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-primary)", marginTop: "8px" }}
              >
                Вернуться к входу
              </button>
            </form>
          </>
        )}

        {view === "reset" && (
          <>
            <h1 className="auth-title">Новый пароль</h1>
            <p className="auth-subtitle">Укажите новый пароль для вашего аккаунта</p>

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="field-group">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Не менее 8 символов"
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {success && <p className="auth-success" style={{ color: "var(--status-accepted)", fontSize: "13px", margin: "8px 0", textAlign: "center" }}>{success}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Обновление..." : "Сохранить новый пароль"}
              </button>
            </form>
          </>
        )}

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