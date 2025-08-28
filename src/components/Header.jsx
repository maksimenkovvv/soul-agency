import React from 'react';

function Header() {
    return (
        <div className="header gray-bg">
            <div className="header__logo">
                <p>БюроДуши</p>
            </div>
            <ul className="header__menu">
                <li className="header__menu-item"><a href="#">О нас</a></li>
                <li className="header__menu-item"><a href="#">Специалисты</a></li>
                <li className="header__menu-item"><a href="#">Для психологов</a></li>
            </ul>
            <button className="header__login">
                Войти
            </button>
        </div>
    );
}

export default Header;