import { z } from 'zod';

const StudyCardGenerationMetadataSchema = z
  .object({
    noteTypeHint: z.enum(['basic', 'reversed', 'cloze', 'scenario']).optional(),
    cognitiveLevel: z
      .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate'])
      .optional(),
    reasoningType: z
      .enum([
        'mechanism',
        'tradeoff',
        'comparison',
        'scenario',
        'debugging',
        'transfer',
      ])
      .optional(),
    difficulty: z.enum(['intro', 'intermediate', 'advanced']).optional(),
  })
  .strict();

const StudyConceptSlugSchema = z.string().min(2).max(40);

export function parseStudyRubricInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

const StudyRubricSchema = z
  .union([z.string(), z.array(z.string())])
  .transform(parseStudyRubricInput)
  .pipe(z.array(z.string().min(5)).min(2).max(8));

const StudyCardGraphMetadataSchema = z.object({
  concepts: z.array(StudyConceptSlugSchema).min(1).max(7),
  prerequisites: z.array(StudyConceptSlugSchema).max(2).optional(),
});

export const StudyCardsGenerateOutputSchema = z.object({
  deckName: z.string().min(1).max(120),
  deckConcepts: z.array(StudyConceptSlugSchema).max(20).optional(),
  recall: z
    .array(
      z
        .object({
          question: z.string().min(10),
          answer: z.string().min(10),
          misconceptions: z.array(z.string()).max(3).optional(),
          blockIds: z.array(z.string()).optional(),
          metadata: StudyCardGenerationMetadataSchema.optional(),
        })
        .merge(StudyCardGraphMetadataSchema)
    )
    .min(1)
    .max(30),
  synthesis: z
    .array(
      z
        .object({
          question: z.string().min(20),
          rubric: StudyRubricSchema,
          blockIds: z.array(z.string()).optional(),
          metadata: StudyCardGenerationMetadataSchema.optional(),
        })
        .merge(StudyCardGraphMetadataSchema)
    )
    .min(1)
    .max(30),
});

export type StudyCardsGenerateOutput = z.infer<
  typeof StudyCardsGenerateOutputSchema
>;
export type StudyCardGenerationMetadata = z.infer<
  typeof StudyCardGenerationMetadataSchema
>;

export type StudyCardPreview = {
  id: string;
  type: 'recall' | 'synthesis';
  question: string;
  answer?: string;
  concepts?: string[];
  prerequisites?: string[];
  misconceptions?: string[];
  rubric?: string[];
  blockIds?: string[];
  metadata?: StudyCardGenerationMetadata;
  accepted: boolean;
};
