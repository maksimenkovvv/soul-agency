import React from 'react';

import therapyImg from '../assets/img/therapy-img.png';

function WhyTherapy() {
    return (
        <div className="therapy gray-bg">
            <h2 className="therapy__title">Зачем нужна регулярная психотерапия?</h2>
            <img src={therapyImg} alt="Зачем нужна регулярная психотерапия?" />
        </div>
    );
};

export default WhyTherapy;