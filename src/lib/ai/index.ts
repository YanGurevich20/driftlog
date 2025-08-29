import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import app from '../firebase';
import { entrySchema } from './schemas';
import { CATEGORY_NAMES } from '@/types/categories';

// Initialize the Gemini Developer API backend service
export const ai = getAI(app, { backend: new GoogleAIBackend() });

// Create a GenerativeModel instance with structured output for entry parsing
const getEntryParserModel = () => {
  return getGenerativeModel(ai, { 
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: entrySchema
    }
  });
};

// Convert a File object to a GenerativePart for image processing
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: { 
      data: await base64EncodedDataPromise, 
      mimeType: file.type 
    },
  };
}

const getAnalysisPrompt = (text?: string) => 
`You are analyzing a ${text ? 'text' : 'file'} to extract financial entry information. 
Extract the following information from the data:
- type: "expense" (receipts are typically expenses)
- amount: the total amount paid (number only, no currency symbols)
- currency: the currency code (USD, EUR, etc.)
- category: categorize based on context from the list: ${CATEGORY_NAMES.join(', ')}
- date: the date of the transaction (YYYY-MM-DD) default to ${new Date().toISOString().split('T')[0]} if not provided
- description: brief description of the merchant or main items
- confidence: your confidence in the extraction (0.0 to 1.0)
Analyze this: ${text}`;

export const processEntry = async (text?: string, file?: File) => {
  console.log(new Date().toISOString().split('T')[0])
  if (!text && !file) throw new Error('No text or file provided');
  const model = getEntryParserModel();
  const filePart = file ? await fileToGenerativePart(file) : '';
  const result = await model.generateContent([getAnalysisPrompt(text), filePart]);
  return result.response.text();
}