import React from 'react';
import { Link } from 'react-router-dom';

import photo from '../assets/img/psychologist-3.webp';

function UpcomingActivity() {
  return (
    <div className="b-activity">
      <div className="activity__wrapper">
        <div className="activity__item activity__item--single">
          <div className="activity__item-title b-title-h3">Петрова Наталья</div>
          <div className="activity__item-content">
            <div className="activity__item-content__image">
              <img
                src={photo}
                alt=""
              />
            </div>
            <div className="activity__item-content__info">
              <div className="activity__item-content__info-date">19 сентября, 9:00</div>
              <a
                href="#"
                className="b-btn activity__item-content__info-button"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div className="activity__item-subtitle">Ближайший сеанс</div>
        </div>
        <div className="activity__item activity__item--cta">
          <div className="activity__item-title b-title-h3">
            Говорим о сложном — просто. <br /> Давайте с нами — без давления
          </div>
          <Link
            to="/psychologist"
            className="b-btn b-btn--transparent"
          >
            Подобрать психолога
          </Link>
        </div>
        <div className="activity__item activity__item--group">
          <div className="activity__item-title b-title-h3">Название групповой сессии</div>
          <div className="activity__item-content">
            <div className="activity__item-content__image">
              <img
                src={photo}
                alt=""
              />
            </div>
            <div className="activity__item-content__info">
              <div className="activity__item-content__info-date">19 сентября, 9:00</div>
              <a
                href="#"
                className="b-btn activity__item-content__info-button"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div className="activity__item-subtitle">Групповое событие</div>
        </div>
        <div className="activity__item activity__item--single">
          <div className="activity__item-title b-title-h3">Петрова Наталья</div>
          <div className="activity__item-content">
            <div className="activity__item-content__image">
              <img
                src={photo}
                alt=""
              />
            </div>
            <div className="activity__item-content__info">
              <div className="activity__item-content__info-date">19 сентября, 9:00</div>
              <a
                href="#"
                className="b-btn activity__item-content__info-button"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div className="activity__item-subtitle">Ближайший сеанс</div>
        </div>
      </div>
    </div>
  );
}

export default UpcomingActivity;
