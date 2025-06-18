import React from "react";

const ReviewLinkCard = ({ url }) => {
  return (
    <div className="flex flex-col items-center w-full my-2">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-xs shadow-sm">
        <h4 className="text-blue-800 font-semibold mb-2">Please Rate Your Experience</h4>
        <p className="text-sm text-blue-600 mb-3">We'd love to hear your feedback!</p>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Leave a Review
        </a>
      </div>
    </div>
  );
};

export default ReviewLinkCard;