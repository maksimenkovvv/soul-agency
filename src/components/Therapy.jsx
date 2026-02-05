import React from 'react';

import { Link } from 'react-router-dom';

import therapyImgInd from '../assets/img/therapy-ind.svg';
import therapyImgGroup from '../assets/img/therapy-group.svg';

function WhyTherapy() {
  const [activeTab, setActiveTab] = React.useState('tab_1');

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="b-tabs therapy">
      <div className="tabs__nav therapy__nav">
        <button
          className={`tabs__nav-button therapy__nav-button ${activeTab === 'tab_1' ? 'active' : ''}`}
          data-tab="tab_1"
          onClick={() => handleTabClick('tab_1')}
        >
          Индивидуальная терапия
        </button>
        <button
          className={`tabs__nav-button therapy__nav-button therapy__nav-button--mint ${activeTab === 'tab_2' ? 'active' : ''}`}
          data-tab="tab_2"
          onClick={() => handleTabClick('tab_2')}
        >
          Групповая терапия
        </button>
      </div>
      <div className="tabs__content therapy__content">
        <div
          className={`tabs__content-item therapy__content-item ${activeTab === 'tab_1' ? 'active' : ''}`}
          id="tab_1"
        >
          <div className="therapy__content-item__description-wrapper">
            <div className="therapy__content-item__description-item">
              <img
                src={therapyImgInd}
                alt="Индивидуальная терапия"
              />
            </div>
            <div className="therapy__content-item__description-item">
              <p className="therapy__content-item__description-item__title b-title-h3">Как это работает?</p>
              <p className="therapy__content-item__description-item__subtitle">Вы выбираете индивидуальную сессию с удобным временем или групповую с заранее назначенным временем, записываетесь онлайн и присоединяетесь к встрече с психологом.</p>
            </div>
            <div className="therapy__content-item__description-wrapper__item">
              <p className="therapy__content-item__description-item__title b-title-h3">Кому подходит?</p>
              <p className="therapy__content-item__description-item__subtitle">Для тех, кто хочет понять себя, справиться с трудностями и жить более осознанно — через индивидуальные или групповые сессии</p>
            </div>
          </div>
          <div className="therapy__content-item__button">
            <Link
              to="/psychologist"
              className="b-btn"
            >
              Попробовать
            </Link>
          </div>
        </div>
        <div
          className={`tabs__content-item therapy__content-item ${activeTab === 'tab_2' ? 'active' : ''}`}
          id="tab_2"
        >
          <div className="therapy__content-item__description-wrapper therapy__content-item__description-wrapper--mint">
            <div className="therapy__content-item__description-item">
              <img
                src={therapyImgGroup}
                alt="Групповая терапия"
              />
            </div>
            <div className="therapy__content-item__description-item">
              <p className="therapy__content-item__description-item__title b-title-h3">Как это работает?</p>
              <p className="therapy__content-item__description-item__subtitle">Вы выбираете индивидуальную сессию с удобным временем или групповую с заранее назначенным временем, записываетесь онлайн и присоединяетесь к встрече с психологом.</p>
            </div>
            <div className="therapy__content-item__description-wrapper__item">
              <p className="therapy__content-item__description-item__title b-title-h3">Кому подходит?</p>
              <p className="therapy__content-item__description-item__subtitle">Для тех, кто хочет понять себя, справляться с трудностями и жить более осознанно — через индивидуальные или групповые сессии</p>
            </div>
          </div>
          <div className="therapy__content-item__button therapy__content-item__button--mint">
            <Link
              to="/sessions"
              className="b-btn"
            >
              Попробовать
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhyTherapy;
