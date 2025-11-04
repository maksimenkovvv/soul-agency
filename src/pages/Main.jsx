import React from 'react';

import TitleSection from '../components/TitleSection';
import Therapy from '../components/Therapy';
import OurPsychologists from '../components/OurPsychologistsBlock';
import HowToStart from '../components/HowToStart';
import PartTeam from '../components/PartTeam';
import Faq from '../components/Faq';
import Feedback from '../components/Feedback'

function Main() {
    return (
        <div className="main">
            <TitleSection />
            <Therapy />
            <OurPsychologists psychologistsLenght={3} />
            <HowToStart />
            <PartTeam />
            <Faq />
            <Feedback />
        </div>
    );
};

export default Main;