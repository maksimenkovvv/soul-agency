import React from 'react';

function Appointments({ user }) {
    return (
        <div className="appointments">
            {/* логика отображения записей */}
            <h2>Записи</h2>
            {user.appointments.map((appointment, index) => (
                <div key={index} className="appointment-item">
                    {/* отображение инфы о записи */}
                </div>
            ))}
        </div>
    );
}

export default Appointments;
