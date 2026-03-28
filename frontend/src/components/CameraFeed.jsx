import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiCameraOff, FiAlertCircle } from 'react-icons/fi';

const CameraFeed = forwardRef(({ onStreamReady, onStreamError, isActive = true }, ref) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Expose specific handles to parent, like the raw video element
  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    getStream: () => streamRef.current
  }));

  const startCamera = async () => {
    if (!isActive) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear any existing stream
      stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 } // Optimize to prevent browser lag
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Handle unexpected camera drops (e.g., unplugged USB camera)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.warn('Camera stream ended unexpectedly. Attempting to recover...');
          setError('Camera connection lost. Recovering...');
          setTimeout(startCamera, 2000);
        };
      }

      setIsLoading(false);
      if (onStreamReady) onStreamReady(stream);
      
    } catch (err) {
      setIsLoading(false);
      let errorMsg = 'Failed to access camera.';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera access denied. Please allow permissions in your browser.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera device found.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is already in use by another application.';
      }
      
      setError(errorMsg);
      if (onStreamError) onStreamError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  return (
    <div className="relative w-full h-full bg-surface-900 rounded-xl overflow-hidden flex flex-col items-center justify-center">
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-800/80 z-10 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-800/90 z-10 text-center p-4">
          <FiAlertCircle className="text-red-400 text-4xl mb-2" />
          <p className="text-red-400 font-medium mb-3">{error}</p>
          <button 
            onClick={startCamera}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Primary Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${isActive && !error && !isLoading ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {!isActive && !error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <FiCameraOff className="text-4xl mb-3 opacity-30" />
          <p className="text-sm">Camera is inactive</p>
        </div>
      )}
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
