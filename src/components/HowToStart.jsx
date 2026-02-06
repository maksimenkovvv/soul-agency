import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import btnTg from '../assets/img/tg-btn.svg';

gsap.registerPlugin(ScrollTrigger);

function HowToStart() {
  const sectionRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const cards = section.querySelectorAll('.how-to-start__list-item');

    // Создаем таймлайн, который привязан к скроллу

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, // Начинаем, когда заголовок касается верха
        start: 'top top', // Триггер: верх секции касается верха экрана
        end: '+=2500', // Длительность скролла (чем больше число, тем медленнее анимация)
        scrub: true, // Плавная привязка к скроллу
        pin: true, // Фиксируем секцию на месте, пока идет анимация
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Шаг 1: вторая карточка
    tl.to('.how-to-start__list-item--mint', {
      y: -500,
      ease: 'none',
    })
      // Шаг 2: третья карточка
      .to('.how-to-start__list-item--purple', {
        y: -1000,
        ease: 'none',
      })
      // Шаг 3: четвертая карточка
      .to('.how-to-start__list-item--black', {
        y: -1500,
        ease: 'none',
      });
    return () => {
      // Очистка при размонтировании
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className="how-to-start how-to-start--test"
    >
      <div className="how-to-start__header">
        <div className="how-to-start__header-digit b-digit">02</div>

        <h2 className="how-to-start__header__title">Как начать терапию?</h2>
      </div>

      <div className="how-to-start__list">
        <div
          ref={wrapperRef}
          className="how-to-start__list--wrapper"
        >
          <div className="how-to-start__list-item how-to-start__list-item--white">
            <div className="how-to-start__list-item__header">
              <div className="how-to-start__list-item__header-step">Шаг 1</div>

              <p className="how-to-start__list-item__header-title b-title-h3">Найди специалиста</p>
            </div>

            <div className="how-to-start__list-item__content-wrapper">
              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">С чего начать?</p>

                <p className="how-to-start__list-item__content-description">
                  Напишите нам — поможем подобрать психолога по вашим запросам, целям и формату или
                  выберите самостоятельно.
                </p>
              </div>

              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">БюроДуши</p>

                <p className="how-to-start__list-item__content-description">
                  “Обратите внимание на подход психолога
                  <br />
                  Работа с мышлением, эмоциональным состоянием или телом? Мы отмечаем специализацию,
                  чтобы вам было легче выбрать”
                </p>
              </div>
            </div>
          </div>

          <div className="how-to-start__list-item how-to-start__list-item--mint">
            <div className="how-to-start__list-item__header">
              <div className="how-to-start__list-item__header-step">Шаг 2</div>

              <p className="how-to-start__list-item__header-title b-title-h3">
                Запишись на первую сессию
              </p>
            </div>

            <div className="how-to-start__list-item__content-wrapper">
              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">C чего начать?</p>

                <p className="how-to-start__list-item__content-description">
                  Выберите удобное время в календаре психолога. <br />
                  Оплатите сессию онлайн и получите подтверждение и ссылку на встречу.
                </p>
              </div>

              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">БюроДуши</p>

                <p className="how-to-start__list-item__content-description">
                  “Мы напомним вам о консультации заранее. Вам не нужно беспокоиться, всё будет под
                  контролем.”
                </p>
              </div>
            </div>
          </div>

          <div className="how-to-start__list-item how-to-start__list-item--purple">
            <div className="how-to-start__list-item__header">
              <div className="how-to-start__list-item__header-step">Шаг 3</div>

              <p className="how-to-start__list-item__header-title b-title-h3">
                Пройди первую сессию
              </p>
            </div>

            <div className="how-to-start__list-item__content-wrapper">
              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">С чего начать?</p>

                <p className="how-to-start__list-item__content-description">
                  Встреча проходит онлайн — в формате видеозвонка.Создайте для себя спокойную
                  обстановку.Поделитесь тем, что сейчас важно.
                </p>
              </div>

              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">БюроДуши</p>

                <p className="how-to-start__list-item__content-description">
                  “Найдите тихое место, наденьте наушники, подготовьте воду или чай — сессия пройдёт
                  комфортнее, если вам будет спокойно.”
                </p>
              </div>
            </div>
          </div>

          <div className="how-to-start__list-item how-to-start__list-item--black">
            <div className="how-to-start__list-item__header">
              <div className="how-to-start__list-item__header-step">Шаг 4</div>

              <p className="how-to-start__list-item__header-title b-title-h3">
                Продолжай в удобном ритме
              </p>
            </div>

            <div className="how-to-start__list-item__content-wrapper">
              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">С чего начать?</p>

                <p className="how-to-start__list-item__content-description">
                  Вы сами выбираете частоту встреч. <br />
                  Оплачивайте каждую сессию отдельно. <br />
                  Возвращайтесь, когда будете готовы.
                </p>
              </div>

              <div className="how-to-start__list-item__content">
                <p className="how-to-start__list-item__content-title">БюроДуши</p>

                <p className="how-to-start__list-item__content-description">
                  “Терапия может быть регулярной опорой или поддержкой в трудные моменты. Вы всегда
                  можете сделать паузу и вернуться, когда почувствуете, что снова нужна помощь.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowToStart;
