// Компонент, отвечающий за вывод контента вкладки "Записи", когда роль - user
import React from 'react';
import Search from '../../filters/Search';
import AppointmentCards from './AppointmentCards';

function ClientAppointments() {
    const [filter, setFilter] = React.useState('all'); // Состояние для текущего фильтра


    const handleSearch = (query) => {
        // Логика обработки поиска
        console.log('Поиск:', query);
    };

    const handleFilterChange = (newFilter) => {
        // Логика обработки фильтров записей
        setFilter(newFilter); // Обновляем состояние фильтра
    };

    return (
        <div className="b-appointments">
            <div className="appointments-client">
                {/* поиск */}
                <Search
                    showAppointmentFilters={true}
                    onSearch={handleSearch}
                    onFilterChange={handleFilterChange}
                    currentFilter={filter}
                />
                <AppointmentCards filter={filter} />
            </div>
        </div>
    );
}

export default ClientAppointments;
