import React from "react";

function PsychologistModal({ isOpen, psychologist, onClose, type = "psychologist" }) {
    // Состояния для развертывания текста
    const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);
    const [isEducationExpanded, setIsEducationExpanded] = React.useState(false);

    // Состояние для выбранной даты
    const [selectedDate, setSelectedDate] = React.useState(null);

    if (!isOpen || !psychologist) return null;

    // Проверка на длину текста
    const shouldShowDescriptionButton = psychologist.description && psychologist.description.length > 150;
    const shouldShowEducationButton = psychologist.education && psychologist.education.length > 100;

    // Обрезка текста
    const truncateText = (text, maxLength, isExpanded) => {
        if (!text) return "";
        return isExpanded ? text : text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
    };

    // Функция для обработки клика по дате
    const handleDateClick = (date) => {
        // Если кликнули на уже выбранную дату - снимаем выбор
        if (selectedDate === date) {
            setSelectedDate(null);
        } else {
            // Иначе выбираем новую дату
            setSelectedDate(date);
        }
    };

    // Определяем, что показывать в зависимости от типа
    const renderContent = () => {
        if (type === "session") {
            return (
                <>
                    <div className="psychologist-modal__avatar">
                        <img src={psychologist.image} alt={psychologist.title || psychologist.name} />
                    </div>
                    <div className="psychologist-modal__header">
                        <h2 className="psychologist-modal__header-name">{psychologist.title || psychologist.name}</h2>
                        <p className="psychologist-modal__header-price">
                            Групповая сессия {psychologist.sessionDuration} мин {psychologist.pricePerSession}₽
                        </p>
                        <div className="psychologist-modal__header-info">
                            <div className="psychologist-modal__header-info__dates psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__dates-title psychologist-modal__header-info__row-data">Время</div>
                                <div className="psychologist-modal__header-info__dates-item psychologist-modal__header-info__row-data">{psychologist.date}</div>
                            </div>
                            <div className="psychologist-modal__header-info__psychologist psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__psychologist-title psychologist-modal__header-info__row-data">Психолог</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.name}</div>
                            </div>
                            <div className="psychologist-modal__header-info__participants psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__participants-title psychologist-modal__header-info__row-data">Кол-во мест</div>
                                <div className="psychologist-modal__header-info__row-data">2/5</div>
                            </div>
                            <div className="psychologist-modal__header-info__themes psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__themes-title psychologist-modal__header-info__row-data">Темы</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.themes || "Не указаны"}</div>
                            </div>
                            <div className="psychologist-modal__header-info__method psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__method-title psychologist-modal__header-info__row-data">Метод</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.method || "Не указан"}</div>
                            </div>
                            <div className="psychologist-modal__header-info__description psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__description-title psychologist-modal__header-info__row-data">Описание</div>
                                <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                    {truncateText(psychologist.description, 150, isDescriptionExpanded)}
                                    {shouldShowDescriptionButton && (
                                        <button
                                            className="psychologist-modal__expand-button"
                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        >
                                            {isDescriptionExpanded ? "Свернуть" : "Развернуть"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="psychologist-modal__bottom">
                        <div className="psychologist-modal__bottom-price">{psychologist.pricePerSession}₽</div>
                        <div className="psychologist-modal__bottom-date">{psychologist.date}</div>
                        <button
                            className="psychologist-modal__bottom-button b-btn"
                            onClick={() => {
                                console.log("Запись на сессию:", {
                                    session: psychologist.title,
                                    psychologist: psychologist.name,
                                    date: psychologist.date,
                                    price: psychologist.pricePerSession
                                });
                                alert('Записались на сессию!');
                            }}
                        >
                            Перейти к оплате
                        </button>
                    </div>
                </>
            );
        } else {
            // Для психологов показываем другой контент
            return (
                <>
                    <div className="psychologist-modal__avatar">
                        <img src={psychologist.image} alt={psychologist.name} />
                    </div>
                    <div className="psychologist-modal__header">
                        <h2 className="psychologist-modal__header-name">{psychologist.name}, {psychologist.age} лет</h2>
                        <p className="psychologist-modal__header-price">
                            Индивидуальная сессия {psychologist.sessionDuration} мин {psychologist.pricePerSession}₽
                        </p>
                        <div className="psychologist-modal__header-info">
                            <div className="psychologist-modal__header-info__dates psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__dates-title psychologist-modal__header-info__row-data">Время</div>
                                <div className="psychologist-modal__header-info__dates-items psychologist-modal__header-info__row-data">
                                    {psychologist.availableDates?.map((date, index) => (
                                        <span
                                            key={index}
                                            className={`psychologist-modal__header-info__dates-item ${selectedDate === date ? 'is-selected' : ''}`}
                                            onClick={() => handleDateClick(date)}
                                        >
                                            {date}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="psychologist-modal__header-info__experience psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__experience-title psychologist-modal__header-info__row-data">Опыт</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.experience}</div>
                            </div>
                            <div className="psychologist-modal__header-info__education psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__education-title psychologist-modal__header-info__row-data">Образование</div>
                                <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                    {truncateText(psychologist.education, 100, isEducationExpanded)}
                                    {shouldShowEducationButton && (
                                        <button
                                            className="psychologist-modal__expand-button"
                                            onClick={() => setIsEducationExpanded(!isEducationExpanded)}
                                        >
                                            {isEducationExpanded ? "Свернуть" : "Развернуть"}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="psychologist-modal__header-info__themes psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__themes-title psychologist-modal__header-info__row-data">Темы</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.themes}</div>
                            </div>
                            <div className="psychologist-modal__header-info__methods psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__methods-title psychologist-modal__header-info__row-data">Метод</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.method}</div>
                            </div>
                            <div className="psychologist-modal__header-info__description psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__description-title psychologist-modal__header-info__row-data">Описание</div>
                                <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                    {truncateText(psychologist.description, 150, isDescriptionExpanded)}
                                    {shouldShowDescriptionButton && (
                                        <button
                                            className="psychologist-modal__expand-button"
                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        >
                                            {isDescriptionExpanded ? "Свернуть" : "Развернуть"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="psychologist-modal__bottom">
                        {selectedDate ? (
                            <>
                                <div className="psychologist-modal__bottom-price">{psychologist.pricePerSession}₽</div>
                                <div className="psychologist-modal__bottom-date">{selectedDate}</div>
                                <button
                                    className="psychologist-modal__bottom-button b-btn"
                                    onClick={() => {
                                        console.log("Переход к оплате:", {
                                            psychologist: psychologist.name,
                                            date: selectedDate,
                                            price: psychologist.pricePerSession
                                        });
                                        alert('Оплачено');
                                    }}
                                >
                                    Перейти к оплате
                                </button>
                            </>
                        ) : (
                            <button
                                className="psychologist-modal__bottom-button b-btn"
                                onClick={() => {
                                    alert('Календарь');
                                }}
                            >
                                Выбрать время
                            </button>
                        )}
                    </div>
                </>
            );
        }
    };

    return (
        <div className={`psychologist-modal ${isOpen ? 'is-open' : ''}`}>
            {/* оверлей */}
            <div
                className="psychologist-modal__overlay"
                onClick={onClose}
            />

            <div className="psychologist-modal__content">
                <button
                    type="button"
                    className="psychologist-modal__close"
                    onClick={onClose}
                    aria-label="Закрыть"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {renderContent()}
            </div>
        </div>
    );
}

export default PsychologistModal;