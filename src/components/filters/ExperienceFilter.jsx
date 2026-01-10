import React from 'react';

const ExperienceFilter = ({ onApply, value }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedOptions, setSelectedOptions] = React.useState([]);

    React.useEffect(() => {
        if (!value) return;
        setSelectedOptions(Array.isArray(value) ? value : []);
    }, [value]);
    const filterRef = React.useRef(null);  // Добавлен useRef для отслеживания DOM-элемента

    const experiences = [
        "от 1 до 3 лет",
        "от 3 до 5 лет",
        "от 5 до 10 лет",
        "от 10 до 15 лет",
        "от 15 лет",
    ];

    // Добавлен useEffect для отслеживания кликов вне области фильтра
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleOption = (option) => {
        if (selectedOptions.includes(option)) {
            setSelectedOptions(selectedOptions.filter((item) => item !== option));
        } else {
            setSelectedOptions([...selectedOptions, option]);
        }
    };

    const clearSelection = () => {
        setSelectedOptions([]);
        onApply([]);
    };

    const handleApply = () => {
        onApply(selectedOptions);
        setIsOpen(false);
    };

    return (
        <div className={`filter ${isOpen ? 'is-open' : ''}`} ref={filterRef}>
            <div
                className={`filter-header ${selectedOptions.length > 0 ? 'selected' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOptions.length > 0 ? (
                    <>
                        Опыт, ещё {selectedOptions.length}
                        <div className="filter-header-marker" onClick={(e) => {
                            e.stopPropagation();
                            clearSelection();
                        }}>
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.3333 6.33333L6.33333 11.3333M6.33333 6.33333L11.3333 11.3333M17.1667 8.83333C17.1667 13.4357 13.4357 17.1667 8.83333 17.1667C4.23096 17.1667 0.5 13.4357 0.5 8.83333C0.5 4.23096 4.23096 0.5 8.83333 0.5C13.4357 0.5 17.1667 4.23096 17.1667 8.83333Z" stroke="#313235" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </>
                ) : (
                    <>
                        Опыт
                        <div className="filter-header-marker">
                            <svg width="9" height="5" viewBox="0 0 9 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0.5 0.5L4.5 4.5L8.5 0.5" stroke="#313235" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </>
                )}
            </div>
            <div className="filter-options" aria-hidden={!isOpen}>
                    {experiences.map((experience, index) => (
                        <div
                            key={index}
                            className={`filter-option ${selectedOptions.includes(experience) ? 'selected' : ''}`}
                            onClick={() => toggleOption(experience)}
                        >
                            {experience}
                            {selectedOptions.includes(experience) && (
                                <div className="filter-mark">
                                    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17 1L6 12L1 7" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                    {selectedOptions.length > 0 && (
                        <button className="clear-button" onClick={clearSelection}>
                            <div className="clear-mark">
                                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.5 20.5C16.0228 20.5 20.5 16.0228 20.5 10.5C20.5 4.97715 16.0228 0.5 10.5 0.5C4.97715 0.5 0.5 4.97715 0.5 10.5C0.5 16.0228 4.97715 20.5 10.5 20.5Z" fill="#8885FF" />
                                    <path d="M13.5 7.5L7.5 13.5L13.5 7.5Z" fill="#8885FF" />
                                    <path d="M7.5 7.5L13.5 13.5L7.5 7.5Z" fill="#8885FF" />
                                    <path d="M13.5 7.5L7.5 13.5M7.5 7.5L13.5 13.5M20.5 10.5C20.5 16.0228 16.0228 20.5 10.5 20.5C4.97715 20.5 0.5 16.0228 0.5 10.5C0.5 4.97715 4.97715 0.5 10.5 0.5C16.0228 0.5 20.5 4.97715 20.5 10.5Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            Очистить выбор
                        </button>
                    )}
                    {selectedOptions.length > 0 && (
                        <button className="b-btn apply-button" onClick={handleApply}>
                            Применить
                        </button>
                    )}
            </div>
        </div>
    );
};

export default ExperienceFilter;
