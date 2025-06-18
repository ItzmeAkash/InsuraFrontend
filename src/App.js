import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";
import VoicePage from "./components/Voice/VoicePage";
import WhatsappMainPage from "./components/whatsapp/WhatsappMainPage";
import AuidoMainPage from './components/audio/AudioMainPage'
// import FrontDesk from './components/frontdesk/frontDesk'

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/voice" element={<VoicePage />} /> 
        <Route path="/whatsapp" element={<WhatsappMainPage />} /> 
        {/* <Route path="/audio" element={<AuidoMainPage />} />  */}
        {/* <Route path="/frontdesk" element={<FrontDesk />} />  */}
      </Routes>
    </Router>
  );
};

export default App;
