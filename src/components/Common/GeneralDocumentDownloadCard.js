import React from "react";

/**
 * Download trigger for API paths like /general-documents/… (full URL = baseURL + path).
 */
const GeneralDocumentDownloadCard = ({ url, filename, time }) => {
  const label = filename || "Download document";

  const handleDownload = () => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative inline-block">
      <div className="bg-botBackgroundColor text-black border border-black-500 rounded-lg px-4 py-4 min-w-[12rem]">
        <p className="text-sm text-gray-700 mb-3">Tap below to download the file.</p>
        <button
          type="button"
          onClick={handleDownload}
          className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
        >
          {label}
        </button>
      </div>
      {time ? (
        <span className="block mt-1 text-right text-sm text-gray-500">{time}</span>
      ) : null}
    </div>
  );
};

export default GeneralDocumentDownloadCard;
