import React from 'react';
import PsychologistTitle from '../components/PsychologistsTitle';
import Filters from '../components/filters/Filters';
import OurGroupSessions from "../components/OurGroupSessions";

function Sessions() {
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
            <OurGroupSessions showTitle={false} query={filters} allowLoadMore />
        </div>
    );
}

export default Sessions;
