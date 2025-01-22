import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";
import VoicePage from "./components/Voice/VoicePage";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/voice" element={<VoicePage />} /> 
      </Routes>
    </Router>
  );
};

export default App;
