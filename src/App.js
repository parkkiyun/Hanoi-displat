import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPanel from './renderer/pages/AdminPanel';
import SlideShow from './renderer/pages/SlideShow';
import UpdateStatus from './renderer/components/UpdateStatus';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminPanel />} />
        <Route path="/slideshow" element={<SlideShow />} />
      </Routes>
      <UpdateStatus />
    </Router>
  );
}

export default App;