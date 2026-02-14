import React from 'react';

import Appointments from './appointments/Appointments';
import ClientAppointments from './appointments/client/ClientAppointments';
import Favorites from './Favorites';
import Schedule from './Schedule';
import GroupSessions from './groupSessions/GroupSessions';
import Payments from './payments/Payments';

function ContentArea({ activeTab, user }) {
    switch (activeTab) {
        case 'Мои записи':
            return <ClientAppointments user={user} />;
        case 'Записи':
            return <Appointments user={user} />;
        case 'Избранное':
            return <Favorites user={user} />;
        case 'Платежи':
            return <Payments user={user} />;
        case 'График работы':
            return <Schedule user={user} />;
        case 'Групповые сессии':
            return <GroupSessions user={user} />;
        default:
            return <Appointments user={user} />;
    }
}

export default ContentArea;
