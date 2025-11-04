import React from 'react';

import { Routes, Route } from "react-router-dom";

import AuthReg from './components/AuthReg'
import Header from './components/Header';
import Main from './pages/Main'
import Footer from './components/Footer';

import About from './pages/About'
import Psychologist from './pages/Psychologists'
import Sessions from './pages/Sessions'

import './scss/app.scss'

function App() {
  return (
    <div className="App">
      <div className="wrapper">
        <AuthReg />
        <Header />
        <Routes>
          <Route path='/' element={<Main />} />
          <Route path='/about' element={<About />} />
          <Route path='/psychologist' element={<Psychologist />} />
          <Route path='/sessions' element={<Sessions />} />
        </Routes>
        <Footer />
      </div>
    </div>
  );
}

export default App;
