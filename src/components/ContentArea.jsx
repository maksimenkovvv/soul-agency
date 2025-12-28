import React from 'react';

import Appointments from './appointments/Appointments';
import Favorites from './Favorites';
import Schedule from './Schedule';

function ContentArea({ activeTab, user }) {
    switch (activeTab) {
        case 'Записи':
            return <Appointments user={user} />;
        case 'Избранное':
            return <Favorites user={user} />;
        case 'График работы':
            return <Schedule user={user} />;
        default:
            return <Appointments user={user} />;
    }
}

export default ContentArea;
