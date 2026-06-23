import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

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
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    
    // Получаем роль из Firestore
    const snap = await getDoc(doc(db, "users", user.uid));
    const role = snap.data()?.role;

    if (role === "admin") navigate("/dashboardAdmin");
    else if (role === "professor") navigate("/dashboardProfessor");
    else navigate("/dashboardStudent");

  } catch (err) {
    setError("Неверный email или пароль");
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
          <div className="role-links">
            <Link to="/register/student">Студент</Link>
            <span>·</span>
            <Link to="/register/professor">Профессор</Link>
          </div>
        </div>
      </div>
    </div>
  );
}