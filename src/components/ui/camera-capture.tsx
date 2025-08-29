'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera as CameraIcon, RotateCcw, Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
  fullscreen?: boolean;
}

export function CameraCapture({ onCapture, onClose, isOpen, fullscreen = false }: CameraCaptureProps) {
  console.log('🎥 CameraCapture: Component render', { isOpen, fullscreen, onCapture: !!onCapture, onClose: !!onClose });

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const isMountedRef = useRef(true);

  const startCamera = useCallback(async () => {
    console.log('🎥 CameraCapture: startCamera called', { isMounted: isMountedRef.current, facingMode });

    if (!isMountedRef.current) {
      console.log('🎥 CameraCapture: Component not mounted, exiting');
      return;
    }

    try {
      console.log('🎥 CameraCapture: Setting loading state');
      setIsLoading(true);

      // Stop any existing stream first
      console.log('🎥 CameraCapture: Stopping existing stream');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      trackRef.current = null;
      setFlashEnabled(false);

      console.log('🎥 CameraCapture: Requesting camera access', { facingMode });
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      console.log('🎥 CameraCapture: Camera access granted', {
        tracks: mediaStream.getTracks().length,
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length
      });

      if (!isMountedRef.current) {
        console.log('🎥 CameraCapture: Component unmounted during camera access, cleaning up');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      setStream(mediaStream);
      trackRef.current = mediaStream.getVideoTracks()[0];
      console.log('🎥 CameraCapture: Stream set, video track available:', !!trackRef.current);

      if (videoRef.current && isMountedRef.current) {
        console.log('🎥 CameraCapture: Setting video srcObject');
        videoRef.current.srcObject = mediaStream;

        // Wait for the video to be ready before playing
        console.log('🎥 CameraCapture: Waiting for video metadata');
        await new Promise((resolve) => {
          if (videoRef.current && isMountedRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('🎥 CameraCapture: Video metadata loaded', {
                videoWidth: videoRef.current?.videoWidth,
                videoHeight: videoRef.current?.videoHeight,
                readyState: videoRef.current?.readyState
              });
              resolve(void 0);
            };
          }
        });

        // Only play if the stream is still current and component is mounted
        if (videoRef.current.srcObject === mediaStream && isMountedRef.current) {
          console.log('🎥 CameraCapture: Attempting to play video');
          try {
            await videoRef.current.play();
            console.log('🎥 CameraCapture: Video playing successfully');
          } catch (playError) {
            console.log('🎥 CameraCapture: Video play error', playError);
            // Ignore AbortError as it's expected when switching streams
            if (!(playError instanceof DOMException && playError.name === 'AbortError')) {
              throw playError;
            }
          }
        } else {
          console.log('🎥 CameraCapture: Skipping play - stream changed or component unmounted');
        }
      } else {
        console.log('🎥 CameraCapture: Video ref not available or component unmounted');
      }
    } catch (error) {
      console.error('🎥 CameraCapture: Error accessing camera:', error);
      if (isMountedRef.current) {
        toast.error('Failed to access camera. Please check permissions.');
        onClose();
      }
    } finally {
      if (isMountedRef.current) {
        console.log('🎥 CameraCapture: Clearing loading state');
        setIsLoading(false);
      }
    }
  }, [facingMode, onClose]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    trackRef.current = null;
    setFlashEnabled(false);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (isLoading) return; // Prevent rapid toggling

    stopCamera();

    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera, isLoading]);

  const toggleFlash = useCallback(async () => {
    if (!trackRef.current) return;

    try {
      const capabilities = trackRef.current.getCapabilities() as any;
      if (capabilities.torch) {
        await trackRef.current.applyConstraints({
          advanced: [{ torch: !flashEnabled } as any]
        });
        setFlashEnabled(!flashEnabled);
      } else {
        toast.error('Flash not supported on this device');
      }
    } catch (error) {
      console.error('Error toggling flash:', error);
      toast.error('Failed to toggle flash');
    }
  }, [flashEnabled]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !stream || isLoading) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready
    if (video.readyState < 2) {
      toast.error('Camera not ready yet');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Failed to access canvas');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          onCapture(file);
          toast.success('Photo captured!');

          // Don't stop camera immediately to prevent error loop
          setTimeout(() => {
            stopCamera();
            onClose();
          }, 100);
        } else {
          toast.error('Failed to capture photo');
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.error('Failed to take photo');
    }
  }, [onCapture, onClose, isLoading]);

  // Handle camera start/stop based on isOpen
  useEffect(() => {
    console.log('🎥 CameraCapture: useEffect triggered', { isOpen, isMounted: isMountedRef.current });

    const handleCameraState = async () => {
      if (!isMountedRef.current) {
        console.log('🎥 CameraCapture: Component not mounted, skipping camera state change');
        return;
      }

      if (isOpen) {
        console.log('🎥 CameraCapture: Opening camera');
        await startCamera();
      } else {
        console.log('🎥 CameraCapture: Closing camera');
        stopCamera();
      }
    };

    handleCameraState();

    return () => {
      console.log('🎥 CameraCapture: useEffect cleanup - stopping camera');
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  if (!isOpen) {
    console.log('🎥 CameraCapture: Component not rendered (isOpen=false)');
    return null;
  }

  console.log('🎥 CameraCapture: Component rendering UI');

  const containerClasses = fullscreen
    ? "fixed inset-0 z-50 bg-black flex flex-col"
    : "relative border rounded-lg overflow-hidden bg-black";

  const videoClasses = fullscreen
    ? "flex-1 object-cover"
    : "w-full h-64 object-cover";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <h3 className="text-lg font-semibold">Camera</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Preview */}
      <div className="relative flex-1">
        <video
          ref={(ref) => {
            videoRef.current = ref;
            console.log('🎥 CameraCapture: Video ref set', {
              hasRef: !!ref,
              srcObject: ref?.srcObject,
              readyState: ref?.readyState,
              networkState: ref?.networkState,
              error: ref?.error
            });
          }}
          className={videoClasses}
          autoPlay
          muted
          playsInline
          onLoadStart={() => console.log('🎥 CameraCapture: Video load started')}
          onLoadedData={() => console.log('🎥 CameraCapture: Video data loaded')}
          onCanPlay={() => console.log('🎥 CameraCapture: Video can play')}
          onPlay={() => console.log('🎥 CameraCapture: Video started playing')}
          onPause={() => console.log('🎥 CameraCapture: Video paused')}
          onError={(e) => console.log('🎥 CameraCapture: Video error', e)}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
        {/* Flash toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFlash}
          className="text-white hover:bg-white/20"
          disabled={!trackRef.current}
        >
          {flashEnabled ? (
            <FlashlightOff className="h-6 w-6" />
          ) : (
            <Flashlight className="h-6 w-6" />
          )}
        </Button>

        {/* Capture button */}
        <Button
          size="lg"
          onClick={takePhoto}
          disabled={isLoading}
          className="rounded-full h-16 w-16 bg-white hover:bg-gray-200 text-black border-4 border-white"
        >
          <CameraIcon className="h-8 w-8" />
        </Button>

        {/* Camera toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCamera}
          className="text-white hover:bg-white/20"
          disabled={isLoading}
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

// Hook for using camera capture
export function useCameraCapture() {
  console.log('🎥 useCameraCapture: Hook initialized');

  const [isOpen, setIsOpen] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const openCamera = useCallback(() => {
    console.log('🎥 useCameraCapture: openCamera called');
    setIsOpen(true);
    setCapturedFile(null);
  }, []);

  const closeCamera = useCallback(() => {
    console.log('🎥 useCameraCapture: closeCamera called');
    setIsOpen(false);
  }, []);

  const handleCapture = useCallback((file: File) => {
    console.log('🎥 useCameraCapture: handleCapture called', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    setCapturedFile(file);
  }, []);

  console.log('🎥 useCameraCapture: Hook state', { isOpen, hasCapturedFile: !!capturedFile });

  return {
    isOpen,
    capturedFile,
    openCamera,
    closeCamera,
    handleCapture
  };
}
