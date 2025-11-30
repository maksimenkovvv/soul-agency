import React from 'react';

import { Routes, Route, useLocation } from "react-router-dom";

import Header from './components/Header';
import Main from './pages/Main'
import Footer from './components/Footer';

import About from './pages/About'
import Psychologist from './pages/Psychologists'
import Sessions from './pages/Sessions'
import User from './pages/User'
import Psycho from './pages/Psycho'
import Login from './pages/Login'



import './scss/app.scss'

function App() {
  const location = useLocation();

  return (
    <div className="App">
      <div className="wrapper">
        {location.pathname !== '/login' && <Header />}
        <Routes>
          <Route path='/' element={<Main />} />
          <Route path='/about' element={<About />} />
          <Route path='/psychologist' element={<Psychologist />} />
          <Route path='/sessions' element={<Sessions />} />
          <Route path='/user' element={<User />} />
          <Route path='/psycho' element={<Psycho />} />
          <Route path='/login' element={<Login />} />
        </Routes>
        {location.pathname !== '/login' && <Footer />}
      </div>
    </div>
  );
}

export default App;
