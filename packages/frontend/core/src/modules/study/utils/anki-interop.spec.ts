import { readFileSync } from 'node:fs';

import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import type { StudyCardContent } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import {
  createApkgCompatibilityReport,
  decodeApkgPayload,
  exportDeckToApkg,
  exportDeckToCsv,
  importDeckFromApkg,
  importDeckFromCsv,
} from './anki-interop';

describe('study anki interop', () => {
  it('roundtrips deck cards through csv mapping', () => {
    const now = 1_710_000_000_000;
    const cards: StudyCardContent[] = [
      {
        id: 'card-1',
        type: 'recall',
        question: 'What is ATP?',
        answer: 'Energy currency',
        tags: ['bio', 'metabolism'],
        provenance: { workspaceId: 'ws-1', docId: 'doc-1' },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      },
    ];
    const deck: StudyDeck = {
      id: 'deck-1',
      name: 'Biology',
      cardIds: ['card-1'],
      createdAt: now,
      updatedAt: now,
    };
    const csv = exportDeckToCsv(deck, cards);
    const imported = importDeckFromCsv({
      csv,
      deckName: 'Imported Biology',
      workspaceId: 'ws-1',
      now,
    });
    expect(imported.report.importedCards).toBe(1);
    expect(imported.cards[0]?.question).toBe('What is ATP?');
    expect(imported.deck.cardIds).toHaveLength(1);
    expect(imported.scheduling).toHaveLength(1);
  });

  it('exports and imports affine apkg bundles', async () => {
    const now = 1_710_000_000_000;
    const cards: StudyCardContent[] = [
      {
        id: 'card-1',
        type: 'recall',
        question: 'What is ATP?',
        answer: 'Energy currency',
        noteTypeId: 'basic',
        templateId: 'basic-forward',
        noteFields: {
          Front: 'What is ATP?',
          Back: 'Energy currency',
        },
        imageOcclusion: {
          imageAssetId: 'asset-1',
          occlusionId: 'mask-1',
          prompt: 'Label this',
        },
        tags: ['bio'],
        provenance: { workspaceId: 'ws-1', docId: 'manual' },
        createdAt: now,
        updatedAt: now,
        suspended: false,
      },
    ];
    const deck: StudyDeck = {
      id: 'deck-apkg',
      name: 'APKG Biology',
      cardIds: ['card-1'],
      createdAt: now,
      updatedAt: now,
    };
    const exported = await exportDeckToApkg(deck, cards);
    expect(exported.fileName).toBe('apkg-biology.apkg');
    const payload = await decodeApkgPayload(exported.bytes);
    const goldenPath = new URL(
      './fixtures/study-apkg.export.golden.json',
      import.meta.url
    );
    const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as {
      manifest: { format: string; version: number };
      deck: { name: string };
      cards: Array<{
        type: string;
        question: string;
        noteTypeId: string;
        templateId: string;
      }>;
      mediaMap: Record<string, string>;
    };
    expect(payload.manifest.format).toBe(golden.manifest.format);
    expect(payload.manifest.version).toBe(golden.manifest.version);
    expect(payload.deck.name).toBe(deck.name);
    expect(payload.cards).toHaveLength(1);
    expect(payload.cards[0]?.noteTypeId).toBe(golden.cards[0]?.noteTypeId);
    expect(payload.cards[0]?.templateId).toBe(golden.cards[0]?.templateId);
    expect(payload.mediaMap).toEqual(golden.mediaMap);
    const imported = await importDeckFromApkg({
      fileName: exported.fileName,
      bytes: exported.bytes,
      workspaceId: 'ws-1',
      now,
    });
    expect(imported.cards).toHaveLength(1);
    expect(imported.cards[0]?.question).toBe('What is ATP?');
    expect(imported.report.skippedMedia).toBe(1);
  });

  it('imports apkg fixture payload', async () => {
    const fixturePath = new URL(
      './fixtures/study-apkg.fixture.json',
      import.meta.url
    );
    const fixtureJson = readFileSync(fixturePath, 'utf8');
    const zip = new JSZip();
    zip.file(
      'manifest.json',
      JSON.stringify({
        format: 'affine-study-apkg',
        version: 1,
        exportedAt: 1_710_000_000_000,
      })
    );
    zip.file('collection.study.json', fixtureJson);
    zip.file('media', JSON.stringify({ 0: 'asset-1' }));
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const imported = await importDeckFromApkg({
      fileName: 'fixture.apkg',
      bytes,
      workspaceId: 'ws-fixture',
      now: 1_710_000_000_000,
    });
    expect(imported.cards).toHaveLength(2);
    expect(imported.report.importedCards).toBe(2);
  });

  it('flags sqlite-based anki packages as unsupported', async () => {
    const zip = new JSZip();
    zip.file('collection.anki21', 'sqlite-bytes');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    await expect(
      importDeckFromApkg({
        fileName: 'anki.apkg',
        bytes,
        workspaceId: 'ws-1',
      })
    ).rejects.toThrow(/sqlite-backed collection import/);
  });

  it('reports apkg compatibility', () => {
    expect(createApkgCompatibilityReport().supported).toBe(true);
  });
});
