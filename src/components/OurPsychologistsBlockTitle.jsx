import React from 'react';
import { Link } from 'react-router-dom';

function OurPsychologistTitle() {
    return (
        <div className="psychologists__header">
            <div className="psychologists__header-digit b-digit">01</div>
            <h2 className="psychologists__header-title">Психологи</h2>
            <Link
                to='/psychologist'
                className='psychologists__header-btn b-btn b-btn--transparent'
                aria-label='Подобрать психолога'
            >
                <span className='psychologists__header-btn--text-desktop'>Подобрать психолога</span>
                <span className='psychologists__header-btn--text-adaptive'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#313235" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </span>
            </Link>
        </div>
    );
};

export default OurPsychologistTitle;