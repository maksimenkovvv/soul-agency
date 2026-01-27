import React from 'react';

function Feedback() {
  const formUrl = 'https://forms.yandex.ru/u/6960be28d04688842113c659';

  return (
    <div className="feedback">
      <div className="feedback__header">
        <div className="feedback__header-digit b-digit">05</div>
        <h2 className="feedback__header-title">Обратная связь</h2>
      </div>
      <div className="feedback__button">
        <a
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="b-btn b-btn--transparent"
        >
          Связаться
        </a>
      </div>
    </div>
  );
}

export default Feedback;
