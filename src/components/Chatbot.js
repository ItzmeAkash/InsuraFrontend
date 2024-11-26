import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

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

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [messages, isChatOpen, loading]);

  const sendHiddenMessage = async () => {
    setLoading(true);
    try {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Hi there! My name is Insura, your AI insurance assistant. I will be happy to assist you with your insurance requirements." },
        { sender: "bot", text: "Before we proceed, may I know your name?" },
      ]);
      setAwaitingName(true); 
    } catch (error) {
      console.error("Error sending hidden message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendInitialTrigger = async (name) => {
    // Send the "Hey" message after receiving the user's name
    try {
      const response = await axios.post("http://localhost:8000/chat/", {
        message: "Hey",
        user_id: name, 
      });

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.response },
        ...(response.data.question
          ? [{ sender: "bot", text: response.data.question }]
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
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");

    if (awaitingName) {
      // If waiting for the user's name
      setUserId(userInput); // Save the name in userId
      setAwaitingName(false); // Reset awaitingName
      // setMessages((prev) => [
      //   ...prev,
      //   { sender: "bot", text: `Thank you, ${userInput}! Let's get started.` },
      // ]);
      await sendInitialTrigger(userInput); // Trigger the "Hey" message
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/chat/", {
        message: userInput,
        user_id: userId, 
      });

      // Split response into separate messages
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.response },
        ...(response.data.question
          ? [{ sender: "bot", text: response.data.question }]
          : []),
      ]);

      setOptions(response.data.options ? response.data.options.split(", ") : []);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = async (option) => {
    const userMessage = { sender: "user", text: option };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/chat/", {
        message: option,
        user_id: userId, 
      });

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response.data.response },
        ...(response.data.question
          ? [{ sender: "bot", text: response.data.question }]
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
        <div className="fixed bottom-20 right-5 w-80 bg-white rounded-lg shadow-lg flex flex-col max-h-custom overflow-hidden">
          {/* Header */}
          <div className="bg-white text-black flex items-center justify-end p-4 border-t-8 border-chatbotHeaderColor">
            <div className="flex flex-col items-start space-y-1">
              <h3 className="font-semibold text-lg">Insura</h3>
              {loading && (
                <div className="text-black text-sm">
                  Typing...
                </div>
              )}
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
                  className={`inline-block px-4 py-2 rounded-lg ${
                    msg.sender === "bot"
                      ? "bg-white-600 text-black border border-black-500"
                      : "bg-sendColor text-black"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}

            {loading && (
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
          <div className="border-t border-gray-300 p-3 flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-gray-200"
            />
            <button
              onClick={handleSendMessage}
              className="ml-2 px-4 py-2 bg-sendColor text-black rounded-lg hover:bg-sendColortransition"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
