import React, { useEffect, useRef, useState } from "react";
import { FiDownload } from "react-icons/fi";
import axiosInstance from "../../axiosInstance";

export default function PlanPDFViewerCard({ path = "/pdf-view/", filename = "Plan.pdf" }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [error, setError] = useState("");
  const urlRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await axiosInstance.get(path, { responseType: "blob" });
        if (cancelled) return;
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) setError("Failed to load plan PDF");
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [path]);

  const handleDownload = async () => {
    try {
      const response = await axiosInstance.get(path, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const dlUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = dlUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(dlUrl);
      setDownloadStatus("Plan downloaded successfully!");
      setTimeout(() => setDownloadStatus(""), 3000);
    } catch (e) {
      setDownloadStatus("Failed to download plan PDF");
      setTimeout(() => setDownloadStatus(""), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center w-full my-2">
      <div className="bg-botBackgroundColor border border-black rounded-lg p-4 w-full max-w-3xl shadow-sm">
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 bg-botBackgroundColor rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="text-black font-semibold">Plan Document</h4>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
        )}

        <div className="w-full">
          {blobUrl ? (
            <iframe title="plan-pdf" src={blobUrl} className="w-full h-[70vh] border border-gray-200 rounded" />
          ) : (
            <div className="w-full h-[70vh] border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500">
              Loading plan PDF...
            </div>
          )}
        </div>

        {downloadStatus && (
          <div className="mt-3 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
            {downloadStatus}
          </div>
        )}

        <button
          onClick={handleDownload}
          className="mt-3 w-full flex items-center justify-center bg-sendColor hover:bg-sendColor text-black font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <FiDownload className="w-4 h-4 mr-2" />
          Download Plan PDF
        </button>
      </div>
    </div>
  );
}


