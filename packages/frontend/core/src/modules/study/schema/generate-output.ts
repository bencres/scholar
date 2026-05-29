import { z } from 'zod';

export const StudyCardsGenerateOutputSchema = z.object({
  deckName: z.string().min(1).max(120),
  recall: z
    .array(
      z.object({
        question: z.string().min(10),
        answer: z.string().min(10),
        misconceptions: z.array(z.string()).max(3).optional(),
        blockIds: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .max(30),
  synthesis: z
    .array(
      z.object({
        question: z.string().min(20),
        rubric: z.array(z.string().min(5)).min(2).max(8),
        blockIds: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .max(30),
});

export type StudyCardsGenerateOutput = z.infer<
  typeof StudyCardsGenerateOutputSchema
>;

export type StudyCardPreview = {
  id: string;
  type: 'recall' | 'synthesis';
  question: string;
  answer?: string;
  misconceptions?: string[];
  rubric?: string[];
  blockIds?: string[];
  accepted: boolean;
};
