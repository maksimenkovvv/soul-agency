import React from 'react';

import UpcomingActivity from '../components/UpcomingActivity';
import Therapy from '../components/Therapy';
import NewsCarousel from '../components/NewsCarousel';
import OurPsychologists from '../components/OurPsychologistsBlock';
import HowToStart from '../components/HowToStart';
import PartTeam from '../components/PartTeam';
import Faq from '../components/Faq';
import Feedback from '../components/Feedback';

function Main() {
  return (
    <div className="main">
      <UpcomingActivity />
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
