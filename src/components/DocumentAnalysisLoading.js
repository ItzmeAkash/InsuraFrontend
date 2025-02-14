import React from 'react';
import { 
  AiOutlineFile, 
  AiOutlineScan, 
  AiOutlineDatabase, 
  AiOutlineCheckCircle 
} from "react-icons/ai";

const DocumentAnalysisLoading = ({ stage }) => {
  const stages = {
    uploading: {
      icon: AiOutlineFile,
      text: "Uploading document...",
      color: "text-blue-500"
    },
    analyzing: {
      icon: AiOutlineScan,
      text: "Analyzing document...",
      color: "text-purple-500"
    },
    extracting: {
      icon: AiOutlineDatabase,
      text: "Extracting information...",
      color: "text-orange-500"
    },
    complete: {
      icon: AiOutlineCheckCircle,
      text: "Analysis complete!",
      color: "text-green-500"
    }
  };

  const currentStage = stages[stage] || stages.uploading;
  const IconComponent = currentStage.icon;

  return (
    <div className="mb-3 text-left">
      <div className="inline-flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
        <div className={`animate-pulse ${currentStage.color}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {currentStage.text}
        </span>
        <div className="flex space-x-1">
          <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce delay-150"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce delay-300"></div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAnalysisLoading;