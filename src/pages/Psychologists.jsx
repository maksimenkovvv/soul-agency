import React from 'react';
import PsychologistTitle from '../components/PsychologistsTitle';
import OurPsychologists from '../components/OurPsychologistsBlock';
import Filters from '../components/filters/Filters';

function Psychologist() {
    const [filteredPsychologists, setFilteredPsychologists] = React.useState([]);

    const handleFilterChange = (filters) => {
        console.log("Фильтры:", filters);
    };

    return (
        <div className="psychologists">
            <PsychologistTitle />
            <Filters onFilterChange={handleFilterChange} />
            <OurPsychologists showTitle={false} psychologists={filteredPsychologists} />
        </div>
    );
}

export default Psychologist;
