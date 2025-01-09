import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../axiosInstance";
import { AiOutlinePaperClip,AiOutlineClose } from "react-icons/ai";
const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [awaitingName, setAwaitingName] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = async () => {
    if (!file) return null;
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axiosInstance.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.filePath; // Adjust based on your API response
    } catch (error) {
      console.error("File upload failed:", error);
      return null;
    }
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
    // Send the "Hey" message after receiving the user's name
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

      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
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

  const handleSendMessage = async () => {
    if (!input.trim() && !file) return;
  
    
  
    // Show file name in chat for users
    const displayMessage = file ? file.name : input;
    const userMessage = {
      sender: "user",
      text: displayMessage,
      time: getCurrentTime(),
    };
  
    setMessages((prev) => [...prev, userMessage]);
  
    const userInput = input;
    setInput(""); // Reset the input field
  
    if (awaitingName) {
      setUserId(userInput); // Save the user's name
      setAwaitingName(false); // Reset awaitingName flag
      await sendInitialTrigger(userInput); // Trigger the "Hey" message
      return;
    }
    setLoading(true);
    let filePath = null;
  
    // Upload file if it exists
    if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
  
        const uploadResponse = await axiosInstance.post("/upload/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
  
        filePath = uploadResponse.data.file_path; // Full path for backend
        console.log("File uploaded successfully:",filePath);
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
        setFile(null); // Reset file on failure
        setLoading(false);
        return;
      }
    }
  
    // Send chat message after file upload
    try {
      const response = await axiosInstance.post("/chat/", {
        message: filePath || userInput, // Send the full path or input text to backend
        user_id: userId,
      });
  
      // Update chat messages
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
          ...(response.data.link
            ? [
                {
                  sender: "bot",
                  text: response.data.link,
                  time: getCurrentTime(),
                },
              ]
            : []),
      ]);
  
      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
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
      setFile(null); // Clear the file after sending
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

      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
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

  const [file, setFile] = useState(null);
// Locate file in system
const handleFileLocate = () => {
  if (file) {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");
  }
};

  // Handle file upload
  const handleFileAttach = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  // Handle file removal
  const handleFileRemove = () => {
    setFile(null);
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
          {/* Header */}
          <div className="bg-white text-black flex items-center justify-end p-4 border-t-8 border-chatbotHeaderColor">
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

          {/* Messages */}
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
                  style={{ minHeight: "2.5rem", minWidth: "4.7rem" }}
                >
                   {msg.text.startsWith("https") ? (
          <a
            href={msg.text}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            {msg.text}
          </a>
        ) : (
          msg.text
        )}
                  <span className="absolute bottom-1 right-2 text-sm text-gray-500">
                    {msg.time}
                  </span>
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
              >
                {option}
              </button>
            ))}

            <div ref={messagesEndRef}></div>
          </div>

          {/* Input */}
          <div className="pb-4">
  {file && (
    <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg">
      <span className="text-gray-700 text-sm">{file.name}</span>
      <div className="flex space-x-2">
        <button
          className="text-blue-500 text-sm underline hover:text-blue-700"
          onClick={handleFileLocate}
        >
          View
        </button>
        <AiOutlineClose
          className="h-5 w-5 text-gray-500 hover:text-black cursor-pointer"
          onClick={handleFileRemove}
        />
      </div>
    </div>
  )}

  <div className="border-t border-gray-300 mt-2 pt-4 flex items-center w-full">
    {/* Paper Pin Icon */}
    <label className="mr-2 cursor-pointer">
      <input
        type="file"
        className="hidden"
        onChange={handleFileAttach}
      />
      <AiOutlinePaperClip className="pl-2 h-8 w-8 text-gray-500 hover:text-black" />
    </label>

    {/* Message Input */}
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Type your message..."
      className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-gray-200"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleSendMessage();
        }
      }}
    />

    {/* Send Button */}
    <button
      onClick={handleSendMessage}
      className="ml-2 px-4 py-3 mr-3 bg-sendColor text-black rounded-lg hover:bg-sendColortransition"
    >
      Send
    </button>
  </div>
</div>

        </div>
      )}
    </div>
  );
};

export default Chatbot;