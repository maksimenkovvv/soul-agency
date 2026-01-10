import React from 'react';
import PsychologistTitle from '../components/PsychologistsTitle';
import OurPsychologists from '../components/OurPsychologistsBlock';
import Filters from '../components/filters/Filters';

function Psychologist() {
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
            <OurPsychologists showTitle={false} query={filters} allowLoadMore />
        </div>
    );
}

export default Psychologist;
