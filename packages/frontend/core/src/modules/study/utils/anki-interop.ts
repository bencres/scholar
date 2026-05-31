import { nanoid } from 'nanoid';

import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';
import { createInitialScheduling } from './scheduling';

export interface StudyCsvFieldMapping {
  question: string;
  answer: string;
  tags?: string;
  noteTypeId?: string;
}

export interface StudyImportReport {
  importedCards: number;
  skippedRows: number;
  warnings: string[];
}

export interface StudyApkgCompatibilityReport {
  supported: boolean;
  reason: string;
  nextStep: string;
}

const DEFAULT_MAPPING: StudyCsvFieldMapping = {
  question: 'question',
  answer: 'answer',
  tags: 'tags',
  noteTypeId: 'noteTypeId',
};

export function exportDeckToCsv(
  deck: StudyDeck,
  mapping: StudyCsvFieldMapping = DEFAULT_MAPPING
) {
  const headers = [
    mapping.question,
    mapping.answer,
    mapping.tags,
    mapping.noteTypeId,
  ];
  const rows = deck.cards.map(card =>
    [
      card.question,
      card.answer ?? '',
      (card.tags ?? []).join(' '),
      card.noteTypeId ?? '',
    ].map(escapeCsv)
  );
  return [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

export function importDeckFromCsv(input: {
  csv: string;
  deckName: string;
  workspaceId: string;
  mapping?: StudyCsvFieldMapping;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const mapping = input.mapping ?? DEFAULT_MAPPING;
  const rows = parseCsvRows(input.csv);
  if (!rows.length) {
    throw new Error('CSV is empty');
  }
  const headers = rows[0] ?? [];
  const headerIndex = new Map(
    headers.map((header, index) => [header.trim(), index])
  );
  const deckId = nanoid();
  const cards: StudyCardContent[] = [];
  let skippedRows = 0;
  const warnings: string[] = [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const question = readMappedValue(
      row,
      headerIndex,
      mapping.question
    )?.trim();
    if (!question) {
      skippedRows += 1;
      warnings.push(`Row ${index + 1} skipped: missing question.`);
      continue;
    }
    const answer = readMappedValue(row, headerIndex, mapping.answer)?.trim();
    const tags = readMappedValue(row, headerIndex, mapping.tags ?? '');
    const noteTypeId = readMappedValue(
      row,
      headerIndex,
      mapping.noteTypeId ?? ''
    );
    cards.push({
      id: nanoid(),
      deckId,
      type: 'recall',
      question,
      answer: answer || undefined,
      tags: tags ? tags.split(/\s+/).filter(Boolean) : undefined,
      noteTypeId: noteTypeId || undefined,
      provenance: {
        workspaceId: input.workspaceId,
        docId: 'csv-import',
      },
      createdAt: now,
      updatedAt: now,
      suspended: false,
    });
  }
  const scheduling: StudyCardScheduling[] = cards.map(card =>
    createInitialScheduling(card.id, deckId, now)
  );
  return {
    deck: {
      id: deckId,
      name: input.deckName.trim() || 'Imported Deck',
      cards,
      createdAt: now,
      updatedAt: now,
    } satisfies StudyDeck,
    scheduling,
    report: {
      importedCards: cards.length,
      skippedRows,
      warnings,
    } satisfies StudyImportReport,
  };
}

export function createApkgCompatibilityReport(): StudyApkgCompatibilityReport {
  return {
    supported: false,
    reason:
      '.apkg support requires sqlite and media bundle decoding not yet implemented in this frontend study module.',
    nextStep:
      'Add a dedicated parser bridge for collection.anki2 + media map, then map notes/cards into StudyDeck and StudyCardContent.',
  };
}

function readMappedValue(
  row: string[],
  headerIndex: Map<string, number>,
  headerName: string
) {
  if (!headerName) return undefined;
  const index = headerIndex.get(headerName);
  if (index === undefined) return undefined;
  return row[index];
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index] ?? '';
    const next = csv[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }
    if (char === '\n' && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }
    if (char !== '\r') {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}
