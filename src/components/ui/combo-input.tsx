'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Camera, Mic, Send, Square } from 'lucide-react';
import { CameraCapture, useCameraCapture } from './camera-capture';
import { toast } from 'sonner';

interface ComboInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  isLoading?: boolean;
  accept?: string;
  className?: string;
  selectedFile?: File | null; // Controlled by parent
  onFileSelect?: (file: File | null) => void;
}

interface MediaState {
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
}

export function ComboInput({
  value,
  onChange,
  placeholder = "Enter text, upload a file, take a photo, or record audio...",
  onSubmit,
  isLoading = false,
  accept = ".pdf,image/png,image/jpeg,image/webp,audio/aac,audio/flac,audio/mp3,audio/m4a,audio/mpeg,audio/mpga,audio/mp4,audio/opus,audio/pcm,audio/wav,audio/webm,.mp4,.webm",
  className = "",
  selectedFile = null,
  onFileSelect
}: ComboInputProps) {
  const [mediaState, setMediaState] = useState<MediaState>({
    isRecording: false,
    mediaRecorder: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isRecording, mediaRecorder } = mediaState;
  
  // Reset file input when selectedFile becomes null
  React.useEffect(() => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFile]);

  // Camera capture hook
  const {
    isOpen: isCameraOpen,
    capturedFile: capturedPhoto,
    openCamera,
    closeCamera,
    handleCapture: handlePhotoCapture
  } = useCameraCapture();

  const hasFile = !!selectedFile;
  const hasContent = value.trim() || hasFile;

  // Handle captured photo from camera
  React.useEffect(() => {
    if (capturedPhoto) {
      onFileSelect?.(capturedPhoto);
    }
  }, [capturedPhoto, onFileSelect]);

  const updateMediaState = (updates: Partial<MediaState>) => {
    setMediaState(prev => ({ ...prev, ...updates }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      // Images
      'image/png', 'image/jpeg', 'image/webp',
      // Audio
      'audio/aac', 'audio/flac', 'audio/mp3', 'audio/m4a', 'audio/mpeg',
      'audio/mpga', 'audio/mp4', 'audio/opus', 'audio/pcm', 'audio/wav', 'audio/webm',
      // PDF
      'application/pdf'
    ];

    if (allowedTypes.includes(file.type)) {
      onFileSelect?.(file);
    } else {
      toast.error('Please select a supported file type (image, audio, or PDF)');
    }
  };



  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

        onFileSelect?.(file);

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      updateMediaState({
        mediaRecorder: recorder,
        isRecording: true
      });
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      updateMediaState({
        isRecording: false,
        mediaRecorder: null
      });
      toast.success('Recording stopped');
    }
  };


  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pr-32 ${className}`}
        />

      {/* Action Buttons */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex">
        {/* Action buttons when no file exists (can coexist with send button) */}
        {!hasFile && (
          <>
            {/* File Upload */}
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip />
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Camera */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                openCamera();
              }}
              disabled={isLoading}
            >
              <Camera />
            </Button>

            {/* Microphone */}
            {!isRecording ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={startRecording}
                disabled={isLoading}
              >
                <Mic />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={stopRecording}
                disabled={isLoading}
              >
                <Square />
              </Button>
            )}
          </>
        )}

        {/* Send button when there's any content (text or file) */}
        {hasContent && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading}
            variant="ghost"
          >
            <Send />
          </Button>
        )}
      </div>
    </div>

    {/* Camera Capture Modal */}
    <CameraCapture
      isOpen={isCameraOpen}
      onClose={closeCamera}
      onCapture={handlePhotoCapture}
      fullscreen={true}
    />
    </div>
  );
}
