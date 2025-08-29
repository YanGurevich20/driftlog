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

const ALLOWED_FILE_TYPES = [
  // Images
  'image/png', 'image/jpeg', 'image/webp',
  // Audio
  'audio/aac', 'audio/flac', 'audio/mp3', 'audio/m4a', 'audio/mpeg',
  'audio/mpga', 'audio/mp4', 'audio/opus', 'audio/pcm', 'audio/wav', 'audio/webm',
  // PDF
  'application/pdf'
];

const DEFAULT_ACCEPT = ".pdf,image/png,image/jpeg,image/webp,audio/aac,audio/flac,audio/mp3,audio/m4a,audio/mpeg,audio/mpga,audio/mp4,audio/opus,audio/pcm,audio/wav,audio/webm,.mp4,.webm";

export function ComboInput({
  value,
  onChange,
  placeholder = "Enter text, upload a file, take a photo, or record audio...",
  onSubmit,
  isLoading = false,
  accept = DEFAULT_ACCEPT,
  className = "",
  selectedFile = null,
  onFileSelect
}: ComboInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (ALLOWED_FILE_TYPES.includes(file.type)) {
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
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      toast.success('Recording stopped');
    }
  };


  const handleSubmit = () => {
    onSubmit?.();
  };

  const actionButtons = [
    {
      key: 'file',
      icon: <Paperclip />,
      onClick: () => fileInputRef.current?.click(),
      show: !hasFile
    },
    {
      key: 'camera', 
      icon: <Camera />,
      onClick: openCamera,
      show: !hasFile
    },
    {
      key: 'mic',
      icon: isRecording ? <Square /> : <Mic />,
      onClick: isRecording ? stopRecording : startRecording,
      show: !hasFile
    },
    {
      key: 'send',
      icon: <Send />,
      onClick: handleSubmit,
      show: hasContent
    }
  ].filter(button => button.show);

  const paddingClass = actionButtons.length === 4 ? 'pr-40' : 'pr-32';

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${paddingClass} ${className}`}
        />

        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex">
          {actionButtons.map(({ key, icon, onClick }) => (
            <Button
              key={key}
              size="sm"
              variant="ghost"
              onClick={onClick}
              disabled={isLoading}
            >
              {icon}
            </Button>
          ))}
        </div>

        {/* Hidden file input */}
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
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
