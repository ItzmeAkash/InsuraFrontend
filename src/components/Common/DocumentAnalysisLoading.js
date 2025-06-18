import React, { useState, useEffect } from 'react';

const DocumentTransferLoading = ({ initialStage = 'uploading', autoProgress = true, stageInterval = 3000 }) => {
  const [stage, setStage] = useState(initialStage);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletedBanner, setShowCompletedBanner] = useState(false);
  
  // Stages array
  const stages = ['uploading', 'analyzing', 'extracting', 'complete'];
  
  // Auto-progress through stages with faster transition for first two stages
  useEffect(() => {
    if (!autoProgress) return;
    
    const currentIndex = stages.indexOf(stage);
    
    // When extracting is done, show completed banner before moving to complete stage
    if (currentIndex === 2) { // extracting stage
      const extractingTimer = setTimeout(() => {
        setShowCompletedBanner(true);
        
        // After showing the banner, transition to complete stage
        const completeTimer = setTimeout(() => {
          setShowCompletedBanner(false);
          setStage(stages[currentIndex + 1]);
        }, 1500);
        
        return () => clearTimeout(completeTimer);
      }, stageInterval);
      
      return () => clearTimeout(extractingTimer);
    }
    
    if (currentIndex === stages.length - 1) return; // Stop at complete stage
    
    // Use faster interval for first two stage transitions
    const currentInterval = currentIndex < 2 ? stageInterval / 2 : stageInterval;
    
    const timer = setTimeout(() => {
      setStage(stages[currentIndex + 1]);
    }, currentInterval);
    
    return () => clearTimeout(timer);
  }, [stage, autoProgress, stageInterval]);
  
  // Progress bar animation
  useEffect(() => {
    let interval;
    if (stage === 'uploading') { // Only 'uploading' has progress bar
      setProgress(0); // Reset progress when stage changes
      setIsCompleted(false);
      
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCompleted(true);
            return 100;
          }
          return prev + 5;
        });
      }, 300);
    } else {
      setProgress(0);
      setIsCompleted(false);
    }
    
    return () => clearInterval(interval);
  }, [stage]);

  // Custom SVG icons
  const icons = {
    file: (className) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    ),
    scan: (className) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    ),
    database: (className) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      </svg>
    ),
    checkCircle: (className) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    loader: (className) => (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
    )
  };

  // Stages configuration
  const stageConfig = {
    uploading: {
      icon: icons.file,
      text: "Uploading document...",
      color: "text-teal-500",
      bgColor: "bg-teal-100"
    },
    analyzing: {
      icon: icons.scan,
      text: "Analyzing document...",
      color: "text-pink-500",
      bgColor: "bg-pink-100"
    },
    extracting: {
      icon: icons.database,
      text: "Extracting information...",
      color: "text-cyan-500",
      bgColor: "bg-cyan-100"
    },
    complete: {
      icon: icons.checkCircle,
      text: "Analysis complete!",
      color: "text-emerald-500",
      bgColor: "bg-emerald-100"
    }
  };

  const currentStage = stageConfig[stage] || stageConfig.uploading;

  // Determine which stages to show as active
  const isUploading = stage === 'uploading' || stage === 'analyzing' || stage === 'extracting' || stage === 'complete';
  const isAnalyzing = stage === 'analyzing' || stage === 'extracting' || stage === 'complete';
  const isExtracting = stage === 'extracting' || stage === 'complete';
  const isComplete = stage === 'complete';

  // Determine progress bar color based on completion
  const progressBarColor = isCompleted 
    ? "bg-emerald-500" 
    : currentStage.color.replace('text', 'bg');

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main status indicator */}
      {showCompletedBanner ? (
        <div className="mb-4 p-4 rounded-lg bg-emerald-500 text-white border border-emerald-600 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-center space-x-3">
            {icons.checkCircle("w-6 h-6 text-white")}
            <span className="text-lg font-medium">Complete!</span>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className={`${currentStage.bgColor} p-2 rounded-full ${stage !== 'complete' ? 'animate-pulse' : ''}`}>
              {currentStage.icon(`w-5 h-5 ${currentStage.color}`)}
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">
                {currentStage.text}
              </span>
              {(stage === 'uploading') && (
                <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full ${progressBarColor}`} 
                    style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}
                  ></div>
                </div>
              )}
              {stage !== 'uploading' && stage !== 'complete' && (
                <div className="mt-1 flex space-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce delay-150"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce delay-300"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Process timeline */}
      <div className="relative">
        <div className="absolute left-0 top-4 w-full h-0.5 bg-gray-200"></div>
        <div className="relative flex justify-between items-center">
          {/* Upload Stage */}
          <div className="flex flex-col items-center">
            <div className={`z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 ${isUploading ? 'border-teal-500 bg-teal-100' : 'border-gray-300 bg-white'}`}>
              {isUploading && stage !== 'uploading' ? (
                icons.checkCircle("w-4 h-4 text-teal-500")
              ) : isUploading ? (
                icons.loader("w-4 h-4 text-teal-500 animate-spin")
              ) : (
                icons.file("w-4 h-4 text-gray-400")
              )}
            </div>
            <span className="mt-1 text-xs text-gray-500">Upload</span>
          </div>
          
          {/* Analysis Stage */}
          <div className="flex flex-col items-center">
            <div className={`z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 ${isAnalyzing ? 'border-pink-500 bg-pink-100' : 'border-gray-300 bg-white'}`}>
              {isAnalyzing && stage !== 'analyzing' ? (
                icons.checkCircle("w-4 h-4 text-pink-500")
              ) : isAnalyzing ? (
                icons.loader("w-4 h-4 text-pink-500 animate-spin")
              ) : (
                icons.scan("w-4 h-4 text-gray-400")
              )}
            </div>
            <span className="mt-1 text-xs text-gray-500">Analyze</span>
          </div>
          
          {/* Extract Stage */}
          <div className="flex flex-col items-center">
            <div className={`z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 ${isExtracting ? 'border-cyan-500 bg-cyan-100' : 'border-gray-300 bg-white'}`}>
              {isExtracting && stage !== 'extracting' ? (
                icons.checkCircle("w-4 h-4 text-cyan-500")
              ) : isExtracting ? (
                icons.loader("w-4 h-4 text-cyan-500 animate-spin")
              ) : (
                icons.database("w-4 h-4 text-gray-400")
              )}
            </div>
            <span className="mt-1 text-xs text-gray-500">Extract</span>
          </div>
          
          {/* Complete Stage */}
          <div className="flex flex-col items-center">
            <div className={`z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 ${isComplete || showCompletedBanner ? 'border-emerald-500 bg-emerald-100' : 'border-gray-300 bg-white'}`}>
              {isComplete || showCompletedBanner ? (
                icons.checkCircle("w-4 h-4 text-emerald-500")
              ) : (
                icons.checkCircle("w-4 h-4 text-gray-400")
              )}
            </div>
            <span className="mt-1 text-xs text-gray-500">Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentTransferLoading;