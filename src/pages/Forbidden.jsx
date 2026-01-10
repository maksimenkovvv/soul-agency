import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authStore";

function RolePill({ role }) {
    if (!role) return null;
    const label = role === "CLIENT" ? "Клиент" : role === "PSYCHOLOGIST" ? "Психолог" : role;
    return <span className="error__pill">{label}</span>;
}

export default function Forbidden() {
    const navigate = useNavigate();
    const location = useLocation();
    const { booting, isAuthenticated, role, me, logout } = useAuth();

    return (
        <div className="b-error">
            <div className="error">
                <div className="error__card error__card--forbidden">
                    <div className="error__top">
                        <div className="error__badge" aria-label="403">
                            403
                        </div>
                        <div className="error__titles">
                            <h2 className="error__title">Доступ ограничен</h2>
                            <p className="error__subtitle">У вас нет прав для просмотра этой страницы.</p>
                        </div>
                    </div>

                    <div className="error__meta">
                        <div className="error__meta-row">
                            <span className="error__meta-label">Адрес:</span>
                            <code className="error__meta-value">{location.pathname}</code>
                        </div>

                        {!booting && (
                            <div className="error__meta-row">
                                <span className="error__meta-label">Вы:</span>
                                <span className="error__meta-value">
                                    {isAuthenticated ? (
                                        <>
                                            {me?.name || me?.email || "Пользователь"} <RolePill role={role} />
                                        </>
                                    ) : (
                                        <>Гость</>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="error__actions">
                        <button type="button" className="b-btn b-btn--transparent" onClick={() => navigate(-1)}>
                            Назад
                        </button>

                        <Link to="/" className="b-btn">
                            На главную
                        </Link>

                        {!booting && isAuthenticated ? (
                            <button
                                type="button"
                                className="b-btn b-btn--transparent"
                                onClick={async () => {
                                    await logout();
                                    navigate("/login", { replace: true });
                                }}
                            >
                                Сменить аккаунт
                            </button>
                        ) : (
                            <Link to="/login" className="b-btn b-btn--transparent">
                                Войти
                            </Link>
                        )}
                    </div>

                    <p className="error__hint">
                        Если вы считаете, что доступ должен быть — попробуйте войти под другим аккаунтом или обратитесь
                        к администратору.
                    </p>
                </div>

                <div className="error__art" aria-hidden="true">
                    <svg viewBox="0 0 520 420" className="error__svg">
                        <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#ACAAFE" stopOpacity="0.95" />
                                <stop offset="1" stopColor="#B5FEDD" stopOpacity="0.95" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M70 160c30-86 160-150 276-122 58 14 119 56 138 116 24 77-16 160-78 209-78 61-203 75-290 16-70-47-77-129-46-219z"
                            fill="url(#g1)"
                        />
                        <g fill="none" stroke="#313235" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M190 190v-26c0-52 42-94 94-94s94 42 94 94v26" />
                            <path d="M168 190h232c10 0 18 8 18 18v134c0 10-8 18-18 18H168c-10 0-18-8-18-18V208c0-10 8-18 18-18z" />
                            <path d="M260 260a28 28 0 1 0 48 20c0-10-6-18-14-23" />
                            <path d="M284 281v42" />
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
