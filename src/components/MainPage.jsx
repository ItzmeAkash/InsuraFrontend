import React from "react";
import Chatbot from "./Chatbot";
import VoiceChatbot from "./audio/voiceChatbot";

const MainPage = () => {
  // Function to handle WhatsApp redirection

  return (
    <div className="relative">
      {/* Full-Screen Background Image */}
      <div className="fixed inset-0">
        <div className="w-full h-full">
          <img
            src="/InsuraMainPage.png"
            alt="Background"
            className="w-full h-full object-cover sm:w-69 h-full object-left md:w-69 h-full"
          />
        </div>
      </div>

      {/* Content Overlay */}
      <div className="relative flex items-center justify-center h-full z-10">
        <h1 className="text-white text-4xl font-bold shadow-lg">
          {/* Add any content here */}
        </h1>
      </div>

      {/* Version Number */}
      <div className="fixed top-5 right-5 bg-white text-gray-800 px-4 py-2 rounded-full shadow-md z-10">
        v.2.9.2.4
      </div>

      {/* Chatbot Component */}
      <div className="fixed bottom-5 right-5 z-10">
        {/* <VoiceChatbot /> */}
        <Chatbot />
      </div>
    </div>
  );
};

export default MainPage;
