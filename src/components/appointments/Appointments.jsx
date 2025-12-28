/*Компонент, отвечающий за вкладку "Записи" у ролей "Клиент" и "Психолог"*/
import React from 'react';
import ClientAppointments from './client/ClientAppointments';
import PsychologistAppointments from './psycho/PsychologistAppointments';

function Appointments({ user }) {
    return (
        <div className="b-appointments">
            {user.role === 'client' ? (
                /*Компонент, выводящий контент во вкладке "Записи" в случае, если роль "Клиент"*/
                <ClientAppointments user={user} />
            ) : (
                /*Компонент, выводящий контент во вкладке "Записи" в случае, если роль "Психолог"*/
                <PsychologistAppointments user={user} />
            )}
        </div>
    );
}

export default Appointments;
