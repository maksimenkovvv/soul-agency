import React from 'react';

import boss from '../assets/img/boss.webp'

function About() {
    return (
        <div className="b-about">
            <h1 className="about__title">Меня зовут Лера,<br />я основатель БюроДуши</h1>
            <div className="about__content">
                <div className="about__content-left">
                    <img src={boss} alt="" />
                    <div className="about__content-left__text">
                        Всё, что мы делаем, защищает вашу конфиденциальность и ценит вашу уникальность.
                    </div>
                </div>
                <div className="about__content-right">
                    <div className="about__content-right__wrapper">
                        <p className="about__content-right__title">Миссия</p>
                        <div className="about__content-right__subtitle-wrapper">
                            <p className="about__content-right__subtitle">Мы распространяем психологическую культуру в города России, делая поддержку доступной каждому.</p>
                        </div>
                    </div>
                    <div className="about__content-right__wrapper">
                        <p className="about__content-right__title">Ценность</p>
                        <div className="about__content-right__subtitle-wrapper">
                            <p className="about__content-right__subtitle">Наша платформа объединяет людей и специалистов, создавая пространство, где можно безопасно открываться, понимать себя и находить поддержку.</p>
                            <p className="about__content-right__subtitle">Мы создаём безопасное и поддерживающее сообщество, где каждый может глубже понять себя и расти с помощью психологии.Искренность, уважение и вовлечённость помогают нам быть рядом с вами, а индивидуальный подход и прозрачность делают ваш опыт комфортным и доверительным.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default About;