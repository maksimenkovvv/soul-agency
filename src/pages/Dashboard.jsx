import React, { useState } from 'react';

import Sidebar from '../components/Sidebar';
import ContentArea from '../components/ContentArea';

import photo from '../assets/img/psychologist-1.webp'

function Dashboard() {
    const [activeTab, setActiveTab] = useState('Записи');
    const [user, setUser] = useState({
        name: 'Мария Иванова',
        email: 'example@google.com',
        role: 'client', // или 'psychologist' / client - обычный пользователь, psychologist - психолог
        avatar: photo,
        appointments: [],
        favorites: [],
        schedule: [],
    });

    return (
        <div className="dashboard">
            <Sidebar user={user} setActiveTab={setActiveTab} activeTab={activeTab} />
            <ContentArea activeTab={activeTab} user={user} />
        </div>
    );
}

export default Dashboard;
