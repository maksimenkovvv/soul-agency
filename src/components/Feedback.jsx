import React from 'react';

function Feedback() {
    return (
        <div className="feedback">
            <div className="feedback__header">
                <div className="feedback__header-digit b-digit">05</div>
                <h2 className="feedback__header-title">Обратная связь</h2>
            </div>
            <div className="feedback__button">
                <a href="" className="b-btn b-btn--transparent">Связаться</a>
            </div>
        </div>
    );
};

export default Feedback;