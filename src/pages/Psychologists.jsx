import React from 'react';
import PsychologistTitle from '../components/PsychologistsTitle';
import OurPsychologists from '../components/OurPsychologistsBlock';
import Filters from '../components/filters/Filters';

function Psychologist() {
    const handleFilterChange = (filters) => {
        // TODO: подключить API и фильтрацию списка психологов
        console.log('Фильтры:', filters);
    };

    return (
        <div className="psychologists">
            <PsychologistTitle />
            <Filters onFilterChange={handleFilterChange} />
            <OurPsychologists showTitle={false} />
        </div>
    );
}

export default Psychologist;
