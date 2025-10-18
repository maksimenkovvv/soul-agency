import React from 'react';

import Header from './components/Header';
import TitleSection from './components/TitleSection';
import WhyTherapy from './components/WhyTherapy';
import OurPsychologists from './components/OurPsychologists';
import HowToStart from './components/HowToStart';
import PartTeam from './components/PartTeam';
import Faq from './components/Faq';
import Footer from './components/Footer';
import AuthReg from './components/AuthReg'

import './scss/app.scss'

function App() {
  return (
    <div className="App">
      <div className="wrapper">
        <AuthReg />
        <Header />
        <TitleSection />
        <WhyTherapy />
        <OurPsychologists />
        <HowToStart />
        <PartTeam />
        <Faq />
        <Footer />
      </div>
    </div>
  );
}

export default App;
