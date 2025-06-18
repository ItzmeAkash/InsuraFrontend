import React from "react";
import { AiOutlineDelete } from "react-icons/ai";

const VoiceRecorder = ({ recordingTime, cancelRecording }) => {
  const generateWaveform = () => {
    const bars = [];
    const count = 12; // Reduced from 20 to 12 bars

    for (let i = 0; i < count; i++) {
      const height = Math.random() * 100;
      bars.push(
        <div
          key={i}
          className="w-1 bg-gray-400"
          style={{
            height: `${height}%`,
            opacity: 0.6 + Math.random() * 0.4,
            animation: "pulse 0.5s infinite",
          }}
        ></div>
      );
    }

    return bars;
  };

  return (
    <div className="flex-1 bg-gray-100 p-2 rounded-lg flex items-center h-10 w-full max-w-xs">
      <AiOutlineDelete
        className="h-5 w-5 text-gray-500 hover:text-red-500 cursor-pointer mr-2"
        onClick={cancelRecording}
      />
      <span className="text-sm font-medium mr-2">
        {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:
        {String(recordingTime % 60).padStart(2, "0")}
      </span>
      <div className="flex-1 h-6 flex items-center justify-between space-x-0.5">
        {generateWaveform()}
      </div>
      <div className="ml-2 text-red-500 animate-pulse">●</div>
    </div>
  );
};

export default VoiceRecorder;