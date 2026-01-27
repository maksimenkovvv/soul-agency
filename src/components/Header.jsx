import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authStore';
import NotificationBell from './NotificationBell';

import logo from '../assets/img/logo.svg';

function getInitials(me) {
  const s = (me?.name || me?.email || '').trim();
  if (!s) return '🙂';
  if (s.includes('@')) return s.slice(0, 2).toUpperCase();
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0] || '').slice(0, 1);
  const b = (parts[1] || '').slice(0, 1);
  return (a + b).toUpperCase();
}

const BurgerIcon = ({ open }) =>
  open ? (
    <svg className="header__burgerIcon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg className="header__burgerIcon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

function Header() {
  const formUrl = 'https://forms.yandex.ru/u/6960c4fbd0468884b413c732';

  const { booting, isAuthenticated, role, me, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  const avatarUrl = useMemo(() => {
    return me?.avatarUrl || me?.avatar || me?.photoUrl || me?.imageUrl || '';
  }, [me]);

  const isCabinetActive = location.pathname.startsWith('/dashboard');
  const closeMenu = () => setMenuOpen(false);

  // close burger on route change
  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // close on outside click / ESC
  useEffect(() => {
    if (!menuOpen) return;

    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) closeMenu();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu();
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const goCabinet = () => navigate('/dashboard');
  const navLinkClass = ({ isActive }) => `header__menu-link ${isActive ? 'is-active' : ''}`;
  const canChat = role === 'CLIENT' || role === 'PSYCHOLOGIST' || role === 'ADMIN';

  return (
    <header className={`header ${menuOpen ? 'header--open' : ''}`} ref={wrapRef}>
      <Link to="/" className="header__logo" aria-label="На главную">
        <img src={logo} alt="БюроДуши" />
      </Link>

      {/* Desktop menu (hidden on mobile) */}
      <ul className="header__menu" aria-label="Навигация">
        <li className="header__menu-item">
          <NavLink to="/about" className={navLinkClass}>
            О нас
          </NavLink>
        </li>
        <li className="header__menu-item">
          <NavLink to="/psychologist" className={navLinkClass}>
            Психологи
          </NavLink>
        </li>
        <li className="header__menu-item">
          <NavLink to="/sessions" className={navLinkClass}>
            Сессии
          </NavLink>
        </li>
        <li className="header__menu-item">
          <NavLink to="/sessions2" className={navLinkClass}>
            Сессии2
          </NavLink>
        </li>
        <li className="header__menu-item">
          <NavLink to="/blog" className={navLinkClass}>
            Блог
          </NavLink>
        </li>
        {canChat && (
          <li className="header__menu-item">
            <NavLink to="/chat" className={navLinkClass}>
              Чаты
            </NavLink>
          </li>
        )}
        {/* Desktop CTA (hidden on mobile) */}
        <a href={formUrl} target="_blank" rel="noopener noreferrer" className="b-btn header__cta">
          Для психологов
        </a>
      </ul>

      {/* Right side (mobile: bell + burger; desktop: bell + auth actions) */}
      <div className="header__right">
        {booting ? null : isAuthenticated ? <NotificationBell /> : null}

        {/* Burger (mobile only) */}
        <button type="button" className={`header__burger ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen((v) => !v)} aria-label="Меню" aria-expanded={menuOpen}>
          <BurgerIcon open={menuOpen} />
        </button>

        {/* Desktop auth actions (hidden on mobile) */}
        {booting ? null : !isAuthenticated ? (
          <Link to="/login" className="header__login header__login--desktop">
            Войти
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 17L15 12M15 12L10 7M15 12H3M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <div className="header__auth header__auth--desktop">
            <button type="button" onClick={goCabinet} className={`header__profileBtn ${isCabinetActive ? 'is-active' : ''}`} title={me?.name || me?.email || 'Профиль'}>
              <span className="header__avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="header__avatarText">{getInitials(me)}</span>}
              </span>
              <span className="header__profileText">Профиль</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="header__logoutBtn"
            >
              Выйти
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer (everything else lives here) */}
      <div className={`header__drawer ${menuOpen ? 'is-open' : ''}`} role="dialog" aria-label="Меню сайта">
        <div className="header__drawerInner">
          <div className="header__drawerTop">
            {booting ? null : isAuthenticated ? (
              <button
                type="button"
                className={`header__drawerProfile ${isCabinetActive ? 'is-active' : ''}`}
                onClick={() => {
                  closeMenu();
                  goCabinet();
                }}
              >
                <span className="header__drawerAvatar" aria-hidden="true">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="header__avatarText">{getInitials(me)}</span>}
                </span>
                <span className="header__drawerProfileText">{me?.name || me?.email || 'Профиль'}</span>
              </button>
            ) : null}
          </div>

          <nav className="header__drawerNav" aria-label="Навигация">
            <NavLink to="/about" className={navLinkClass} onClick={closeMenu}>
              О нас
            </NavLink>
            <NavLink to="/psychologist" className={navLinkClass} onClick={closeMenu}>
              Психологи
            </NavLink>
            <NavLink to="/sessions" className={navLinkClass} onClick={closeMenu}>
              Сессии
            </NavLink>
            <NavLink to="/blog" className={navLinkClass} onClick={closeMenu}>
              Блог
            </NavLink>
            {canChat && (
              <NavLink to="/chat" className={navLinkClass} onClick={closeMenu}>
                Чаты
              </NavLink>
            )}
          </nav>
          <div className="header__drawerFooter">
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="b-btn header__drawerCta" onClick={closeMenu}>
              Для психологов
            </a>

            {booting ? null : !isAuthenticated ? (
              <Link to="/login" className="header__drawerLogin" onClick={closeMenu}>
                Войти
              </Link>
            ) : (
              <button
                type="button"
                className="header__drawerLogout"
                onClick={async () => {
                  closeMenu();
                  await logout();
                  navigate('/');
                }}
              >
                Выйти
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
