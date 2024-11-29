import React from "react";
import Chatbot from "./Chatbot";

const MainPage = () => {
  return (
    <div className="relative w-screen h-screen">
      {/* Full-Screen Background Image */}
      <div className="fixed inset-0">
  <img
    src="/InsuraMainPage.png"
    alt="Background"
    className="h-full w-full object-cover sm:rounded-lg" 
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
