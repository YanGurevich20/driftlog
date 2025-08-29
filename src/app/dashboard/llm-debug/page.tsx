'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { ComboInput } from '@/components/ui/combo-input';
import { processEntry } from '@/lib/ai';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [parsedJson, setParsedJson] = useState<ParsedEntry | null>(null);

  const handleSubmit = async () => {
    if (!inputText.trim() && !selectedFile) {
      toast.error('Please enter text or select a file to process');
      return;
    }

    setIsLoading(true);
    setRawOutput('');
    setParsedJson(null);

    try {
      // Use the new processEntry function that handles both text and file
      const result = await processEntry(inputText || undefined, selectedFile || undefined);

      setRawOutput(result);

      try {
        const parsed = JSON.parse(result);
        setParsedJson(parsed);
        toast.success('Successfully parsed entry');
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
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComboInput
              value={inputText}
              onChange={setInputText}
              placeholder="Describe the entry..."
              onSubmit={handleSubmit}
              onFileSelect={setSelectedFile}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

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