import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../../axiosInstance";
import {
  AiOutlinePaperClip,
  AiOutlineClose,
  AiOutlineAudio,
  AiOutlineSend,
} from "react-icons/ai";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import VoiceRecorder from "./VoiceRecorder";

const VoiceChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [awaitingName, setAwaitingName] = useState(false);
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const messagesEndRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [messages, isChatOpen, loading]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const sendHiddenMessage = async () => {
    setLoading(true);
    try {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Hi there! My name is Insura, your AI insurance assistant. I will be happy to assist you with your insurance requirements.",
          time: getCurrentTime(),
        },
        {
          sender: "bot",
          text: "Before we proceed, may I know your name?",
          time: getCurrentTime(),
        },
      ]);
      setAwaitingName(true);
    } catch (error) {
      console.error("Error sending hidden message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendInitialTrigger = async (name) => {
    try {
      const response = await axiosInstance.post("/chat/", {
        message: "Hey",
        user_id: name,
      });

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.response, time: getCurrentTime() },
        ...(response.data.question
          ? [
              {
                sender: "bot",
                text: response.data.question,
                time: getCurrentTime(),
              },
            ]
          : []),
      ]);

      setOptions(response.data.options ? response.data.options.split(", ") : []);
    } catch (error) {
      console.error("Error triggering initial message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return null;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axiosInstance.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.filePath;
    } catch (error) {
      console.error("File upload failed:", error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !file && !recordedAudio) return;

    const displayMessage = file ? file.name : input || "Voice Message";
    const userMessage = {
      sender: "user",
      text: displayMessage,
      time: getCurrentTime(),
      audio: recordedAudio ? URL.createObjectURL(recordedAudio) : null,
      audioDuration: recordedAudio
        ? `${Math.floor(recordingTime / 60)}:${String(
            recordingTime % 60
          ).padStart(2, "0")}`
        : null,
    };

    setMessages((prev) => [...prev, userMessage]);

    const userInput = input || (transcript ? transcript : null);
    setInput("");
    setRecordedAudio(null);
    setTranscript("");

    if (awaitingName) {
      setUserId(userInput);
      setAwaitingName(false);
      await sendInitialTrigger(userInput);
      return;
    }

    setLoading(true);
    let filePath = null;

    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await axiosInstance.post("/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        filePath = uploadResponse.data.file_path;
        console.log("File uploaded successfully:", filePath);
      } catch (uploadError) {
        console.error("File upload failed:", uploadError);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "File upload failed. Please try again later.",
            time: getCurrentTime(),
          },
        ]);
        setFile(null);
        setLoading(false);
        return;
      }
    }

    try {
      let messageToSend = filePath || userInput;

      if (recordedAudio) {
        const formData = new FormData();
        formData.append(
          "file",
          recordedAudio,
          `voice_message.${mediaRecorder.mimeType.split("/")[1]}`
        );
        try {
          const response = await axiosInstance.post("/transcribe/", formData);
          if (response.data.transcript) {
            messageToSend = response.data.transcript;
          } else {
            throw new Error("No transcript received");
          }
        } catch (transcriptError) {
          console.error("Transcription error:", transcriptError);
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "Failed to transcribe audio. Please try again.",
              time: getCurrentTime(),
            },
          ]);
          setLoading(false);
          return;
        }
      }

      const response = await axiosInstance.post("/chat/", {
        message: messageToSend,
        user_id: userId,
      });

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.response, time: getCurrentTime() },
        ...(response.data.question
          ? [
              {
                sender: "bot",
                text: response.data.question,
                time: getCurrentTime(),
              },
            ]
          : []),
        ...(response.data.example
          ? [
              {
                sender: "bot",
                text: response.data.example,
                time: getCurrentTime(),
              },
            ]
          : []),
      ]);

      setOptions(response.data.options ? response.data.options.split(", ") : []);
    } catch (chatError) {
      console.error("Error sending message:", chatError);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setFile(null);
      setLoading(false);
    }
  };

  const handleOptionClick = async (option) => {
    const userMessage = {
      sender: "user",
      text: option,
      time: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const response = await axiosInstance.post("/chat/", {
        message: option,
        user_id: userId,
      });

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.response, time: getCurrentTime() },
        ...(response.data.question
          ? [
              {
                sender: "bot",
                text: response.data.question,
                time: getCurrentTime(),
              },
            ]
          : []),
      ]);

      setOptions(response.data.options ? response.data.options.split(", ") : []);
    } catch (error) {
      console.error("Error sending option:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && messages.length === 0) sendHiddenMessage();
      return willOpen;
    });
  };

  const handleFileLocate = () => {
    if (file) {
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    }
  };

  const handleFileAttach = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
  };

  const getSupportedMimeType = () => {
    const mimeTypes = ["audio/ogg", "audio/webm", "audio/mp4", "audio/aac"];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return null;
  };

  const startRecording = async () => {
    try {
      if (!window.isSecureContext) {
        throw new Error("SecureContextError");
      }

      if (!window.MediaRecorder) {
        throw new Error("MediaRecorderNotSupported");
      }

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error("NoSupportedMimeType");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      let errorMessage = "Failed to access microphone. Please try again.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Microphone access denied. Please allow microphone access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please ensure a microphone is connected.";
      } else if (error.message === "SecureContextError") {
        errorMessage =
          "Microphone access requires a secure connection (HTTPS). Please access this site over HTTPS.";
      } else if (error.message === "MediaRecorderNotSupported") {
        errorMessage =
          "Your browser does not support audio recording. Please use a modern browser like Chrome or Firefox.";
      } else if (error.message === "NoSupportedMimeType") {
        errorMessage =
          "Your browser does not support any compatible audio formats for recording.";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: errorMessage,
          time: getCurrentTime(),
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setOptions([]); // Hide options when voice message is sent

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "No audio recorded. Please try again.",
              time: getCurrentTime(),
            },
          ]);
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const audio = new Audio(URL.createObjectURL(audioBlob));
        let audioDuration = "0:00";

        audio.addEventListener("loadedmetadata", () => {
          const minutes = Math.floor(audio.duration / 60);
          const seconds = Math.floor(audio.duration % 60);
          audioDuration = `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
        });

        // Immediately add the voice message to the chat
        const userMessage = {
          sender: "user",
          text: "Voice Message",
          time: getCurrentTime(),
          audio: URL.createObjectURL(audioBlob),
          audioDuration: audioDuration,
        };
        setMessages((prev) => [...prev, userMessage]);
        setRecordedAudio(audioBlob); // Store the audio blob for processing
        setLoading(true); // Show loading indicator

        const formData = new FormData();
        formData.append(
          "file",
          audioBlob,
          `voice_message.${mimeType.split("/")[1]}`
        );

        try {
          // Step 1: Transcribe the audio
          const transcriptResponse = await axiosInstance.post(
            "/transcribe/",
            formData
          );

          if (!transcriptResponse.data.transcript) {
            throw new Error("No transcript received from server");
          }

          const transcribedText = transcriptResponse.data.transcript.trim();
          setTranscript(transcribedText);

          // Log the transcribed text for debugging
          console.log("Transcribed Text:", transcribedText);

          // Validate the transcribed text (basic check for name-like input)
          if (!transcribedText || transcribedText.length < 2) {
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: "I couldn't understand your name. Could you please repeat it clearly?",
                time: getCurrentTime(),
              },
            ]);
            mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            setLoading(false);
            return;
          }

          // Step 2: Send transcript to chat API
          if (awaitingName) {
            setUserId(transcribedText);
            setAwaitingName(false);
            await sendInitialTrigger(transcribedText);
          } else {
            const chatResponse = await axiosInstance.post("/chat/", {
              message: transcribedText,
              user_id: userId,
            });

            // Log the backend response for debugging
            console.log("Backend Response:", chatResponse.data);

            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: chatResponse.data.response,
                time: getCurrentTime(),
              },
              ...(chatResponse.data.question
                ? [
                    {
                      sender: "bot",
                      text: chatResponse.data.question,
                      time: getCurrentTime(),
                    },
                  ]
                : []),
              ...(chatResponse.data.example
                ? [
                    {
                      sender: "bot",
                      text: chatResponse.data.example,
                      time: getCurrentTime(),
                    },
                  ]
                : []),
            ]);

            setOptions(
              chatResponse.data.options
                ? chatResponse.data.options.split(", ")
                : []
            );
          }
        } catch (error) {
          console.error("Processing voice message error:", error);
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "Failed to process voice message. Please try again in a quieter environment or type your message.",
              time: getCurrentTime(),
            },
          ]);
        } finally {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          setLoading(false);
          setRecordedAudio(null);
          setTranscript("");
        }
      };
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingTime(0);
      setRecordedAudio(null);
      setTranscript("");
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="relative">
      <button
        className="fixed bottom-5 right-5 bg-gray-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-gray-600 transition"
        onClick={handleToggleChat}
      >
        <img
          className="w-14 h-14 rounded-full object-cover"
          src="Insura.jpeg"
          alt="Chatbot Avatar"
        />
      </button>

      {isChatOpen && (
       <div className="fixed bottom-20 right-5 w-84 bg-white rounded-lg shadow-lg flex flex-col max-h-custom overflow-hidden">
          <div className="bg-white text-black flex items-center justify-end p-4 border-t-8 border-gray-500">
            <div className="flex flex-col items-start space-y-1">
              <h3 className="font-semibold text-lg">Insura</h3>
              {loading && <div className="text-black text-sm">Typing...</div>}
            </div>
            <img
              src="/Insura.jpeg"
              alt="Insurance Avatar"
              className="w-10 h-10 rounded-full object-cover ml-4 mr-4"
            />
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 ${
                  msg.sender === "bot" ? "text-left" : "text-right"
                }`}
              >
                <span
                  className={`relative inline-block px-4 py-6 rounded-lg ${
                    msg.sender === "bot"
                      ? "bg-botBackgroundColor text-black border border-black-500"
                      : "bg-sendColor text-black"
                  }`}
                  style={{ minHeight: "2.5rem" }}
                >
                  {msg.audio ? (
                    <div className="flex flex-col w-full relative">
                      <div className="flex items-center">
                        <WhatsAppAudioPlayer audioSrc={msg.audio} />
                      </div>
                      <span className="absolute bottom-1 right-2 text-xs text-gray-500">
                        {msg.time}
                      </span>
                    </div>
                  ) : (
                    <>
                      {msg.text}
                      <span className="absolute bottom-1 right-2 text-xs text-gray-500">
                        {msg.time}
                      </span>
                    </>
                  )}
                </span>
              </div>
            ))}

            {loading && messages.length > 0 && (
              <div className="mb-3 text-left">
                <div className="inline-block px-4 py-2 rounded-lg bg-gray-200 text-black">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce delay-400"></div>
                  </div>
                </div>
              </div>
            )}

            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className="block w-full bg-gray-200 text-black text-sm py-2 px-4 rounded-lg mb-2 hover:bg-gray-300 transition"
                disabled={isRecording || loading} // Disable options during recording or loading
              >
                {option}
              </button>
            ))}

            <div ref={messagesEndRef}></div>
          </div>

          <div className="pb-4">
            {file && (
              <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg">
                <span className="text-gray-700 text-sm">{file.name}</span>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 text-sm underline hover:text-blue-700"
                    onClick={handleFileLocate}
                    disabled={isRecording || loading} // Disable file locate during recording or loading
                  >
                    Locate File
                  </button>
                  <AiOutlineClose
                    className="h-5 w-5 text-gray-500 hover:text-black cursor-pointer"
                    onClick={handleFileRemove}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-gray-300 mt-2 pt-4 flex items-center w-full px-2 pr-1">
              <label className="mr-3 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileAttach}
                  disabled={isRecording || loading} // Disable file input during recording or loading
                />
                <AiOutlinePaperClip
                  className={`h-6 w-6 ${
                    isRecording || loading
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:text-black"
                  }`}
                />
              </label>

              {isRecording ? (
                <VoiceRecorder
                  recordingTime={recordingTime}
                  cancelRecording={cancelRecording}
                />
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-gray-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && input.trim() && !isRecording && !loading) {
                      handleSendMessage();
                    }
                  }}
                  disabled={isRecording || loading} // Disable input during recording or loading
                />
              )}

              <div className="ml-3">
                {input.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className={`p-2 rounded-full ${
                      isRecording || loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    } transition`}
                    disabled={isRecording || loading} // Disable send button during recording or loading
                  >
                    <AiOutlineSend className="h-6 w-6" />
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full ${
                      isRecording
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                    } transition`}
                    disabled={loading} // Disable voice button during loading
                  >
                    <AiOutlineAudio className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChatbot;