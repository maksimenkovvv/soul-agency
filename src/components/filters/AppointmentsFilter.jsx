import React from "react";

function AppointmentFilters({ onFilterChange, currentFilter }) {
    return (
        <div className="b-appointment-filters" role="tablist" aria-label="Фильтр записей">
            <button
                type="button"
                className={`appointment-filters__button ${currentFilter === "all" ? "active" : ""}`}
                onClick={() => onFilterChange("all")}
            >
                Все
            </button>
            <button
                type="button"
                className={`appointment-filters__button ${currentFilter === "upcoming" ? "active" : ""}`}
                onClick={() => onFilterChange("upcoming")}
            >
                Предстоящие
            </button>
            <button
                type="button"
                className={`appointment-filters__button ${currentFilter === "past" ? "active" : ""}`}
                onClick={() => onFilterChange("past")}
            >
                Прошедшие
            </button>
        </div>
    );
}

export default AppointmentFilters;
