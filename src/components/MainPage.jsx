import React from "react";
import Chatbot from "./Chatbot";

const MainPage = () => {
  return (
    <div className="relative">
    {/* Full-Screen Background Image */}
    <div className="fixed inset-0">
        <img
          src="/InsuraMainPage.png"
          alt="Background"
          className="object-cover md:object-none object-left  w-full h-full "
        />
      </div>
      {/* Content Overlay */}
      <div className="relative flex items-center justify-center h-full z-10">
        <h1 className="text-white text-4xl font-bold shadow-lg">
          {/* Add any content here */}
        </h1>
      </div>

      {/* Chatbot Component */}
      <div className="fixed bottom-5 right-5 z-10">
        <Chatbot />
      </div>
    </div>
  );
};

export default MainPage;
