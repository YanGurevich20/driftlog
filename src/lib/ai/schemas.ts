import { Schema } from 'firebase/ai';
import { CATEGORY_NAMES } from '@/types/categories';
import { EntryType } from '@/types/entries';

export const entrySchema = Schema.object({
    properties: {
      type: Schema.enumString({
        enum: Object.values(EntryType)
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