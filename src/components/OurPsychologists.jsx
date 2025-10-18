import React from 'react';
import psychologist1 from '../assets/img/psychologist-1.webp';
import psychologist2 from '../assets/img/psychologist-2.webp';
import psychologist3 from '../assets/img/psychologist-3.webp';



function OurPsychologists() {
    return (
        <div className="psychologists">
            <div className="psychologists__header">
                <div className="psychologists__header-digit b-digit">01</div>
                <h2 className="psychologists__header-title">Психологи</h2>
            </div>
            <div className="psychologists__item-wrapper">
                <div className="psychologists__item">
                    <div className="psychologists__item-image">
                        <img src={psychologist1} alt="" />
                    </div>
                    <div className="psychologists__item-content">
                        <button className="psychologists__item-content__favourites">
                            <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 7.48355C1.00002 6.1756 1.40511 4.89841 2.16176 3.82069C2.9184 2.74296 3.99101 1.9154 5.23792 1.44729C6.48482 0.979189 7.84737 0.892568 9.14559 1.19887C10.4438 1.50517 11.6166 2.18999 12.5092 3.16287C12.572 3.22871 12.648 3.2812 12.7325 3.31708C12.8169 3.35296 12.9079 3.37148 13 3.37148C13.092 3.37148 13.183 3.35296 13.2675 3.31708C13.3519 3.2812 13.4279 3.22871 13.4908 3.16287C14.3805 2.18367 15.5536 1.49309 16.8539 1.18307C18.1542 0.873046 19.5201 0.958274 20.7698 1.42741C22.0194 1.89655 23.0936 2.72734 23.8493 3.80921C24.6049 4.89109 25.0063 6.17273 24.9999 7.48355C24.9999 10.1752 23.1999 12.1851 21.3999 13.9481L14.8096 20.1929C14.586 20.4444 14.3103 20.6465 14.0008 20.7856C13.6914 20.9248 13.3552 20.9978 13.0147 21C12.6742 21.0021 12.3371 20.9332 12.0259 20.7979C11.7147 20.6626 11.4364 20.464 11.2096 20.2152L4.59999 13.9481C2.79999 12.1851 1 10.1869 1 7.48355Z" fill="#D2D7DB" stroke="#D2D7DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                        <a href="#" className="psychologists__item-content__arrow">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 8H15M15 8L8 1M15 8L8 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </a>
                        <p className="psychologists__item-content__name">Иванна Иванова</p>
                        <p className="psychologists__item-content__experience"><span>Опыт:</span> более 15 лет</p>
                        <p className="psychologists__item-content__price">50 мин 3000₽</p>
                    </div>
                </div>
                <div className="psychologists__item">
                    <div className="psychologists__item-image">
                        <img src={psychologist2} alt="" />
                    </div>
                    <div className="psychologists__item-content">
                        <button className="psychologists__item-content__favourites">
                            <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 7.48355C1.00002 6.1756 1.40511 4.89841 2.16176 3.82069C2.9184 2.74296 3.99101 1.9154 5.23792 1.44729C6.48482 0.979189 7.84737 0.892568 9.14559 1.19887C10.4438 1.50517 11.6166 2.18999 12.5092 3.16287C12.572 3.22871 12.648 3.2812 12.7325 3.31708C12.8169 3.35296 12.9079 3.37148 13 3.37148C13.092 3.37148 13.183 3.35296 13.2675 3.31708C13.3519 3.2812 13.4279 3.22871 13.4908 3.16287C14.3805 2.18367 15.5536 1.49309 16.8539 1.18307C18.1542 0.873046 19.5201 0.958274 20.7698 1.42741C22.0194 1.89655 23.0936 2.72734 23.8493 3.80921C24.6049 4.89109 25.0063 6.17273 24.9999 7.48355C24.9999 10.1752 23.1999 12.1851 21.3999 13.9481L14.8096 20.1929C14.586 20.4444 14.3103 20.6465 14.0008 20.7856C13.6914 20.9248 13.3552 20.9978 13.0147 21C12.6742 21.0021 12.3371 20.9332 12.0259 20.7979C11.7147 20.6626 11.4364 20.464 11.2096 20.2152L4.59999 13.9481C2.79999 12.1851 1 10.1869 1 7.48355Z" fill="#D2D7DB" stroke="#D2D7DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                        <a href="#" className="psychologists__item-content__arrow">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 8H15M15 8L8 1M15 8L8 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </a>
                        <p className="psychologists__item-content__name">Иванна Иванова</p>
                        <p className="psychologists__item-content__experience"><span>Опыт:</span> более 15 лет</p>
                        <p className="psychologists__item-content__price">50 мин 3000₽</p>
                    </div>
                </div>
                <div className="psychologists__item">
                    <div className="psychologists__item-image">
                        <img src={psychologist3} alt="" />
                    </div>
                    <div className="psychologists__item-content">
                        <button className="psychologists__item-content__favourites">
                            <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 7.48355C1.00002 6.1756 1.40511 4.89841 2.16176 3.82069C2.9184 2.74296 3.99101 1.9154 5.23792 1.44729C6.48482 0.979189 7.84737 0.892568 9.14559 1.19887C10.4438 1.50517 11.6166 2.18999 12.5092 3.16287C12.572 3.22871 12.648 3.2812 12.7325 3.31708C12.8169 3.35296 12.9079 3.37148 13 3.37148C13.092 3.37148 13.183 3.35296 13.2675 3.31708C13.3519 3.2812 13.4279 3.22871 13.4908 3.16287C14.3805 2.18367 15.5536 1.49309 16.8539 1.18307C18.1542 0.873046 19.5201 0.958274 20.7698 1.42741C22.0194 1.89655 23.0936 2.72734 23.8493 3.80921C24.6049 4.89109 25.0063 6.17273 24.9999 7.48355C24.9999 10.1752 23.1999 12.1851 21.3999 13.9481L14.8096 20.1929C14.586 20.4444 14.3103 20.6465 14.0008 20.7856C13.6914 20.9248 13.3552 20.9978 13.0147 21C12.6742 21.0021 12.3371 20.9332 12.0259 20.7979C11.7147 20.6626 11.4364 20.464 11.2096 20.2152L4.59999 13.9481C2.79999 12.1851 1 10.1869 1 7.48355Z" fill="#D2D7DB" stroke="#D2D7DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                        <a href="#" className="psychologists__item-content__arrow">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 8H15M15 8L8 1M15 8L8 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </a>
                        <p className="psychologists__item-content__name">Иванна Иванова</p>
                        <p className="psychologists__item-content__experience"><span>Опыт:</span> более 15 лет</p>
                        <p className="psychologists__item-content__price">50 мин 3000₽</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OurPsychologists;