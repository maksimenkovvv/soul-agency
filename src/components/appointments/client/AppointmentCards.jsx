// Компонент, который выводит карточки записи к психологам во вкладке "Записи" у клиента 
import React from 'react';
import photo from '../../../assets/img/psychologist-1.webp';
import { Link } from 'react-router-dom'

// Временный массив данных для карточек
const mockAppointments = [
    {
        name: "Конь Педальный",
        price: "3000",
        photo: photo,
        status: "upcoming",
        date: {
            date_weekday: "Вт",
            date_day: "2 сентября",
            time: "19:00"
        }
    },
    {
        name: "Иванов Иван",
        price: "2500",
        photo: photo,
        status: "today",
        date: {
            date_weekday: "Пн",
            date_day: "1 сентября",
            time: "15:30"
        }
    },
    {
        name: "Петров Петр",
        price: "2700",
        photo: photo,
        status: "past",
        date: {
            date_weekday: "Ср",
            date_day: "28 августа",
            time: "12:00"
        }
    },
    {
        name: "Сидоров Сидор",
        price: "3500",
        photo: photo,
        status: "upcoming",
        date: {
            date_weekday: "Чт",
            date_day: "3 сентября",
            time: "10:00"
        }
    },
    {
        name: "Алексеева Анна",
        price: "2800",
        photo: photo,
        status: "today",
        date: {
            date_weekday: "Вт",
            date_day: "1 сентября",
            time: "18:00"
        }
    },
    {
        name: "Смирнова Ольга",
        price: "3200",
        photo: photo,
        status: "past",
        date: {
            date_weekday: "Пт",
            date_day: "27 августа",
            time: "14:30"
        }
    },
    {
        name: "Васильев Василий",
        price: "3000",
        photo: photo,
        status: "upcoming",
        date: {
            date_weekday: "Сб",
            date_day: "4 сентября",
            time: "16:00"
        }
    },
    {
        name: "Николаев Николай",
        price: "2900",
        photo: photo,
        status: "today",
        date: {
            date_weekday: "Ср",
            date_day: "1 сентября",
            time: "11:00"
        }
    },
    {
        name: "Михайлова Мария",
        price: "3100",
        photo: photo,
        status: "past",
        date: {
            date_weekday: "Вс",
            date_day: "25 августа",
            time: "13:00"
        }
    },
    {
        name: "Фёдоров Фёдор",
        price: "3300",
        photo: photo,
        status: "upcoming",
        date: {
            date_weekday: "Пт",
            date_day: "3 сентября",
            time: "17:30"
        }
    },
    {
        name: "Андреева Анна",
        price: "2600",
        photo: photo,
        status: "today",
        date: {
            date_weekday: "Чт",
            date_day: "2 сентября",
            time: "14:00"
        }
    },
    {
        name: "Дмитриев Дмитрий",
        price: "3400",
        photo: photo,
        status: "past",
        date: {
            date_weekday: "Ср",
            date_day: "28 августа",
            time: "15:00"
        }
    }
];

function AppointmentCards({ filter }) {
    // Фильтруем записи в зависимости от текущего фильтра
    const filteredAppointments = mockAppointments.filter(appointment => {
        if (filter === 'all') return true;
        if (filter === 'upcoming') return appointment.status === 'upcoming' || appointment.status === 'today';
        if (filter === 'past') return appointment.status === 'past';
        return true;
    });

    return (
        <div className="b-appointments-cards">
            {filteredAppointments.length > 0 ? (
                <div className="appointments-cards__items">
                    {filteredAppointments.map((appointment, index) => (
                        <div key={index} className="appointments-cards__item">
                            <div className="appointments-cards__item-top">
                                <div className="appointments-cards__item-top__info">
                                    <span className="appointments-cards__item-top__info-day">{appointment.date.date_weekday}, </span>
                                    <span className="appointments-cards__item-top__info-date">{appointment.date.date_day}</span>
                                    <span className="appointments-cards__item-top__info-time">{appointment.date.time}</span>
                                </div>
                                <div className={`appointments-cards__item-top__status ${appointment.status}`}>
                                    {appointment.status === "upcoming" ? "Предстоит" :
                                        appointment.status === "today" ? "Сегодня" : "Завершено"}
                                </div>
                            </div>
                            <div className="appointments-cards__item-middle">
                                <img src={appointment.photo} alt={appointment.name} className="appointments-cards__item-middle__photo" />
                                <div className="appointments-cards__item-middle__name">{appointment.name}</div>
                                <div className="appointments-cards__item-middle__price">{appointment.price} ₽</div>
                            </div>
                            <button className="appointments-cards__item-bottom b-btn b-btn--transparent">Записаться снова</button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="appointments-cards__notfound">
                    <p className="appointments-cards__notfound-title">
                        Здесь будут храниться ваши записи на сессии
                    </p>
                    <div className="appointments-cards__notfound-btn">
                        <Link className='b-btn' to="/psychologist">Подобрать психолога</Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppointmentCards;
