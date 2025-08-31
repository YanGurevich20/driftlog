'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Camera, Mic, Send, Loader2, Circle, File as FileIcon } from 'lucide-react';
import { CameraCapture, useCameraCapture } from './camera-capture';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = 'image/png,image/jpeg,image/webp,audio/aac,audio/flac,audio/mp3,audio/m4a,audio/mpeg,audio/mpga,audio/mp4,audio/opus,audio/pcm,audio/wav,audio/webm,application/pdf';

function RecordingIndicator({ onStop }: { onStop: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onStop} className="text-red-500 hover:text-red-600" title="Stop recording">
      <Circle className="fill-red-500 text-red-500 animate-pulse" />
    </Button>
  );
}

function AttachPopover({ onFileSelect, onCamera, onRecord }: {
  onFileSelect: () => void;
  onCamera: () => void;
  onRecord: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <Paperclip />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          {[
            { icon: <FileIcon />, label: 'Upload File', action: onFileSelect },
            { icon: <Camera />, label: 'Take Photo', action: onCamera },
            { icon: <Mic />, label: 'Record Audio', action: onRecord }
          ].map(({ icon, label, action }, i) => (
            <Button key={i} variant="ghost" size="sm" className="w-full justify-start" onClick={() => { action(); setIsOpen(false); }}>
              {icon} {label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SendButton({ onSubmit, disabled, isLoading }: {
  onSubmit: () => void;
  disabled: boolean;
  isLoading: boolean;
}) {
  return (
    <Button size="sm" variant="ghost" onClick={onSubmit} disabled={disabled}>
      {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
    </Button>
  );
}

export function ComboInput({
  value,
  onChange,
  placeholder = "Enter text, upload a file, take a photo, or record audio...",
  onSubmit,
  isLoading = false,
  accept = ALLOWED_TYPES,
  className,
  selectedFile,
  onFileSelect
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  isLoading?: boolean;
  accept?: string;
  className?: string;
  selectedFile?: File | null;
  onFileSelect?: (file: File | null) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isOpen: isCameraOpen, capturedFile: capturedPhoto, openCamera, closeCamera, handleCapture: handlePhotoCapture } = useCameraCapture();

  const hasFile = !!selectedFile;
  const hasContent = value.trim() || hasFile;

  React.useEffect(() => {
    if (!selectedFile && fileInputRef.current) fileInputRef.current.value = '';
    if (capturedPhoto) onFileSelect?.(capturedPhoto);
  }, [selectedFile, capturedPhoto, onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (ALLOWED_TYPES.split(',').includes(file.type)) onFileSelect?.(file);
    else toast.error('Please select a supported file type (image, audio, or PDF)');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        const blob = new Blob([e.data], { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        onFileSelect?.(file);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-0">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("flex-1", className)}
        />
        <div className="flex items-center gap-1">
          {isRecording ? (
            <RecordingIndicator onStop={stopRecording} />
          ) : !hasFile && !isLoading && (
            <AttachPopover
              onFileSelect={() => fileInputRef.current?.click()}
              onCamera={openCamera}
              onRecord={startRecording}
            />
          )}
          <SendButton
            onSubmit={() => onSubmit?.()}
            disabled={!hasContent || isLoading}
            isLoading={isLoading}
          />
        </div>
      </div>
      <Input ref={fileInputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
      <CameraCapture isOpen={isCameraOpen} onClose={closeCamera} onCapture={handlePhotoCapture} fullscreen />
    </div>
  );
}
