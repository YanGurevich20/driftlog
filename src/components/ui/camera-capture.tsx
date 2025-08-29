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

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const isMountedRef = useRef(true);
  const sessionIdRef = useRef(0);

  type TorchMediaTrackCapabilities = MediaTrackCapabilities & { torch?: boolean };
  type TorchMediaTrackConstraintSet = MediaTrackConstraintSet & { torch?: boolean };

  const startCamera = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setIsVideoReady(false);
      setIsTorchSupported(false);

      // Feature preflight
      const getUserMedia = navigator?.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (!getUserMedia) {
        toast.error('Camera not supported in this browser');
        onClose();
        return;
      }

      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      trackRef.current = null;
      setFlashEnabled(false);

      const currentSessionId = ++sessionIdRef.current;

      const mediaStream = await getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (!isMountedRef.current || currentSessionId !== sessionIdRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      setStream(mediaStream);
      trackRef.current = mediaStream.getVideoTracks()[0];

      // Detect torch capability if present
      try {
        const capabilities = (trackRef.current.getCapabilities?.() ?? {}) as TorchMediaTrackCapabilities;
        setIsTorchSupported(Boolean(capabilities.torch));
      } catch {
        setIsTorchSupported(false);
      }

      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for the video to be ready before playing
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          const handler = () => {
            resolve();
          };
          video.addEventListener('loadedmetadata', handler, { once: true });
        });

        // Only play if the stream is still current and component is mounted
        if (videoRef.current.srcObject === mediaStream && isMountedRef.current && currentSessionId === sessionIdRef.current) {
          try {
            await videoRef.current.play();
            setIsVideoReady(true);
          } catch (playError) {
            // Ignore AbortError as it's expected when switching streams
            if (!(playError instanceof DOMException && playError.name === 'AbortError')) {
              // If play fails for other reasons, notify the user
              toast.error('Failed to start camera preview');
            }
          }
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        toast.error('Failed to access camera. Please check permissions.');
        onClose();
      }
    } finally {
      if (isMountedRef.current) {
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
    setIsVideoReady(false);
    setIsTorchSupported(false);
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
      const capabilities = (trackRef.current.getCapabilities?.() ?? {}) as TorchMediaTrackCapabilities;
      if (capabilities.torch) {
        const constraints: MediaTrackConstraints = { advanced: [{ torch: !flashEnabled } as TorchMediaTrackConstraintSet] };
        await trackRef.current.applyConstraints(constraints);
        setFlashEnabled(!flashEnabled);
      } else {
        toast.error('Flash not supported on this device');
      }
    } catch (error) {
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
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Reset transform for future operations (defensive)
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture.jpg`, {
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
      toast.error('Failed to take photo');
    }
  }, [onCapture, onClose, isLoading, facingMode]);

  // Handle camera start/stop based on isOpen
  useEffect(() => {
    const handleCameraState = async () => {
      if (!isMountedRef.current) {
        return;
      }

      if (isOpen) {
        await startCamera();
      } else {
        stopCamera();
      }
    };

    handleCameraState();

    return () => {
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
    return null;
  }

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
          }}
          className={videoClasses}
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
          autoPlay
          muted
          playsInline
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
          disabled={!trackRef.current || !isTorchSupported}
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
          disabled={isLoading || !isVideoReady}
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
  const [isOpen, setIsOpen] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const openCamera = useCallback(() => {
    setIsOpen(true);
    setCapturedFile(null);
  }, []);

  const closeCamera = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCapture = useCallback((file: File) => {
    setCapturedFile(file);
  }, []);

  return {
    isOpen,
    capturedFile,
    openCamera,
    closeCamera,
    handleCapture
  };
}
