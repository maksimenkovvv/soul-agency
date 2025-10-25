import React from 'react';

import { Link } from 'react-router-dom';

function Header() {
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
            </ul>
            <a href="#" className="b-btn">Для психологов</a>
            <a href="#" className="header__login">
                Войти
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 17L15 12M15 12L10 7M15 12H3M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="#313235" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </a>
        </div >
    );
}

export default Header;