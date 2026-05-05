import React from 'react';
import PDFViewerCard from './PDFViewerCard';

/** Backend copy sometimes says "InsuranceClub"; UI brand is Insura. */
const normalizeInsuranceBrandCopy = (t) =>
  typeof t === 'string'
    ? t.replaceAll(/\bInsuranceClub\b/g, 'Insura')
    : t;

const MessageContentRenderer = ({ msg, baseURL }) => {
  const displayText = normalizeInsuranceBrandCopy(msg.text);

  // For upload document message with image (front page)
  if (msg.text === "Thank you for the responses! Now, Please Upload Your Document") {
    return (
      <div className="flex flex-col items-center">
        <p>{displayText}</p>
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
        <p>{displayText}</p>
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
    return <PDFViewerCard url={msg.text} />;
  }

  // For regular URLs (http/https)
  const trimmed = typeof msg.text === "string" ? msg.text.trim() : "";
  if (/^https?:\/\//i.test(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
        style={{ fontSize: '13.4px' }}
      >
        {trimmed}
      </a>
    );
  }

  // Default case: regular text
  return displayText;
};

export default MessageContentRenderer;