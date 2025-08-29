'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Camera, Mic, Send, X, Square, FileText, Image, Volume2 } from 'lucide-react';
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
  onFileSelect?: (file: File | null) => void;
}

interface FileState {
  selectedImage: File | null;
  selectedAudio: File | null;
  selectedPDF: File | null;
  imagePreview: string | null;
  audioUrl: string | null;
  cameraPhoto: string | null;
}

interface MediaState {
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
}

export interface ComboInputRef {
  getFileState: () => FileState;
  clearFiles: () => void;
  hasFile: () => boolean;
}

export function ComboInput({
  value,
  onChange,
  placeholder = "Enter text, upload a file, take a photo, or record audio...",
  onSubmit,
  isLoading = false,
  accept = ".pdf,image/png,image/jpeg,image/webp,audio/aac,audio/flac,audio/mp3,audio/m4a,audio/mpeg,audio/mpga,audio/mp4,audio/opus,audio/pcm,audio/wav,audio/webm,.mp4,.webm",
  className = "",
  onFileSelect
}: ComboInputProps) {
  const [fileState, setFileState] = useState<FileState>({
    selectedImage: null,
    selectedAudio: null,
    selectedPDF: null,
    imagePreview: null,
    audioUrl: null,
    cameraPhoto: null
  });

  const [mediaState, setMediaState] = useState<MediaState>({
    isRecording: false,
    mediaRecorder: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedImage,
    selectedAudio,
    selectedPDF,
    imagePreview,
    audioUrl,
    cameraPhoto
  } = fileState;

  const {
    isRecording,
    mediaRecorder
  } = mediaState;

  // Camera capture hook
  const {
    isOpen: isCameraOpen,
    capturedFile: capturedPhoto,
    openCamera,
    closeCamera,
    handleCapture: handlePhotoCapture
  } = useCameraCapture();

  const currentFile = selectedImage || selectedAudio || selectedPDF;
  const hasFile = !!currentFile;
  const hasContent = value.trim() || hasFile;

  // Handle captured photo from camera
  React.useEffect(() => {
    if (capturedPhoto) {
      // Process the captured photo like any other file
      updateFileState({
        selectedImage: null,
        selectedAudio: null,
        selectedPDF: null,
        imagePreview: null,
        audioUrl: null,
        cameraPhoto: null
      });

      // Create a data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        updateFileState({
          selectedImage: capturedPhoto,
          cameraPhoto: reader.result as string,
          imagePreview: reader.result as string
        });
        onFileSelect?.(capturedPhoto);
      };
      reader.readAsDataURL(capturedPhoto);
    }
  }, [capturedPhoto, onFileSelect]);

  const getFileIcon = () => {
    if (selectedImage) return <Image className="h-4 w-4" />;
    if (selectedAudio) return <Volume2 className="h-4 w-4" />;
    if (selectedPDF) return <FileText className="h-4 w-4" />;
    return null;
  };

  // currentFile is now computed above

  const updateFileState = (updates: Partial<FileState>) => {
    setFileState(prev => ({ ...prev, ...updates }));
  };

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
      // Clear other files
      updateFileState({
        selectedImage: null,
        selectedAudio: null,
        selectedPDF: null,
        imagePreview: null,
        audioUrl: null,
        cameraPhoto: null
      });

      // Don't fill input with filename - keep it editable for text

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updateFileState({
            selectedImage: file,
            imagePreview: reader.result as string
          });
          onFileSelect?.(file);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('audio/') || file.type === 'video/mp4' || file.type === 'video/webm') {
        const url = URL.createObjectURL(file);
        updateFileState({
          selectedAudio: file,
          audioUrl: url
        });
        onFileSelect?.(file);
      } else if (file.type === 'application/pdf') {
        updateFileState({ selectedPDF: file });
        onFileSelect?.(file);
      }
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

        updateFileState({
          selectedImage: null,
          selectedAudio: null,
          selectedPDF: null,
          imagePreview: null,
          audioUrl: null,
          cameraPhoto: null
        });

        // Don't fill input with filename - keep it editable for text

        const url = URL.createObjectURL(blob);
        updateFileState({
          selectedAudio: file,
          audioUrl: url
        });

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

  const removeFile = () => {

    updateFileState({
      selectedImage: null,
      selectedAudio: null,
      selectedPDF: null,
      imagePreview: null,
      cameraPhoto: null
    });

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      updateFileState({ audioUrl: null });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onFileSelect?.(null);
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-2">
      {/* File Display Section */}
      {hasFile && (
        <div className="flex items-center justify-between h-8 px-3 py-1 bg-muted/50 rounded-md border">
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <span className="text-sm font-medium">
              {currentFile?.name}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={removeFile}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

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
