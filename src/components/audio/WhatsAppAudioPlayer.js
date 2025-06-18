import React, { useState, useEffect, useRef } from "react";

const WhatsAppAudioPlayer = ({ audioSrc }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", () => setIsPlaying(false));
    };
  }, []);

  const togglePlay = () => {
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const generateWaveform = () => {
    const bars = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const playbackProgress = audioRef.current
        ? audioRef.current.duration > 0
          ? currentTime / audioRef.current.duration
          : 0
        : 0;

      const isPlayed = i / count < playbackProgress;
      const seed = i * 12345;
      const height = 10 + (Math.sin(seed) * 0.5 + 0.5) * 15;

      bars.push(
        <div
          key={i}
          className={`w-1 ${isPlayed ? "bg-blue-500" : "bg-gray-300"}`}
          style={{
            height: `${height}%`,
            minHeight: "2px",
            transition: "background-color 0.2s ease",
          }}
        ></div>
      );
    }

    return bars;
  };

  return (
    <div className="flex items-center space-x-2 w-full mb-4">
      <audio ref={audioRef} src={audioSrc} preload="metadata" className="hidden" />

      <button
        onClick={togglePlay}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isPlaying ? "bg-blue-500" : "bg-gray-300"
        }`}
      >
        {isPlaying ? (
          <span className="text-white text-sm">■</span>
        ) : (
          <span className="text-white text-sm">▶</span>
        )}
      </button>

      <div className="flex-grow">
        <div className="h-4 flex items-center justify-between space-x-0.5">
          {generateWaveform()}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAudioPlayer;