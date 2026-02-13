import React from 'react';
import { dictApi } from '../../api/dictApi';

import closeBtn from '../../assets/img/close-filters.svg';

// Methods dictionary filter (by methodId)
// onApply получает массив: либо объектов {id, title, ...}, либо чисел (id)
// (психологиApi умеет оба варианта)
const MethodFilter = ({ onApply, value }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedOptions, setSelectedOptions] = React.useState([]);
  const filterRef = React.useRef(null);

  const [methods, setMethods] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');

  // sync controlled value -> local state
  React.useEffect(() => {
    if (value == null) return;
    setSelectedOptions(Array.isArray(value) ? value : []);
  }, [value]);

  // load methods dictionary
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setLoadError('');

        const res = await dictApi.methods();
        const arr = Array.isArray(res) ? res : res?.content || res?.items || [];

        const norm = (arr || [])
          .map((x) => ({
            id: x?.id,
            code: x?.code,
            title: x?.title ?? x?.name ?? x?.label,
            isActive: x?.isActive ?? x?.active ?? true,
          }))
          .filter((x) => x?.id != null && x?.title);

        if (!alive) return;
        setMethods(norm);
      } catch (e) {
        if (!alive) return;
        setLoadError(e?.message || 'Не удалось загрузить методы');
        setMethods([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Добавлен useEffect для отслеживания кликов вне области фильтра
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Блокировка скролла на мобильных устройствах
    if (isOpen && window.innerWidth <= 1239) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Восстанавливаем скролл при размонтировании
      document.body.style.overflow = '';
    };
  }, [isOpen]); // Добавлен isOpen в зависимости

  const isSelected = (opt) => {
    const id = opt?.id;
    return selectedOptions.some((x) => (x?.id ?? x) === id);
  };

  const toggleOption = (opt) => {
    const id = opt?.id;
    if (id == null) return;

    setSelectedOptions((prev) => {
      const exists = prev.some((x) => (x?.id ?? x) === id);
      if (exists) return prev.filter((x) => (x?.id ?? x) !== id);
      return [...prev, opt];
    });
  };

  const clearSelection = () => {
    setSelectedOptions([]);
    onApply?.([]);
  };

  const handleApply = () => {
    onApply?.(selectedOptions);
    setIsOpen(false);
  };

  const hasSelected = selectedOptions.length > 0;

  return (
    <div
      className={`filter ${isOpen ? 'is-open' : ''}`}
      ref={filterRef}
    >
      <button
        type="button"
        className={`filter-header ${hasSelected ? 'selected' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="filter-header-text">
          {hasSelected ? `Метод: ${selectedOptions.length}` : 'Метод'}
        </span>

        {/* marker: либо крест (если выбрано), либо стрелка */}
        {hasSelected ? (
          <span
            className="filter-header-marker filter-header-marker--clear"
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            role="button"
            tabIndex={0}
            aria-label="Очистить"
            title="Очистить"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.3333 6.33333L6.33333 11.3333M6.33333 6.33333L11.3333 11.3333M17.1667 8.83333C17.1667 13.4357 13.4357 17.1667 8.83333 17.1667C4.23096 17.1667 0.5 13.4357 0.5 8.83333C0.5 4.23096 4.23096 0.5 8.83333 0.5C13.4357 0.5 17.1667 4.23096 17.1667 8.83333Z"
                stroke="#313235"
                strokeOpacity="0.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : (
          <span
            className="filter-header-marker"
            aria-hidden="true"
          >
            <svg
              width="9"
              height="5"
              viewBox="0 0 9 5"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0.5 0.5L4.5 4.5L8.5 0.5"
                stroke="#313235"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </button>

      <div
        className="filter-options"
        aria-hidden={!isOpen}
      >
        <button
          className="filter-options__close"
          onClick={() => setIsOpen(false)}
        >
          <img
            src={closeBtn}
            alt="Закрыть"
          />
        </button>
        <div className="filter-options__header">Метод</div>
        {loading ? <div className="filter__state">Загрузка…</div> : null}
        {!loading && loadError ? <div className="filter__state">{loadError}</div> : null}
        {!loading && !loadError && (methods || []).length === 0 ? (
          <div className="filter__state">Методов нет</div>
        ) : null}

        {(methods || []).map((method, index) => {
          const title = method?.title;
          const selected = isSelected(method);
          const disabled = method?.isActive === false;

          return (
            <button
              key={method?.id ?? index}
              type="button"
              className={`filter-option ${selected ? 'selected' : ''} ${
                disabled ? 'is-disabled' : ''
              }`}
              onClick={() => {
                // нельзя выбрать неактивное, но можно снять выбор, если уже выбрано
                if (disabled && !selected) return;
                toggleOption(method);
              }}
            >
              <span className="filter-option-text">{title}</span>
              {selected ? (
                <span
                  className="filter-mark"
                  aria-hidden="true"
                >
                  <svg
                    width="18"
                    height="13"
                    viewBox="0 0 18 13"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17 1L6 12L1 7"
                      stroke="#8885FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </button>
          );
        })}

        {hasSelected ? (
          <div className="filter__footer">
            <button
              type="button"
              className="clear-button"
              onClick={clearSelection}
            >
              <span
                className="clear-mark"
                aria-hidden="true"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.5 20.5C16.0228 20.5 20.5 16.0228 20.5 10.5C20.5 4.97715 16.0228 0.5 10.5 0.5C4.97715 0.5 0.5 4.97715 0.5 10.5C0.5 16.0228 4.97715 20.5 10.5 20.5Z"
                    fill="#8885FF"
                  />
                  <path
                    d="M13.5 7.5L7.5 13.5L13.5 7.5Z"
                    fill="#8885FF"
                  />
                  <path
                    d="M7.5 7.5L13.5 13.5L7.5 7.5Z"
                    fill="#8885FF"
                  />
                  <path
                    d="M13.5 7.5L7.5 13.5M7.5 7.5L13.5 13.5M20.5 10.5C20.5 16.0228 16.0228 20.5 10.5 20.5C4.97715 20.5 0.5 16.0228 0.5 10.5C0.5 4.97715 4.97715 0.5 10.5 0.5C16.0228 0.5 20.5 4.97715 20.5 10.5Z"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Очистить
            </button>

            <button
              type="button"
              className="b-btn apply-button"
              onClick={handleApply}
            >
              Применить
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MethodFilter;
