import React from 'react';

import TitleSection from '../components/TitleSection';
import Therapy from '../components/Therapy';
import OurPsychologists from '../components/OurPsychologists';
import HowToStart from '../components/HowToStart';
import PartTeam from '../components/PartTeam';
import Faq from '../components/Faq';
import Feedback from '../components/Feedback'

function Main() {
    return (
        <>
            <TitleSection />
            <Therapy />
            <OurPsychologists />
            <HowToStart />
            <PartTeam />
            <Faq />
            <Feedback />
        </>
    );
};

export default Main;