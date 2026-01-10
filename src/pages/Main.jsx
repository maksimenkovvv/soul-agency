import React from 'react';

import TitleSection from '../components/TitleSection';
import Therapy from '../components/Therapy';
import OurPsychologists from '../components/OurPsychologistsBlock';
import HowToStart from '../components/HowToStart';
import PartTeam from '../components/PartTeam';
import Faq from '../components/Faq';
import Feedback from '../components/Feedback';
import NewsCarousel from '../components/NewsCarousel';

function Main() {
    return (
        <div className="main">
            <TitleSection />
            <Therapy />

            <NewsCarousel />

            <OurPsychologists psychologistsLenght={3} />
            <HowToStart />
            <PartTeam />
            <Faq />
            <Feedback />
        </div>
    );
}

export default Main;
