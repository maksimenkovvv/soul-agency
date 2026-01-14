import React from 'react';
import PsychologistTitle from '../components/PsychologistsTitle';
import OurSessions from '../components/OurSessions';
import Filters from '../components/filters/Filters';

function Sessions2() {
    const [filters, setFilters] = React.useState({
        q: "",
        themes: [],
        methods: [],
        experience: [],
        price: [],
    });

    const handleFilterChange = (next) => {
        setFilters(next);
    };

    return (
        <div className="psychologists">
            <PsychologistTitle />
            <Filters value={filters} onFilterChange={handleFilterChange} />
            <OurSessions showTitle={false} query={filters} allowLoadMore />
        </div>
    );
}

export default Sessions2;
