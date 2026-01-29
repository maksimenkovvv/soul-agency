import React from 'react';
import { NavLink } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear(); //актуальная дата года, чтобы не менять вручную каждый год

  const personalData = '/documents/personal_data.pdf';
  const privacyPolicy = '/documents/privacy_policy.pdf';
  const userAgreement = '/documents/user_agreement.pdf';
  const refundPolicy = '/documents/refund_policy.pdf';
  const publicOffer = '/documents/public_offer.pdf';


  return (
    <footer
      className="app-footer"
      role="contentinfo"
    >
      <div className="app-footer__glow" />

      <div className="container app-footer__inner">
        <div className="app-footer__menu--wrapper">
          <div className="app-footer__menu">
            <div className="app-footer__menu-title">Документы</div>
            <ul className="app-footer__menu-list">
              <li className="app-footer__menu-list__item">
                <a
                  href={userAgreement}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Пользовательское соглашение
                </a>
              </li>
              <li className="app-footer__menu-list__item">
                <a
                  href={refundPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Политика возвратов
                </a>
              </li>
              <li className="app-footer__menu-list__item">
                <a
                  href={privacyPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Политика конфиденциальности
                </a>
              </li>
              <li className="app-footer__menu-list__item">
                <a
                  href={personalData}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Согласие на обработку ПНД
                </a>
              </li>
              <li className="app-footer__menu-list__item">
                <a
                  href={publicOffer}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Публичная оферта
                </a>
              </li>
            </ul>
          </div>
          <div className="app-footer__menu">
            <div className="app-footer__menu-title">Полезное</div>
            <ul className="app-footer__menu-list">
              <li className="app-footer__menu-list__item">
                <NavLink
                  to='/psychologist'
                >
                  Индивидуальные сессии
                </NavLink>
              </li>
              <li className="app-footer__menu-list__item">
                <NavLink
                  to='/sessions'
                >
                  Групповые сессии
                </NavLink>
              </li>
              <li className="app-footer__menu-list__item">
                <NavLink
                  to='/blog'
                >
                  Блог
                </NavLink>
              </li>
            </ul>
          </div>
          <div className="app-footer__menu">
            <div className="app-footer__menu-title">Контакты</div>
            <ul className="app-footer__menu-list">
              <li className="app-footer__menu-list__item">
                <span>E-mail: </span>
                <a
                  href="mailto:burosoul@mail.ru"

                >
                  burosoul@mail.ru
                </a>
              </li>
              <li className="app-footer__menu-list__item">
                ИНН: 602716479144
              </li>
              <li className="app-footer__menu-list__item">
                ОГРНИП: 326600000000411
              </li>
            </ul>
          </div>
        </div>
        <div className="app-footer__bottom">
          <div className="app-footer__bottom-item">&copy; {currentYear} <br /> Индивидуальный предприниматель Козырева Валерия Витальевна</div>
        </div>
        <div className="app-footer__brand--wrapper">
          <a
            className="app-footer__brand"
            href="https://ai-vai.com"
            target="_blank"
            rel="noreferrer"
            aria-label="AI-VAI — перейти на сайт"
          >
            <span
              className="app-footer__brandMark"
              aria-hidden="true"
            >
              ✦
            </span>
            <span className="app-footer__brandText">AI-VAI</span>
            <span
              className="app-footer__shine"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </footer >
  );
}
