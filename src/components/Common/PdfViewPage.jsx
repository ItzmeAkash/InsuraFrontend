import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance, { baseURL } from '../../axiosInstance';
import PlanPDFViewerCard from './PlanPDFViewerCard';

export default function PdfViewPage() {
  const [blobUrl, setBlobUrl] = useState('');
  const [error, setError] = useState('');
  const objectUrlRef = useRef('');

  const downloadPath = '/pdf-view/';
  const filename = 'document.pdf';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await axiosInstance.get(downloadPath, { responseType: 'blob' });
        if (cancelled) return;
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) setError('Failed to load PDF');
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const iframeTitle = useMemo(() => `pdf-view-${Date.now()}`, []);

  return (
    <div className="w-full h-screen flex flex-col items-center bg-white">
      <div className="w-full max-w-5xl p-4">
        <h1 className="text-xl font-semibold mb-3">PDF Preview</h1>
        {error && (
          <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
        )}
        {blobUrl ? (
          <iframe
            key={iframeTitle}
            title={iframeTitle}
            src={blobUrl}
            className="w-full h-[70vh] border border-gray-200 rounded"
          />
        ) : (
          <div className="w-full h-[70vh] border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500">
            Loading PDF...
          </div>
        )}

        <div className="mt-4">
          <PlanPDFViewerCard path={downloadPath} filename={filename} />
        </div>
      </div>
    </div>
  );
}


