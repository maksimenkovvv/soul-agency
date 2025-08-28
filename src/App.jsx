import Header from './components/Header';
import TitleSection from './components/TitleSection';
import Quote from './components/Quote';
import WhyTherapy from './components/WhyTherapy';
import OurPsychologists from './components/OurPsychologists';
import HowToStart from './components/HowToStart';
import PartTeam from './components/PartTeam';
import Faq from './components/Faq';
import Footer from './components/Footer';

import './scss/app.scss'

function App() {
  return (
    <div className="App">
      <div className="wrapper">
        <Header />
        <TitleSection />
        <Quote />
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
