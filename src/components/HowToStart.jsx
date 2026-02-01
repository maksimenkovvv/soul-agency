import React from 'react';

import btnTg from '../assets/img/tg-btn.svg'

function HowToStart() {
    return (
        <div className="how-to-start">
            <div className="how-to-start__header">
                <div className="how-to-start__header-digit b-digit">02</div>
                <h2 className="how-to-start__header__title">
                    Как начать терапию?
                </h2>
            </div>

            <div className="how-to-start__list">
                <div className="how-to-start__list-item how-to-start__list-item--white">
                    <div className="how-to-start__list-item__header">
                        <div className="how-to-start__list-item__header-step">Шаг 1</div>
                        <p className="how-to-start__list-item__header-title b-title-h3">Найди специалиста</p>
                    </div>
                    <div className="how-to-start__list-item__content-wrapper">
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">С чего начать?</p>
                            <p className="how-to-start__list-item__content-description">Напишите нам — поможем подобрать психолога по вашим запросам, целям и формату или выберите самостоятельно.</p>
                        </div>
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">БюроДуши</p>
                            <p className="how-to-start__list-item__content-description">“Обратите внимание на подход психолога
                                <br />
                                Работа с мышлением, эмоциональным состоянием или телом? Мы отмечаем специализацию, чтобы вам было легче выбрать”</p>
                        </div>
                    </div>
                </div>
                <div className="how-to-start__list-item how-to-start__list-item--mint">
                    <div className="how-to-start__list-item__header">
                        <div className="how-to-start__list-item__header-step">Шаг 2</div>
                        <p className="how-to-start__list-item__header-title b-title-h3">Запишись на первую сессию</p>
                    </div>
                    <div className="how-to-start__list-item__content-wrapper">
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">C чего начать?</p>
                            <p className="how-to-start__list-item__content-description">Выберите удобное время в календаре психолога. <br />
                                Оплатите сессию онлайн и получите подтверждение и ссылку на встречу.</p>
                        </div>
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">БюроДуши</p>
                            <p className="how-to-start__list-item__content-description">“Мы напомним вам о консультации заранее. Вам не нужно беспокоиться, всё будет под контролем.”</p>
                        </div>
                    </div>
                </div>
                <div className="how-to-start__list-item how-to-start__list-item--purple">
                    <div className="how-to-start__list-item__header">
                        <div className="how-to-start__list-item__header-step">Шаг 3</div>
                        <p className="how-to-start__list-item__header-title b-title-h3">Пройди первую сессию</p>
                    </div>
                    <div className="how-to-start__list-item__content-wrapper">
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">С чего начать?</p>
                            <p className="how-to-start__list-item__content-description">Встреча проходит онлайн — в формате видеозвонка.Создайте для себя спокойную обстановку.Поделитесь тем, что сейчас важно.</p>
                        </div>
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">БюроДуши</p>
                            <p className="how-to-start__list-item__content-description">“Найдите тихое место, наденьте наушники, подготовьте воду или чай — сессия пройдёт комфортнее, если вам будет спокойно.”</p>
                        </div>
                    </div>
                </div>
                <div className="how-to-start__list-item how-to-start__list-item--black">
                    <div className="how-to-start__list-item__header">
                        <div className="how-to-start__list-item__header-step">Шаг 4</div>
                        <p className="how-to-start__list-item__header-title b-title-h3">Продолжай в удобном ритме</p>
                    </div>
                    <div className="how-to-start__list-item__content-wrapper">
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">С чего начать?</p>
                            <p className="how-to-start__list-item__content-description">Вы сами выбираете частоту встреч. <br />
                                Оплачивайте каждую сессию отдельно. <br />
                                Возвращайтесь, когда будете готовы.</p>
                        </div>
                        <div className="how-to-start__list-item__content">
                            <p className="how-to-start__list-item__content-title">БюроДуши</p>
                            <p className="how-to-start__list-item__content-description">“Терапия может быть регулярной опорой или поддержкой в трудные моменты. Вы всегда можете сделать паузу и вернуться, когда почувствуете, что снова нужна помощь.”</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default HowToStart;