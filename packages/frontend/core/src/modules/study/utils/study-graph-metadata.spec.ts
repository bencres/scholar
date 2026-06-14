import { describe, expect, it } from 'vitest';

import { StudyCardsGenerateOutputSchema } from '../schema/generate-output';
import { buildStudyLearningGraphSnapshot } from './learning-graph';
import {
  buildDeckConceptVocabulary,
  coerceStudyCardsGenerateJsonInput,
  normalizeConceptId,
  sanitizeGeneratedCardGraphFields,
  sanitizeStudyCardsGenerateOutput,
  toStudyCardGraphFields,
} from './study-graph-metadata';

describe('study graph metadata', () => {
  it('normalizes concept slugs', () => {
    expect(normalizeConceptId('Cell Respiration')).toBe('cell-respiration');
    expect(normalizeConceptId('  ATP Cycle  ')).toBe('atp-cycle');
  });

  it('filters prerequisites outside deck vocabulary', () => {
    const vocabulary = new Set(['mitochondria', 'atp-cycle']);
    const result = sanitizeGeneratedCardGraphFields(
      {
        concepts: ['ATP Cycle'],
        prerequisites: ['mitochondria', 'unknown-topic'],
        misconceptions: ['plants eat soil'],
      },
      vocabulary
    );
    expect(result.concepts).toEqual(['atp-cycle']);
    expect(result.prerequisites).toEqual(['mitochondria']);
    expect(result.misconceptions).toEqual(['plants-eat-soil']);
  });

  it('maps sanitized fields to study card graph storage', () => {
    const fields = toStudyCardGraphFields(
      {
        concepts: ['atp-cycle'],
        prerequisites: ['mitochondria'],
        misconceptions: [],
      },
      ['custom:tag']
    );
    expect(fields.concepts).toEqual(['atp-cycle']);
    expect(fields.tags).toEqual(['custom:tag', 'prereq:mitochondria']);
  });

  it('builds vocabulary from deck and card slugs', () => {
    const vocabulary = buildDeckConceptVocabulary({
      deckName: 'Bio',
      deckConcepts: ['Cell Respiration'],
      recall: [
        {
          question: 'What is ATP?',
          answer: 'Energy currency of the cell',
          concepts: ['ATP Cycle'],
          prerequisites: ['mitochondria'],
        },
      ],
      synthesis: [
        {
          question: 'Compare ATP and NADH roles in metabolism.',
          rubric: [
            'ATP carries phosphate-bond energy',
            'NADH carries electrons',
          ],
          concepts: ['atp-cycle'],
        },
      ],
    });
    expect(vocabulary.has('cell-respiration')).toBe(true);
    expect(vocabulary.has('atp-cycle')).toBe(true);
    expect(vocabulary.has('mitochondria')).toBe(true);
  });

  it('coerces overlong concept lists before schema validation', () => {
    const parsed = StudyCardsGenerateOutputSchema.parse(
      coerceStudyCardsGenerateJsonInput({
        deckName: 'Test',
        recall: [
          {
            question: 'What is ATP?',
            answer: 'Energy currency of the cell',
            concepts: ['atp', 'nad', 'glycolysis', 'krebs'],
          },
        ],
        synthesis: [
          {
            question: 'Compare ATP and NADH roles in metabolism.',
            rubric: [
              'ATP carries phosphate-bond energy',
              'NADH carries electrons',
            ],
            concepts: ['atp', 'nad', 'glycolysis', 'krebs'],
          },
        ],
      })
    );
    expect(parsed.recall[0]?.concepts).toHaveLength(3);
    expect(parsed.synthesis[0]?.concepts).toHaveLength(3);
  });

  it('rejects generate output without concepts', () => {
    expect(() =>
      StudyCardsGenerateOutputSchema.parse({
        deckName: 'Test',
        recall: [
          {
            question: 'What is ATP?',
            answer: 'Energy currency of the cell',
          },
        ],
        synthesis: [
          {
            question: 'Compare ATP and NADH roles in metabolism.',
            rubric: [
              'ATP carries phosphate-bond energy',
              'NADH carries electrons',
            ],
            concepts: ['atp-cycle'],
          },
        ],
      })
    ).toThrow();
  });

  it('sanitized generate output produces a mapped learning graph', () => {
    const now = 1_720_000_000_000;
    const output = sanitizeStudyCardsGenerateOutput(
      StudyCardsGenerateOutputSchema.parse({
        deckName: 'Connection pooling',
        deckConcepts: ['connection-pooling', 'db-limits'],
        recall: [
          {
            question: 'Why use a connection pool?',
            answer: 'Reuse TCP connections to reduce handshake overhead.',
            concepts: ['connection-pooling'],
            prerequisites: ['db-limits'],
            misconceptions: ['pool-size-fixes-db-limits'],
          },
        ],
        synthesis: [
          {
            question:
              'You scaled to 50 instances and the database rejects connections. What failed?',
            rubric: [
              'Total connections = instances × pool size',
              'Fleet-level cap needs proxy or smaller pools',
            ],
            concepts: ['db-limits', 'connection-pooling'],
          },
        ],
      })
    );
    const cards = [...output.recall, ...output.synthesis].map((card, index) => {
      const graphFields = toStudyCardGraphFields({
        concepts: card.concepts,
        prerequisites: card.prerequisites ?? [],
        misconceptions:
          'misconceptions' in card ? (card.misconceptions ?? []) : [],
      });
      return {
        id: `card-${index}`,
        type: (index === 0 ? 'recall' : 'synthesis') as 'recall' | 'synthesis',
        question: card.question,
        answer: 'answer' in card ? card.answer : undefined,
        concepts: graphFields.concepts,
        tags: graphFields.tags,
        misconceptions: graphFields.misconceptions,
        provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      };
    });
    const graph = buildStudyLearningGraphSnapshot({
      decks: [
        {
          id: 'deck-1',
          name: output.deckName,
          cardIds: cards.map(card => card.id),
          createdAt: now,
          updatedAt: now,
        },
      ],
      cards,
      scheduling: [],
      reviewLogs: [],
      now,
    });
    expect(graph.mappedCards).toBe(2);
    expect(graph.totalCards).toBe(2);
    expect(graph.concepts.some(item => item.id === 'connection-pooling')).toBe(
      true
    );
    expect(
      graph.edges.some(
        edge =>
          edge.type === 'prerequisite' &&
          edge.from === 'db-limits' &&
          edge.to === 'connection-pooling'
      )
    ).toBe(true);
  });
});
