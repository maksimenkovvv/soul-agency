import React from 'react';

function Sidebar({ user, setActiveTab, activeTab }) {
    return (
        <div className="b-sidebar">
            <div className="sidebar__info">
                <div className="sidebar__info-photo">
                    <img src={user.avatar} alt="фото" />
                </div>
                <p className="sidebar__info-name">{user.name}</p>
                <p className="sidebar__info-email">{user.email}</p>
            </div>
            <ul className="sidebar__tabs">
                {user.role === 'client' ? (
                    <>
                        <li
                            className={`sidebar__tabs-item ${activeTab === 'Записи' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Записи')}
                        >
                            Записи
                        </li>
                        <li
                            className={`sidebar__tabs-item ${activeTab === 'Избранное' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Избранное')}
                        >
                            Избранное
                        </li>
                    </>
                ) : (
                    <>
                        <li
                            className={`sidebar__tabs-item ${activeTab === 'Записи' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Записи')}
                        >
                            Записи
                        </li>
                        <li
                            className={`sidebar__tabs-item ${activeTab === 'График работы' ? 'active' : ''}`}
                            onClick={() => setActiveTab('График работы')}
                        >
                            График работы
                        </li>
                    </>
                )}
            </ul>
        </div>
    );
}

export default Sidebar;
