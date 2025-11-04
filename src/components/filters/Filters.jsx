import React from 'react';
import ThemeFilter from './ThemeFilter';
import MethodFilter from './MethodFilter';
import ExperienceFilter from './ExperienceFilter';
import PriceFilter from './PriceFilter';
import Search from './Search';

const Filters = ({ onFilterChange }) => {
    const [filters, setFilters] = React.useState({
        themes: [],
        methods: [],
        experience: [],
        price: [],
    });

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

    return (
        <div className="b-filters">
            <Search />
            <ThemeFilter onApply={handleThemeChange} />
            <MethodFilter onApply={handleMethodChange} />
            <ExperienceFilter onApply={handleExperienceChange} />
            <PriceFilter onApply={handlePriceChange} />
        </div>
    );
};

export default Filters;
