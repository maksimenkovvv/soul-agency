import React from 'react';
import boss from '../assets/img/boss.webp';

function About() {
    return (
        <section className="b-about">
            <div className="container">

                <header className="about__header">
                    <h1 className="about__title">
                        Меня зовут <span className="text-accent">Лера</span>, <br />
                        я основатель БюроДуши
                    </h1>
                </header>

                <div className="about__grid">
                    <div className="about__visual">
                        <div className="about__image-wrapper">
                            <img src={boss} alt="Лера, основатель БюроДуши" />
                        </div>
                        <div className="about__quote-card">
                            <p>Всё, что мы делаем, защищает вашу конфиденциальность и ценит вашу уникальность.</p>
                        </div>
                    </div>

                    {/* Правая колонка с текстом */}
                    <div className="about__info">
                        <div className="about__section">
                            <h3 className="about__subtitle">Миссия</h3>
                            <div className="about__text">
                                <p>Мы распространяем психологическую культуру в города России, делая поддержку доступной каждому.</p>
                            </div>
                        </div>

                        <div className="about__section">
                            <h3 className="about__subtitle">Ценность</h3>
                            <div className="about__text">
                                <p>Наша платформа объединяет людей и специалистов, создавая пространство, где можно безопасно открываться, понимать себя и находить поддержку.</p>
                                <p>Мы создаём сообщество, где каждый может глубже понять себя. Искренность, уважение и вовлечённость помогают нам быть рядом с вами.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default About;
