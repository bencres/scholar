import type { StudyCardsGenerateOutput } from '../schema/generate-output';

const MAX_CONCEPTS = 7;
const MAX_PREREQUISITES = 2;
const MAX_MISCONCEPTIONS = 3;
const MAX_DECK_CONCEPTS = 20;
const MAX_CARDS = 30;
const MAX_RUBRIC_ITEMS = 8;

function truncateArray(value: unknown, max: number): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.slice(0, max);
}

function coerceGeneratedCard(
  value: unknown,
  limits: {
    concepts?: number;
    prerequisites?: number;
    misconceptions?: number;
    rubric?: number;
  }
): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const card = value as Record<string, unknown>;
  return {
    ...card,
    ...(limits.concepts !== undefined
      ? { concepts: truncateArray(card.concepts, limits.concepts) }
      : {}),
    ...(limits.prerequisites !== undefined
      ? {
          prerequisites: truncateArray(
            card.prerequisites,
            limits.prerequisites
          ),
        }
      : {}),
    ...(limits.misconceptions !== undefined
      ? {
          misconceptions: truncateArray(
            card.misconceptions,
            limits.misconceptions
          ),
        }
      : {}),
    ...(limits.rubric !== undefined
      ? { rubric: truncateArray(card.rubric, limits.rubric) }
      : {}),
  };
}

export function coerceStudyCardsGenerateJsonInput(json: unknown): unknown {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return json;
  }
  const input = json as Record<string, unknown>;
  return {
    ...input,
    deckConcepts: truncateArray(input.deckConcepts, MAX_DECK_CONCEPTS),
    recall: Array.isArray(input.recall)
      ? input.recall.slice(0, MAX_CARDS).map(card =>
          coerceGeneratedCard(card, {
            concepts: MAX_CONCEPTS,
            prerequisites: MAX_PREREQUISITES,
            misconceptions: MAX_MISCONCEPTIONS,
          })
        )
      : input.recall,
    synthesis: Array.isArray(input.synthesis)
      ? input.synthesis.slice(0, MAX_CARDS).map(card =>
          coerceGeneratedCard(card, {
            concepts: MAX_CONCEPTS,
            prerequisites: MAX_PREREQUISITES,
            rubric: MAX_RUBRIC_ITEMS,
          })
        )
      : input.synthesis,
  };
}

export type GeneratedCardGraphInput = {
  concepts?: string[];
  prerequisites?: string[];
  misconceptions?: string[];
};

export type SanitizedCardGraphFields = {
  concepts: string[];
  prerequisites: string[];
  misconceptions: string[];
};

export function normalizeConceptId(value: string) {
  const compact = value.trim().toLowerCase();
  if (!compact) {
    return '';
  }
  return compact
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeSlugList(values: string[] | undefined, max: number) {
  if (!values?.length) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const slug = normalizeConceptId(value);
    if (!slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    result.push(slug);
    if (result.length >= max) {
      break;
    }
  }
  return result;
}

export function buildDeckConceptVocabulary(
  output: StudyCardsGenerateOutput
): Set<string> {
  const vocabulary = new Set<string>();
  for (const slug of normalizeSlugList(output.deckConcepts, 20)) {
    vocabulary.add(slug);
  }
  for (const card of [...output.recall, ...output.synthesis]) {
    for (const slug of normalizeSlugList(card.concepts, MAX_CONCEPTS)) {
      vocabulary.add(slug);
    }
    for (const slug of normalizeSlugList(
      card.prerequisites,
      MAX_PREREQUISITES
    )) {
      vocabulary.add(slug);
    }
  }
  return vocabulary;
}

export function sanitizeGeneratedCardGraphFields(
  input: GeneratedCardGraphInput,
  vocabulary: Set<string>
): SanitizedCardGraphFields {
  const concepts = normalizeSlugList(input.concepts, MAX_CONCEPTS);
  const prerequisites = normalizeSlugList(
    input.prerequisites,
    MAX_PREREQUISITES
  ).filter(slug => vocabulary.has(slug) && !concepts.includes(slug));
  const misconceptions = normalizeSlugList(
    input.misconceptions,
    MAX_MISCONCEPTIONS
  );
  return { concepts, prerequisites, misconceptions };
}

export function toStudyCardGraphFields(
  sanitized: SanitizedCardGraphFields,
  existingTags?: string[]
) {
  const baseTags = (existingTags ?? []).filter(
    tag => !tag.trim().toLowerCase().startsWith('prereq:')
  );
  const prereqTags = sanitized.prerequisites.map(
    prerequisite => `prereq:${prerequisite}`
  );
  const tags =
    baseTags.length || prereqTags.length
      ? [...baseTags, ...prereqTags]
      : undefined;
  return {
    concepts: sanitized.concepts.length ? sanitized.concepts : undefined,
    tags,
    misconceptions: sanitized.misconceptions.length
      ? sanitized.misconceptions
      : undefined,
  };
}

export function sanitizeStudyCardsGenerateOutput(
  output: StudyCardsGenerateOutput
): StudyCardsGenerateOutput {
  const vocabulary = buildDeckConceptVocabulary(output);
  return {
    ...output,
    deckConcepts: normalizeSlugList(output.deckConcepts, 20),
    recall: output.recall.map(card => {
      const graph = sanitizeGeneratedCardGraphFields(card, vocabulary);
      return {
        ...card,
        concepts: graph.concepts,
        prerequisites: graph.prerequisites.length
          ? graph.prerequisites
          : undefined,
        misconceptions: graph.misconceptions.length
          ? graph.misconceptions
          : undefined,
      };
    }),
    synthesis: output.synthesis.map(card => {
      const graph = sanitizeGeneratedCardGraphFields(card, vocabulary);
      return {
        ...card,
        concepts: graph.concepts,
        prerequisites: graph.prerequisites.length
          ? graph.prerequisites
          : undefined,
      };
    }),
  };
}
