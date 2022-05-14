import React, { useEffect } from 'react';
import './App.css';
import { v4 as uuid } from 'uuid';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom'
import Room from './pages/room/room';
import Home from './pages/Home/home';

const App=()=> {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/:rid/:uid/:name" element={<Room />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
