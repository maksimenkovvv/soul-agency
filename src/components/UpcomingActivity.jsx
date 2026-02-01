import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';

// стили swiper
import 'swiper/css';
import 'swiper/css/pagination';
import '../scss/swiper-custom.scss';

import photo from '../assets/img/psychologist-3.webp'; {/*заглушка для фото*/ }

function UpcomingActivity() {
  const [isMobile, setIsMobile] = useState(false);
  const swiperRef = useRef(null);

  // проверяем ширину экрана
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1240;
      setIsMobile(mobile);

      // если у нас есть инициализированный swiper и мы перешли на десктоп
      if (swiperRef.current && !mobile) {
        swiperRef.current.destroy(true, true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
      if (swiperRef.current) {
        swiperRef.current.destroy(true, true);
      }
    };
  }, []);

  const swiperConfig = {
    slidesPerView: 1.3,
    spaceBetween: 0,
    centeredSlides: true,
    speed: 500,
    initialSlide: 1,
    enabled: isMobile, //отключаем/включаем swiper
    pagination: isMobile ? {
      clickable: true,
    } : false,
    onSwiper: (swiper) => {
      swiperRef.current = swiper;
    },
  };

  // если не мобилка, то рендерим обычную разметку без swiper
  if (!isMobile) {
    return (
      <div className="b-activity">
        <div className="activity__wrapper">
          {/*⬇️ПЕРВЫЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬇️*/}
          <div className="activity__item activity__item--single">
            <div className="activity__item-title b-title-h3">Петрова Наталья</div>
            <div className="activity__item-content">
              <div className="activity__item-content__image">
                <img src={photo} alt="" />
              </div>
              <div className="activity__item-content__info">
                <div className="activity__item-content__info-date">19 сентября, 9:00</div>
                <a href="#" className="b-btn activity__item-content__info-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="activity__item-subtitle">Ближайший сеанс</div>
          </div>
          {/*⬆️ПЕРВЫЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬆️*/}
          <div className="activity__item activity__item--cta">
            <div className="activity__item-title b-title-h3">
              Говорим о сложном — просто. <br /> Давайте с нами — без давления
            </div>
            <Link to="/psychologist" className="b-btn b-btn--transparent">
              Подобрать психолога
            </Link>
          </div>
          {/*⬇️БЛОК ГРУППОВОЙ СЕССИИ⬇️*/}
          <div className="activity__item activity__item--group">
            <div className="activity__item-title b-title-h3">Название групповой сессии</div>
            <div className="activity__item-content">
              <div className="activity__item-content__image">
                <img src={photo} alt="" />
              </div>
              <div className="activity__item-content__info">
                <div className="activity__item-content__info-date">19 сентября, 9:00</div>
                <a href="#" className="b-btn activity__item-content__info-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="activity__item-subtitle">Групповое событие</div>
          </div>
          {/*⬆️БЛОК ГРУППОВОЙ СЕССИИ⬆️*/}
          {/*⬇️ВТОРОЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬇️*/}
          <div className="activity__item activity__item--single">
            <div className="activity__item-title b-title-h3">Петрова Наталья</div>
            <div className="activity__item-content">
              <div className="activity__item-content__image">
                <img src={photo} alt="" />
              </div>
              <div className="activity__item-content__info">
                <div className="activity__item-content__info-date">19 сентября, 9:00</div>
                <a href="#" className="b-btn activity__item-content__info-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="activity__item-subtitle">Ближайший сеанс</div>
          </div>
          {/*⬆️ВТОРОЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬆️*/}
        </div>
      </div>
    );
  }

  // если мобилка, рендерим swiper
  return (
    <div className="b-activity">
      <Swiper
        {...swiperConfig}
        modules={[Pagination]}
        className="activity__wrapper swiper-activity"
      >
        <SwiperSlide>
          {/*⬇️ПЕРВЫЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬇️*/}
          <div className="activity__item activity__item--single">
            <div className="activity__item-title b-title-h3">Петрова Наталья</div>
            <div className="activity__item-content">
              <div className="activity__item-content__image">
                <img src={photo} alt="" />
              </div>
              <div className="activity__item-content__info">
                <div className="activity__item-content__info-date">19 сентября, 9:00</div>
                <a href="#" className="b-btn activity__item-content__info-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="activity__item-subtitle">Ближайший сеанс</div>
          </div>
          {/*⬆️ПЕРВЫЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬆️*/}
        </SwiperSlide>
        <SwiperSlide>
          <div className="activity__item activity__item--cta">
            <div className="activity__item-title b-title-h3">
              Говорим о сложном — просто. <br /> Давайте с нами — без давления
            </div>
            <Link to="/psychologist" className="b-btn b-btn--transparent">
              Подобрать психолога
            </Link>
          </div>
        </SwiperSlide>
        <SwiperSlide>
          {/*⬇️БЛОК ГРУППОВОЙ СЕССИИ⬇️*/}
          <div className="activity__item activity__item--group">
            <div className="activity__item-title b-title-h3">Название групповой сессии</div>
            <div className="activity__item-content">
              <div className="activity__item-content__image">
                <img src={photo} alt="" />
              </div>
              <div className="activity__item-content__info">
                <div className="activity__item-content__info-date">19 сентября, 9:00</div>
                <a href="#" className="b-btn activity__item-content__info-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="activity__item-subtitle">Групповое событие</div>
          </div>
          {/*⬆️БЛОК ГРУППОВОЙ СЕССИИ⬆️*/}
        </SwiperSlide>
        <SwiperSlide>
          {/*⬇️ВТОРОЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬇️*/}
          <div className="activity__item activity__item--single">
            <div className="activity__item-title b-title-h3">Петрова Наталья</div>
            <div className="activity__item-content">
              <div className="activity__item-content__image">
                <img src={photo} alt="" />
              </div>
              <div className="activity__item-content__info">
                <div className="activity__item-content__info-date">19 сентября, 9:00</div>
                <a href="#" className="b-btn activity__item-content__info-button">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="activity__item-subtitle">Ближайший сеанс</div>
          </div>
          {/*⬆️ВТОРОЙ БЛОК ОДИНОЧНОЙ СЕССИИ⬆️*/}
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

export default UpcomingActivity;