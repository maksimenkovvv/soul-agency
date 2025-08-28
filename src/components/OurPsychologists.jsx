import React from 'react';

function OurPsychologists() {
    return (
        <div className="psychologists">
            <h2 className="psychologists__title">Наши психологи</h2>
            <div className="psychologists__item-wrapper">
                <div className="psychologists__item">
                    <div className="psychologists__item-top"></div>
                    <div className="psychologists__item-bottom">
                        <p className="psychologists__item-bottom__name">Фамилия Имя</p>
                        <p className="psychologists__item-bottom__experience">Опыт работы</p>
                        <p className="psychologists__item-bottom__method-title">Метод</p>
                        <div className="psychologists__item-bottom__method-wrapper">
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                        </div>
                        <p className="psychologists__item-bottom__price">Цена</p>
                        <a href="#" className="psychologists__item-bottom__button b-btn">К специалисту</a>
                    </div>
                </div>
                <div className="psychologists__item">
                    <div className="psychologists__item-top"></div>
                    <div className="psychologists__item-bottom">
                        <p className="psychologists__item-bottom__name">Фамилия Имя</p>
                        <p className="psychologists__item-bottom__experience">Опыт работы</p>
                        <p className="psychologists__item-bottom__method-title">Метод</p>
                        <div className="psychologists__item-bottom__method-wrapper">
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                        </div>
                        <p className="psychologists__item-bottom__price">Цена</p>
                        <a href="#" className="psychologists__item-bottom__button b-btn">К специалисту</a>
                    </div>
                </div>
                <div className="psychologists__item">
                    <div className="psychologists__item-top"></div>
                    <div className="psychologists__item-bottom">
                        <p className="psychologists__item-bottom__name">Фамилия Имя</p>
                        <p className="psychologists__item-bottom__experience">Опыт работы</p>
                        <p className="psychologists__item-bottom__method-title">Метод</p>
                        <div className="psychologists__item-bottom__method-wrapper">
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                            <p className="psychologists__item-bottom__method-tag">специализация</p>
                        </div>
                        <p className="psychologists__item-bottom__price">Цена</p>
                        <a href="#" className="psychologists__item-bottom__button b-btn">К специалисту</a>
                    </div>
                </div>
            </div>
            <a href="#" className="psychologists__button b-btn">Посмотреть всех</a>
        </div>
    );
}

export default OurPsychologists;