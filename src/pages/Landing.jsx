import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const STATS = [
  { value: "120+", label: "Лабораторий" },
  { value: "3 400+", label: "Студентов" },
  { value: "89%", label: "Находят место" },
];

const FEATURES = [
  {
    icon: "✦",
    title: "Умный подбор",
    desc: "Алгоритм сопоставляет твои интересы с исследовательскими направлениями лабораторий — не просто поиск, а настоящий матч.",
  },
  {
    icon: "◈",
    title: "Прямой контакт",
    desc: "Отправляй заявки и общайся с профессорами прямо на платформе. Никаких лишних цепочек писем.",
  },
  {
    icon: "◇",
    title: "Прозрачный статус",
    desc: "Следи за своими заявками в реальном времени. Всегда знай, на каком ты этапе.",
  },
];

const STEPS = [
  { num: "01", title: "Создай профиль", desc: "Укажи интересы, курс и университет. Займёт меньше 3 минут." },
  { num: "02", title: "Найди лабораторию", desc: "Просматривай карточки лабораторий или смотри персональные рекомендации." },
  { num: "03", title: "Подай заявку", desc: "Напиши мотивационное письмо и отправь — всё в несколько кликов." },
  { num: "04", title: "Начни исследовать", desc: "Получи ответ и приступай к работе с командой." },
];

export default function Landing() {
  const heroRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      {/* NAV */}
      <nav className={`land-nav ${scrollY > 40 ? "land-nav--scrolled" : ""}`}>
        <span className="land-logo">inspirosk</span>
        <div className="land-nav-links">
          <Link to="/login" className="land-nav-link">Войти</Link>
          <Link to="/register/student" className="land-nav-cta">Начать →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="land-hero" ref={heroRef}>
        <div className="land-hero-bg">
          <div className="land-orb land-orb-1" />
          <div className="land-orb land-orb-2" />
          <div className="land-orb land-orb-3" />
          <div className="land-grid" />
        </div>
        <div className="land-hero-content">
          <div className="land-hero-tag">Платформа для студентов Казахстана</div>
          <h1 className="land-hero-title">
            Найди свою
            <br />
            <span className="land-gradient-text">лабораторию.</span>
          </h1>
          <p className="land-hero-sub">
            inspirosk соединяет студентов с научными лабораториями университетов.<br />
            Подавай заявки, общайся с профессорами и начинай исследовать.
          </p>
          <div className="land-hero-actions">
            <Link to="/register/student" className="land-btn-primary">
              Я студент
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link to="/register/professor" className="land-btn-ghost">
              Я исследователь
            </Link>
          </div>
        </div>

        {/* Floating cards */}
        <div className="land-float-cards">
          <div className="land-fcard land-fcard-1">
            <div className="land-fcard-dot" style={{ background: "#06B6D4" }} />
            <div>
              <div className="land-fcard-title">AI & Robotics Lab</div>
              <div className="land-fcard-sub">Назарбаев Университет</div>
            </div>
            <span className="land-fcard-badge">2 места</span>
          </div>
          <div className="land-fcard land-fcard-2">
            <div className="land-fcard-dot" style={{ background: "#F59E0B" }} />
            <div>
              <div className="land-fcard-title">Биоинформатика</div>
              <div className="land-fcard-sub">КБТУ</div>
            </div>
            <span className="land-fcard-badge land-fcard-badge--gold">3 места</span>
          </div>
          <div className="land-fcard land-fcard-3">
            <span className="land-fcard-notify">🎉 Заявка принята</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="land-stats">
        {STATS.map((s) => (
          <div key={s.label} className="land-stat">
            <span className="land-stat-value">{s.value}</span>
            <span className="land-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="land-section">
        <div className="land-section-tag">Зачем inspirosk</div>
        <h2 className="land-section-title">Наука начинается с правильного старта</h2>
        <div className="land-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="land-feature-card">
              <div className="land-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="land-section land-section--dark">
        <div className="land-section-tag">Как это работает</div>
        <h2 className="land-section-title">Четыре шага до первого исследования</h2>
        <div className="land-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className="land-step">
              <div className="land-step-num">{s.num}</div>
              <div className="land-step-line" style={{ opacity: i < STEPS.length - 1 ? 1 : 0 }} />
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="land-cta">
        <div className="land-cta-orb" />
        <h2 className="land-cta-title">Готов начать?</h2>
        <p className="land-cta-sub">Присоединись к тысячам студентов, которые уже нашли свои лаборатории.</p>
        <div className="land-hero-actions">
          <Link to="/register/student" className="land-btn-primary">
            Создать профиль
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <Link to="/login" className="land-btn-ghost">Войти</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="land-footer">
        <span className="land-logo">inspirosk</span>
        <span className="land-footer-copy">© 2025 inspirosk. Казахстан.</span>
        <div className="land-footer-links">
          <Link to="/register/student">Студентам</Link>
          <Link to="/register/professor">Профессорам</Link>
          <Link to="/login">Войти</Link>
        </div>
      </footer>
    </div>
  );
}