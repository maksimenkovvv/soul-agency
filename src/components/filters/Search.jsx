import React from "react";
import AppointmentFilters from "./AppointmentsFilter";

const Search = ({
                    showAppointmentFilters = false,
                    onSearch,
                    value,
                    onFilterChange,
                    currentFilter,
                }) => {
    const [searchTerm, setSearchTerm] = React.useState(value ?? "");

    // sync from outside
    React.useEffect(() => {
        if (value === undefined) return;
        setSearchTerm(value ?? "");
    }, [value]);

    // debounce
    React.useEffect(() => {
        if (typeof onSearch !== "function") return;
        const timerId = setTimeout(() => onSearch(searchTerm), 350);
        return () => clearTimeout(timerId);
    }, [searchTerm, onSearch]);

    return (
        <div className="b-search">
      <span className="b-search__icon" aria-hidden="true">
        {/* можно заменить на ваш svg */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
              d="M9.55 18.1C14.272 18.1 18.1 14.272 18.1 9.55C18.1 4.82798 14.272 1 9.55 1C4.82798 1 1 4.82798 1 9.55C1 14.272 4.82798 18.1 9.55 18.1Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
          />
          <path
              d="M19.0001 19.0001L17.2001 17.2001"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
          />
        </svg>
      </span>

            <input
                type="text"
                className="b-search__input"
                placeholder="Имя, стаж, метод"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {showAppointmentFilters && (
                <div className="b-search__apptFilters">
                    <AppointmentFilters onFilterChange={onFilterChange} currentFilter={currentFilter} />
                </div>
            )}
        </div>
    );
};

export default Search;
