import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authStore";

export default function NotFound() {
    const navigate = useNavigate();
    const location = useLocation();
    const { booting, isAuthenticated } = useAuth();

    return (
        <div className="b-error">
            <div className="error">
                <div className="error__card error__card--notfound">
                    <div className="error__top">
                        <div className="error__badge" aria-label="404">
                            404
                        </div>
                        <div className="error__titles">
                            <h2 className="error__title">Страница не найдена</h2>
                            <p className="error__subtitle">
                                Похоже, ссылка устарела или вы ошиблись в адресе. Но мы уже рядом 🙂
                            </p>
                        </div>
                    </div>

                    <div className="error__meta">
                        <div className="error__meta-row">
                            <span className="error__meta-label">Адрес:</span>
                            <code className="error__meta-value">{location.pathname}</code>
                        </div>
                    </div>

                    <div className="error__actions">
                        <button type="button" className="b-btn b-btn--transparent" onClick={() => navigate(-1)}>
                            Назад
                        </button>

                        <Link to="/" className="b-btn">
                            На главную
                        </Link>

                        <Link to="/psychologist" className="b-btn b-btn--transparent">
                            Психологи
                        </Link>

                        <Link to="/sessions" className="b-btn b-btn--transparent">
                            Сессии
                        </Link>

                        {!booting && isAuthenticated ? (
                            <Link to="/dashboard" className="b-btn b-btn--transparent">
                                В кабинет
                            </Link>
                        ) : (
                            <Link to="/login" className="b-btn b-btn--transparent">
                                Войти
                            </Link>
                        )}
                    </div>

                    <p className="error__hint">
                        Если вы пришли сюда из меню — напишите нам, и мы поправим ссылку.
                    </p>
                </div>

                <div className="error__art" aria-hidden="true">
                    <svg viewBox="0 0 520 420" className="error__svg">
                        <defs>
                            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#DDE4FF" stopOpacity="0.95" />
                                <stop offset="1" stopColor="#ACAAFE" stopOpacity="0.95" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M70 160c30-86 160-150 276-122 58 14 119 56 138 116 24 77-16 160-78 209-78 61-203 75-290 16-70-47-77-129-46-219z"
                            fill="url(#g2)"
                        />
                        <g fill="none" stroke="#313235" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M206 304c26 28 80 26 106-2" />
                            <path d="M216 206c10-16 30-26 52-26s42 10 52 26" />
                            <path d="M172 336c28-58 58-92 90-104" />
                            <path d="M348 336c-28-58-58-92-90-104" />
                            <path d="M246 148h28" />
                            <path d="M260 120v56" />
                        </g>
                        <g fill="#313235" opacity="0.12">
                            <circle cx="110" cy="90" r="10" />
                            <circle cx="420" cy="90" r="10" />
                            <circle cx="450" cy="320" r="12" />
                            <circle cx="120" cy="330" r="12" />
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}
