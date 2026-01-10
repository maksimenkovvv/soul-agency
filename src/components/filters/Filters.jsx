import React from 'react';
import ThemeFilter from './ThemeFilter';
import MethodFilter from './MethodFilter';
import ExperienceFilter from './ExperienceFilter';
import PriceFilter from './PriceFilter';
import Search from './Search';

const Filters = ({ onFilterChange, value }) => {
    const [filters, setFilters] = React.useState({
        q: "",
        themes: [],
        methods: [],
        experience: [],
        price: [],
    });

    // allow controlled usage (e.g. parent keeps state)
    React.useEffect(() => {
        if (!value) return;
        setFilters((prev) => ({ ...prev, ...value }));
    }, [value]);

    const handleThemeChange = (selectedThemes) => {
        const updatedFilters = { ...filters, themes: selectedThemes };
        setFilters(updatedFilters);
        onFilterChange(updatedFilters);
    };

    const handleMethodChange = (selectedMethods) => {
        const updatedFilters = { ...filters, methods: selectedMethods };
        setFilters(updatedFilters);
        onFilterChange(updatedFilters);
    };

    const handleExperienceChange = (selectedExperience) => {
        const updatedFilters = { ...filters, experience: selectedExperience };
        setFilters(updatedFilters);
        onFilterChange(updatedFilters);
    };

    const handlePriceChange = (selectedPrice) => {
        const updatedFilters = { ...filters, price: selectedPrice };
        setFilters(updatedFilters);
        onFilterChange(updatedFilters);
    };

    const handleSearch = (q) => {
        const updatedFilters = { ...filters, q: q ?? "" };
        setFilters(updatedFilters);
        onFilterChange(updatedFilters);
    };

    return (
        <div className="b-filters">
            <Search
                showAppointmentFilters={false}
                value={filters.q}
                onSearch={handleSearch}
            />

            <div className="b-filters__row">
                <ThemeFilter value={filters.themes} onApply={handleThemeChange} />
                <MethodFilter value={filters.methods} onApply={handleMethodChange} />
                <ExperienceFilter value={filters.experience} onApply={handleExperienceChange} />
                <PriceFilter value={filters.price} onApply={handlePriceChange} />
            </div>
        </div>
    );

};

export default Filters;
