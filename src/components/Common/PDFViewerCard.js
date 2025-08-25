import React, { useState } from "react";
import { FiDownload } from "react-icons/fi";

const PDFViewerCard = ({ url, filename = "Document.pdf", onDownload }) => {
  const [downloadStatus, setDownloadStatus] = useState("");

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show download message
    setDownloadStatus("Document downloaded successfully!");
    
    // Call the callback function if provided
    if (onDownload) {
      onDownload("PDF downloaded successfully!");
    }
    
    // Clear the message after 3 seconds
    setTimeout(() => {
      setDownloadStatus("");
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center w-full my-2">
      <div className="bg-botBackgroundColor border border-black rounded-lg p-4 w-full max-w-xs shadow-sm">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 bg-botBackgroundColor rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="text-black font-semibold">Document Ready</h4>
        </div>
        <p className="text-sm text-black mb-3">For more details, you can download this document!</p>
        
        {/* Download status message */}
        {downloadStatus && (
          <div className="mb-3 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
            {downloadStatus}
          </div>
        )}
        
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center bg-sendColor hover:bg-sendColor text-black font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <FiDownload className="w-4 h-4 mr-2" />
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default PDFViewerCard;
