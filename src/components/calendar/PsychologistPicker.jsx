import React from "react";

export default function PsychologistPicker({ psychologists = [], value, onChange }) {
    return (
        <div className="b-psy-picker">
            <div className="b-psy-picker__title">Выбор психолога</div>

            <div className="b-psy-picker__list">
                {psychologists.map((p) => {
                    const active = value?.id === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            className={`b-psy-card ${active ? "is-active" : ""}`}
                            onClick={() => onChange?.(p)}
                        >
                            <div className="b-psy-card__avatar">
                                {p.image ? <img src={p.image} alt={p.name} /> : <div className="b-psy-card__placeholder" />}
                            </div>
                            <div className="b-psy-card__meta">
                                <div className="b-psy-card__name">{p.name}</div>
                                {p.experience ? <div className="b-psy-card__sub">Опыт: {p.experience}</div> : null}
                                {p.priceLabel ? <div className="b-psy-card__price">{p.priceLabel}</div> : null}
                            </div>
                            <div className="b-psy-card__chev">›</div>
                        </button>
                    );
                })}

                {psychologists.length === 0 ? (
                    <div className="b-psy-picker__empty">Список психологов загрузится отсюда (API). Пока — демо.</div>
                ) : null}
            </div>
        </div>
    );
}
