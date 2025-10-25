import React, { useState } from 'react';
import arrow from '../assets/img/arrow_faq.svg';

function Faq() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleItem = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="faq">
            <div className="faq__header">
                <div className="faq__header-digit b-digit">04</div>
                <h2 className="faq__header-title">FAQ</h2>
            </div>
            <div className="faq__list">
                <div
                    className={`faq__list-item ${openIndex === 0 ? 'open' : ''}`}
                    onClick={() => toggleItem(0)}
                >
                    <img
                        className="faq__list-item__arrow"
                        src={arrow}
                        alt="arrow"
                    />
                    <div className="faq__list-item__title">Что происходит на первой сессии?</div>
                    <div className="faq__list-item__description">
                        Первая встреча обычно длится 50 минут. Вы знакомитесь с терапевтом, обсуждаете свой запрос, цели и возможные форматы работы. Также затрагиваются вопросы конфиденциальности, и вы совместно определяете частоту дальнейших сессий. После этой встречи вы принимаете решение о продолжении без каких‑либо обязательств.
                    </div>
                </div>
                <div
                    className={`faq__list-item ${openIndex === 1 ? 'open' : ''}`}
                    onClick={() => toggleItem(1)}
                >
                    <img
                        className="faq__list-item__arrow"
                        src={arrow}
                        alt="arrow"
                    />
                    <div className="faq__list-item__title">Сколько потребуется сессий и как быстро я почувствую эффект?</div>
                    <div className="faq__list-item__description">
                        Первая встреча обычно длится 50 минут. Вы знакомитесь с терапевтом, обсуждаете свой запрос, цели и возможные форматы работы. Также затрагиваются вопросы конфиденциальности, и вы совместно определяете частоту дальнейших сессий. После этой встречи вы принимаете решение о продолжении без каких‑либо обязательств.
                    </div>
                </div>
                <div
                    className={`faq__list-item ${openIndex === 2 ? 'open' : ''}`}
                    onClick={() => toggleItem(2)}
                >
                    <img
                        className="faq__list-item__arrow"
                        src={arrow}
                        alt="arrow"
                    />
                    <div className="faq__list-item__title">Как обеспечивается конфиденциальность и безопасность?</div>
                    <div className="faq__list-item__description">
                        Первая встреча обычно длится 50 минут. Вы знакомитесь с терапевтом, обсуждаете свой запрос, цели и возможные форматы работы. Также затрагиваются вопросы конфиденциальности, и вы совместно определяете частоту дальнейших сессий. После этой встречи вы принимаете решение о продолжении без каких‑либо обязательств.
                    </div>
                </div>
                <div
                    className={`faq__list-item ${openIndex === 3 ? 'open' : ''}`}
                    onClick={() => toggleItem(3)}
                >
                    <img
                        className="faq__list-item__arrow"
                        src={arrow}
                        alt="arrow"
                    />
                    <div className="faq__list-item__title">Подходит ли терапия, если у меня нет острого кризиса?</div>
                    <div className="faq__list-item__description">
                        Первая встреча обычно длится 50 минут. Вы знакомитесь с терапевтом, обсуждаете свой запрос, цели и возможные форматы работы. Также затрагиваются вопросы конфиденциальности, и вы совместно определяете частоту дальнейших сессий. После этой встречи вы принимаете решение о продолжении без каких‑либо обязательств.
                    </div>
                </div>
                <div
                    className={`faq__list-item ${openIndex === 4 ? 'open' : ''}`}
                    onClick={() => toggleItem(4)}
                >
                    <img
                        className="faq__list-item__arrow"
                        src={arrow}
                        alt="arrow"
                    />
                    <div className="faq__list-item__title">Что делать, если кажется, что терапия не работает?</div>
                    <div className="faq__list-item__description">
                        Первая встреча обычно длится 50 минут. Вы знакомитесь с терапевтом, обсуждаете свой запрос, цели и возможные форматы работы. Также затрагиваются вопросы конфиденциальности, и вы совместно определяете частоту дальнейших сессий. После этой встречи вы принимаете решение о продолжении без каких‑либо обязательств.
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Faq;
