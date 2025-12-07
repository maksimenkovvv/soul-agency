import React from 'react';

function Sidebar() {
    return (
        <div className="b-sidebar">
            <div className="sidebar__info">
                <img src="" alt="фото" className="sidebar__info-photo" />
                <p className="sidebar__info-name">Мария Иванова</p>
                <p className="sideba__info-email">example@google.com</p>
            </div>
            <ul className="sidebar__tabs">
                <li className="sidebar__tabs-item">Записи</li>
                <li className="sidebar__tabs-item">Избранное</li>
            </ul>
        </div>
    );
}

export default Sidebar;