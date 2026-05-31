import { describe, expect, it } from 'vitest';

import type { StudyDeck } from '../entities/deck';
import {
  createApkgCompatibilityReport,
  exportDeckToCsv,
  importDeckFromCsv,
} from './anki-interop';

describe('study anki interop', () => {
  it('roundtrips deck cards through csv mapping', () => {
    const now = 1_710_000_000_000;
    const deck: StudyDeck = {
      id: 'deck-1',
      name: 'Biology',
      cards: [
        {
          id: 'card-1',
          deckId: 'deck-1',
          type: 'recall',
          question: 'What is ATP?',
          answer: 'Energy currency',
          tags: ['bio', 'metabolism'],
          provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
          createdAt: now,
          updatedAt: now,
          suspended: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    const csv = exportDeckToCsv(deck);
    const imported = importDeckFromCsv({
      csv,
      deckName: 'Imported Biology',
      workspaceId: 'ws-1',
      now,
    });
    expect(imported.report.importedCards).toBe(1);
    expect(imported.deck.cards[0]?.question).toBe('What is ATP?');
    expect(imported.scheduling).toHaveLength(1);
  });

  it('returns compatibility blocker for apkg', () => {
    const report = createApkgCompatibilityReport();
    expect(report.supported).toBe(false);
    expect(report.reason).toContain('sqlite');
  });
});
