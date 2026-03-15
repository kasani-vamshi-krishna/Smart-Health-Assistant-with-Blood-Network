import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Diabetes from './pages/Diabetes';
import Heart from './pages/Heart';
import Parkinsons from './pages/Parkinsons';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <Routes>
            <Route path="/" element={<Diabetes />} />
            <Route path="/heart" element={<Heart />} />
            <Route path="/parkinsons" element={<Parkinsons />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;