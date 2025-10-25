import React from 'react';
import teamPart from '../assets/img/teampart.webp'
function PartTeam() {
    return (
        <div className="team">
            <div className="team__header">
                <div className="team__header-digit b-digit">03</div>
                <h2 className="team__header-title">Как стать частью команды?</h2>
            </div>
            <div className="team__content">
                <div className="team__content-image"><img src={teamPart} alt="" /></div>
                <div className="team__content-join">
                    <div className="team__content-join__title b-title-h3">Развивайте, помогайте, вдохновляйте — с нашей командой</div>
                    <a href="#" className="team__content-join__button b-btn b-btn--transparent">Присоединиться</a>
                </div>
            </div>
        </div>
    );
}

export default PartTeam;