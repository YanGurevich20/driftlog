import { Schema } from 'firebase/ai';
import { CATEGORY_NAMES } from '@/types/category';

export const entrySchema = Schema.object({
    properties: {
      type: Schema.enumString({
        enum: ['expense', 'income']
      }),
      amount: Schema.number({minimum: 0}),
      currency: Schema.string(),
      category: Schema.enumString({
        enum: CATEGORY_NAMES
      }),
      description: Schema.string({ nullable: true }),
      date: Schema.string(),
      confidence: Schema.number({minimum: 0, maximum: 1}),
    },
    optionalProperties: ["description"]
  });