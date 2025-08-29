'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Camera, Mic, Send, X, Square, FileText, Image, Volume2 } from 'lucide-react';
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
  isCameraActive: boolean;
  cameraStream: MediaStream | null;
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
    isCameraActive: false,
    cameraStream: null,
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
    isCameraActive,
    cameraStream,
    mediaRecorder
  } = mediaState;

  const currentFile = selectedImage || selectedAudio || selectedPDF;
  const hasFile = !!currentFile;
  const hasContent = value.trim() || hasFile;

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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      updateMediaState({
        cameraStream: stream,
        isCameraActive: true
      });
      toast.success('Camera started');
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      updateMediaState({
        cameraStream: null,
        isCameraActive: false
      });
      toast.success('Camera stopped');
    }
  };

  const takePhoto = () => {
    if (!cameraStream) return;

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    video.srcObject = cameraStream;
    video.play();

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });

          updateFileState({
            selectedImage: null,
            selectedAudio: null,
            selectedPDF: null,
            imagePreview: null,
            audioUrl: null,
            cameraPhoto: null
          });



          updateFileState({
            selectedImage: file,
            cameraPhoto: canvas.toDataURL('image/jpeg'),
            imagePreview: canvas.toDataURL('image/jpeg')
          });

          // Don't fill input with filename - keep it editable for text
          onFileSelect?.(file);
        }
      }, 'image/jpeg', 0.8);

      stopCamera();
    };
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
            {!isCameraActive ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={startCamera}
                disabled={isLoading}
              >
                <Camera />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={takePhoto}
                disabled={isLoading}
              >
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              </Button>
            )}

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

      {/* Camera Preview */}
      {isCameraActive && cameraStream && (
        <div className="border rounded-lg p-3 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Camera Preview</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopCamera}
            >
              <X />
            </Button>
          </div>
          <div className="max-w-xs mx-auto">
            <video
              ref={(video) => {
                if (video && cameraStream) {
                  video.srcObject = cameraStream;
                  video.play();
                }
              }}
              className="w-full h-auto rounded border"
              autoPlay
              muted
              playsInline
            />
          </div>
          <div className="flex justify-center mt-2">
            <Button
              onClick={takePhoto}
              size="sm"
              disabled={isLoading}
            >
              Take Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
