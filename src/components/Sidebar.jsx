import React from 'react';
import { Link } from 'react-router-dom';

function initials(nameOrEmail) {
    const s = String(nameOrEmail || "").trim();
    if (!s) return "?";
    // email
    if (s.includes("@")) return s.slice(0, 1).toUpperCase();
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

function Sidebar({ user, tabs = [], setActiveTab, activeTab }) {
    return (
        <div className="b-sidebar">
            <div className="sidebar__info">
                <div className="sidebar__info-photo">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="фото" />
                    ) : (
                        <div className="sidebar__info-photo-fallback" aria-hidden="true">
                            {initials(user.name || user.email)}
                        </div>
                    )}
                </div>
                <Link to="settings">
                    <button className="sidebar__info-settings">
                        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.1666 16.8337H16.8333M16.9783 5.01032C17.4189 4.56984 17.6664 3.97237 17.6665 3.34936C17.6666 2.72635 17.4192 2.12883 16.9787 1.68823C16.5382 1.24764 15.9408 1.00008 15.3177 1C14.6947 0.999922 14.0972 1.24734 13.6566 1.68782L2.53495 12.812C2.34146 13.0049 2.19837 13.2424 2.11828 13.5037L1.01745 17.1303C0.995908 17.2024 0.994282 17.2789 1.01274 17.3519C1.03119 17.4248 1.06905 17.4913 1.12228 17.5445C1.17551 17.5976 1.24213 17.6354 1.31508 17.6537C1.38803 17.6721 1.46458 17.6703 1.53661 17.6487L5.16411 16.5487C5.42509 16.4693 5.66259 16.3271 5.85578 16.1345L16.9783 5.01032Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </Link>
                <p className="sidebar__info-name">{user.name}</p>
                <p className="sidebar__info-email">{user.email}</p>
            </div>
            <ul className="sidebar__tabs" role="tablist" aria-label="Разделы кабинета">
                {(Array.isArray(tabs) ? tabs : []).map((t) => (
                    <li key={t} className="sidebar__tabs-item">
                        <button
                            type="button"
                            className={`sidebar__tabBtn ${activeTab === t ? "active" : ""}`}
                            onClick={() => setActiveTab(t)}
                            role="tab"
                            aria-selected={activeTab === t}
                        >
                            {t}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Sidebar;
