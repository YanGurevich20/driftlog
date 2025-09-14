import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import app from '../firebase';
import { entrySchema } from './schemas';
import { CATEGORY_NAMES } from '@/types/category';

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
today is ${new Date().toISOString().split('T')[0]}.
if there is no exact sum or price depicted in the data, return the following object:
{type: "expense", amount: 0, currency: "USD", category: "Other", date: today, description: "Unknown", confidence: 0}
Extract the following information from the data:
- type: "expense" or "income"
- amount: the total amount (absolute number value)
- currency: the currency code (USD, EUR, etc.)
- category: select the most relevant category from the list: ${CATEGORY_NAMES.join(', ')}
- date: the date of the transaction (YYYY-MM-DD). default to today if not provided
- description: brief description of WHAT IS the expense / income source, merchant, item, etc. feel free to add an emoji if it makes sense.
- confidence: your confidence in the extraction (0.0 to 1.0)
example input: 50 bucks at mcdonalds
example response expected from you for the given input (omit any text and decorators beside the raw JSON):
{type: "expense", amount: 50, currency: "USD", category: "Food", date: ${new Date().toISOString().split('T')[0]}", description: "Lunch at McDonald's 🍔", confidence: 1.0}
Here's the data to analyze: ${text}`;

const extractJSON = (text: string): string => {
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  
  return text.trim();
};

export const processEntry = async (text?: string, file?: File) => {
  if (!text && !file) throw new Error('No text or file provided');
  const model = getEntryParserModel();
  const filePart = file ? await fileToGenerativePart(file) : '';
  const result = await model.generateContent([getAnalysisPrompt(text), filePart]);
  const rawText = result.response.text();
  
  return extractJSON(rawText);
}