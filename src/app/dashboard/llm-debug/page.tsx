'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { processEnrtyFromFile, processEnrtyFromText } from '@/lib/ai';
import { toast } from 'sonner';
import { ArrowLeft, Play, Copy, Upload, X, Mic, Square, Volume2, FileText } from 'lucide-react';
import Link from 'next/link';

interface ParsedEntry {
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  category: string;
  description?: string;
  confidence: number;
}

export default function LLMPlayground() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [parsedJson, setParsedJson] = useState<ParsedEntry | null>(null);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [processingMode, setProcessingMode] = useState<'text' | 'image' | 'audio' | 'pdf'>('text');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please select an image file');
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.type === 'video/mp4' || file.type === 'video/webm') {
        setSelectedAudio(file);
        // Create audio URL for playback
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
      } else {
        toast.error('Please select an audio file');
      }
    }
  };

  const removeAudio = () => {
    setSelectedAudio(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    // Reset file input
    const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
        setSelectedAudio(file);
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks to release microphone
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

  const handlePDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedPDF(file);
      } else {
        toast.error('Please select a PDF file');
      }
    }
  };

  const removePDF = () => {
    setSelectedPDF(null);
    // Reset file input
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async () => {
    if (processingMode === 'text' && !inputText.trim()) {
      toast.error('Please enter some text to parse');
      return;
    }
    
    if (processingMode === 'image' && !selectedImage) {
      toast.error('Please select an image to process');
      return;
    }

    if (processingMode === 'audio' && !selectedAudio) {
      toast.error('Please select an audio file or record audio');
      return;
    }

    if (processingMode === 'pdf' && !selectedPDF) {
      toast.error('Please select a PDF file');
      return;
    }

    setIsLoading(true);
    setRawOutput('');
    setParsedJson(null);

    try {
      let result: string;

      if (processingMode === 'text') {
        result = await processEnrtyFromText(inputText);
      } else if (processingMode === 'image' && selectedImage) {
        result = await processEnrtyFromFile(selectedImage);
      } else if (processingMode === 'audio' && selectedAudio) {
        result = await processEnrtyFromFile(selectedAudio);
      } else if (processingMode === 'pdf' && selectedPDF) {
        result = await processEnrtyFromFile(selectedPDF);
      } else {
        throw new Error('Invalid processing mode or missing file');
      }

      setRawOutput(result);

      // Parse structured JSON output
      try {
        const parsed = JSON.parse(result);
        setParsedJson(parsed);
        toast.success(`Successfully parsed entry (${processingMode} mode)`);
      } catch (parseError) {
        toast.error('Failed to parse structured output as JSON');
        console.error('JSON parse error:', parseError);
      }

    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate response');
      setRawOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">LLM Playground</h1>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemini-2.5-flash"
                className="max-w-sm"
              />
            </div>

            {/* Processing Mode Selection */}
            <div>
              <Label>Processing Mode</Label>
              <RadioGroup 
                value={processingMode} 
                onValueChange={(value: 'text' | 'image' | 'audio' | 'pdf') => setProcessingMode(value)}
                className="grid grid-cols-2 gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label htmlFor="text">Text</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="image" />
                  <Label htmlFor="image">Image</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="audio" id="audio" />
                  <Label htmlFor="audio">Audio</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">PDF</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Text Input */}
            {processingMode === 'text' && (
              <div>
                <Label htmlFor="input-text">Text to Parse</Label>
                <Textarea
                  id="input-text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text like: 'Spent $25 on lunch at McDonald's' or 'Got paid $2000 salary'"
                  className="min-h-20"
                />
              </div>
            )}

            {/* Image Upload */}
            {processingMode === 'image' && (
              <div>
                <Label htmlFor="image-upload">Receipt Image</Label>
                <div className="mt-2">
                  {!selectedImage ? (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground mb-2">
                        Click to upload receipt image
                      </div>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="max-w-xs"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{selectedImage.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {imagePreview && (
                        <div className="max-w-sm mx-auto">
                          <img 
                            src={imagePreview} 
                            alt="Receipt preview" 
                            className="w-full h-auto rounded border"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio Upload */}
            {processingMode === 'audio' && (
              <div>
                <Label>Audio Recording</Label>
                <div className="mt-2 space-y-4">
                  {/* Recording Controls */}
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startRecording}
                        disabled={isLoading}
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={stopRecording}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {isRecording ? 'Recording in progress...' : 'or upload an audio file'}
                    </span>
                  </div>

                  {/* File Upload */}
                  {!selectedAudio && !isRecording && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground mb-2">
                        Upload audio file
                      </div>
                      <Input
                        id="audio-upload"
                        type="file"
                        accept="audio/*,.mp4,.webm"
                        onChange={handleAudioChange}
                        className="max-w-xs"
                      />
                    </div>
                  )}

                  {/* Audio Preview */}
                  {selectedAudio && audioUrl && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{selectedAudio.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeAudio}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        <audio 
                          controls 
                          src={audioUrl}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PDF Upload */}
            {processingMode === 'pdf' && (
              <div>
                <Label htmlFor="pdf-upload">PDF Document</Label>
                <div className="mt-2">
                  {!selectedPDF ? (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground mb-2">
                        Upload PDF document (bank statements, invoices, receipts)
                      </div>
                      <Input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handlePDFChange}
                        className="max-w-xs"
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{selectedPDF.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(selectedPDF.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removePDF}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button 
              onClick={handleSubmit} 
              disabled={
                isLoading || 
                (processingMode === 'text' && !inputText.trim()) ||
                (processingMode === 'image' && !selectedImage) ||
                (processingMode === 'audio' && !selectedAudio) ||
                (processingMode === 'pdf' && !selectedPDF)
              }
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? 'Processing...' : `Parse Entry (${processingMode})`}
            </Button>
          </CardContent>
        </Card>

        {/* Parsed JSON Output */}
        {parsedJson && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-green-600">Parsed JSON</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(parsedJson, null, 2))}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                {JSON.stringify(parsedJson, null, 2)}
              </pre>
              
              {/* Visual representation */}
              <div className="mt-4 p-4 border rounded-md">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Type:</strong> {parsedJson.type}</div>
                  <div><strong>Amount:</strong> {parsedJson.currency} {parsedJson.amount}</div>
                  <div><strong>Category:</strong> {parsedJson.category}</div>
                  <div><strong>Confidence:</strong> {(parsedJson.confidence * 100).toFixed(0)}%</div>
                  {parsedJson.description && (
                    <div className="col-span-2"><strong>Description:</strong> {parsedJson.description}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Model Output */}
        {rawOutput && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Raw Model Output</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(rawOutput)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                {rawOutput}
              </pre>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}