import React from 'react';

const MessageContentRenderer = ({ msg, baseURL }) => {
  // For upload document message with image (front page)
  if (msg.text === "Thank you for the responses! Now, Please Upload Your Document") {
    return (
      <div className="flex flex-col items-center">
        <p>{msg.text}</p>
        <p className="text-sm text-gray-500 mt-1">Please upload the document like this.</p>
        <img
          src="emirates-front.jpeg"
          alt="Front page example"
          className="mt-2 w-48 h-auto rounded-lg shadow-md"
        />
      </div>
    );
  }
  
  // For back page upload message with image
  if (msg.text.includes("Please Upload Back Page of Your Document")) {
    return (
      <div className="flex flex-col items-center">
        <p>{msg.text}</p>
        <p className="text-sm text-gray-500 mt-1">Please upload the document like this.</p>
        <img
          src="back.jpeg"
          alt="Back page example"
          className="mt-2 w-48 h-auto rounded-lg shadow-md"
        />
      </div>
    );
  }

  // For PDF links
  if (msg.text.includes(`${baseURL}/pdf`)) {
    return (
      <button
        onClick={() => window.open(msg.text, "_blank")}
        className="text-blue-500 underline"
      >
        View PDF
      </button>
    );
  }

  // For regular URLs
  if (msg.text.startsWith("https")) {
    return (
      <a
        href={msg.text}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
        style={{ fontSize: '13.4px' }}
      >
        {msg.text}
      </a>
    );
  }

  // Default case: regular text
  return msg.text;
};

export default MessageContentRenderer;