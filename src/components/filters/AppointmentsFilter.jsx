import React from 'react';

function AppointmentFilters({ onFilterChange, currentFilter }) {
    return (
        <div className="b-appointment-filters">
            <button
                className={`appointment-filters__button ${currentFilter === 'all' ? 'active' : ''}`}
                onClick={() => onFilterChange('all')}
            >
                Все
            </button>
            <button
                className={`appointment-filters__button ${currentFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => onFilterChange('upcoming')}
            >
                Предстоящие
            </button>
            <button
                className={`appointment-filters__button ${currentFilter === 'past' ? 'active' : ''}`}
                onClick={() => onFilterChange('past')}
            >
                Прошедшие
            </button>
        </div>
    );
}

export default AppointmentFilters;
