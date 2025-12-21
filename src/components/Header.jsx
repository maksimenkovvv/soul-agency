import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authStore";
import NotificationBell from "./NotificationBell";

function Header() {
    const { booting, isAuthenticated, role, me, logout } = useAuth();
    const navigate = useNavigate();

    const goCabinet = () => {
        if (role === "PSYCHOLOGIST" || role === "ADMIN") navigate("/psycho");
        else navigate("/user");
    };

    return (
        <div className="header">
            <Link to="/">
                <div className="header__logo">
                    <p>БюроДуши</p>
                </div>
            </Link>

            <ul className="header__menu">
                <li className="header__menu-item"><Link to="/about">О нас</Link></li>
                <li className="header__menu-item"><Link to="/psychologist">Психологи</Link></li>
                <li className="header__menu-item"><Link to="/sessions">Сессии</Link></li>

                {/* защищённые пункты по ролям */}
                {(role === "PSYCHOLOGIST" || role === "ADMIN") && (
                    <li className="header__menu-item"><Link to="/psycho">Лк для психологов</Link></li>
                )}
                {(role === "CLIENT" || role === "ADMIN") && (
                    <li className="header__menu-item"><Link to="/user">Лк для пользователя</Link></li>
                )}

                {/* чаты */}
                {(role === "CLIENT" || role === "PSYCHOLOGIST" || role === "ADMIN") && (
                    <li className="header__menu-item"><Link to="/chat">Чаты</Link></li>
                )}
            </ul>

            <a href="#" className="b-btn">Для психологов</a>

            {booting ? null : !isAuthenticated ? (
                <Link to="/login" className="header__login">
                    Войти
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M10 17L15 12M15 12L10 7M15 12H3M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15"
                            stroke="#313235"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </Link>
            ) : (
                <div className="header__login" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <NotificationBell />
                    <button
                        type="button"
                        onClick={goCabinet}
                        className="header__login"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                        title={me?.name || me?.email || "Профиль"}
                    >
                        Профиль
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M20 21a8 8 0 0 0-16 0"
                                stroke="#313235"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                                stroke="#313235"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    <button
                        type="button"
                        onClick={async () => {
                            await logout();
                            navigate("/");
                        }}
                        className="header__login"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                        Выйти
                    </button>
                </div>
            )}
        </div>
    );
}

export default Header;
