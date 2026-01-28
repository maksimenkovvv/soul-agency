import React from 'react';

export default function Footer() {
  const personalData = '/documents/personal_data.pdf';
  const privacyPolicy = '/documents/privacy_policy.pdf';
  const userAgreement = '/documents/user_agreement.pdf';
  const refundPolicy = '/documents/refund_policy.pdf';

  return (
    <footer
      className="app-footer"
      role="contentinfo"
    >
      <div className="app-footer__glow" />

      <div className="container app-footer__inner">
        <div className="app-footer__left">
          <span className="app-footer__copy">© 2026 — сделано с любовью</span>
          <span
            className="app-footer__heart"
            aria-hidden="true"
          >
            💙
          </span>
        </div>
        <ul className="app-footer__menu">
          <li className="app-footer__menu-item">
            <a
              href={userAgreement}
              target="_blank"
              rel="noopener noreferrer"
            >
              Пользовательское соглашение
            </a>
          </li>
          <li className="app-footer__menu-item">
            <a
              href={refundPolicy}
              target="_blank"
              rel="noopener noreferrer"
            >
              Политика возвратов
            </a>
          </li>
          <li className="app-footer__menu-item">
            <a
              href={privacyPolicy}
              target="_blank"
              rel="noopener noreferrer"
            >
              Политика конфиденциальности
            </a>
          </li>
          <li className="app-footer__menu-item">
            <a
              href={personalData}
              target="_blank"
              rel="noopener noreferrer"
            >
              Согласие на обработку ПНД
            </a>
          </li>
        </ul>
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
    </footer>
  );
}
