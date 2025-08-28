import React from 'react';

function Faq() {
    return (
        <div className="faq gray-bg">
            <h2 className="faq__title">FAQ</h2>
            <ul className="faq__list list__faq">
                <li className="faq__list-item list__faq-item">1. Что такое онлайн - терапия и как это работает?</li>
                <li className="faq__list-item list__faq-item">2. Насколько это эффективно по сравнению с очными сессиями?</li>
                <li className="faq__list-item list__faq-item">3. Что происходит на первой сессии?</li>
                <li className="faq__list-item list__faq-item">4. Сколько потребуется сессий и как быстро я почувствую эффект?</li>
                <li className="faq__list-item list__faq-item">5. Как обеспечивается конфиденциальность и безопасность?</li>
                <li className="faq__list-item list__faq-item">6. Подходит ли терапия, если у меня нет острого кризиса?</li>
                <li className="faq__list-item list__faq-item">7. Как выбрать подходящего специалиста?</li>
                <li className="faq__list-item list__faq-item">8. Насколько важна регулярность сессий?</li>
                <li className="faq__list-item list__faq-item">9. Что делать, если кажется, что терапия не работает?</li>
                <li className="faq__list-item list__faq-item">10. Можно ли продолжать терапию после переезда?</li>
            </ul>
        </div>
    );
};

export default Faq;