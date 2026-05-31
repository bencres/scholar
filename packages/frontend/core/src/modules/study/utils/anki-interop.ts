import JSZip from 'jszip';
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

export interface StudyApkgExportReport {
  exportedCards: number;
  mediaReferences: number;
  warnings: string[];
}

export interface StudyApkgImportReport {
  importedCards: number;
  skippedCards: number;
  skippedMedia: number;
  warnings: string[];
}

export interface StudyApkgExportResult {
  fileName: string;
  bytes: Uint8Array;
  report: StudyApkgExportReport;
}

export interface StudyApkgImportResult {
  deck: StudyDeck;
  scheduling: StudyCardScheduling[];
  report: StudyApkgImportReport;
}

const DEFAULT_MAPPING: StudyCsvFieldMapping = {
  question: 'question',
  answer: 'answer',
  tags: 'tags',
  noteTypeId: 'noteTypeId',
};

const STUDY_APKG_FORMAT = 'affine-study-apkg';
const STUDY_APKG_VERSION = 1;

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
    supported: true,
    reason:
      'Import/export supports AFFiNE-generated .apkg bundles with note fields, templates, scheduling metadata, and media mapping reports.',
    nextStep:
      'Add collection.anki2/collection.anki21 sqlite decoding to support third-party Anki package ingestion and true binary media round-trip.',
  };
}

type StudyApkgManifest = {
  format: typeof STUDY_APKG_FORMAT;
  version: number;
  exportedAt: number;
};

type StudyApkgPayloadCard = Pick<
  StudyCardContent,
  | 'type'
  | 'question'
  | 'answer'
  | 'concepts'
  | 'noteTypeId'
  | 'templateId'
  | 'noteFields'
  | 'clozeOrdinal'
  | 'imageOcclusion'
  | 'misconceptions'
  | 'rubric'
  | 'tags'
  | 'suspended'
>;

export type StudyApkgPayload = {
  manifest: StudyApkgManifest;
  deck: {
    name: string;
    metadata?: StudyDeck['metadata'];
  };
  cards: StudyApkgPayloadCard[];
  mediaMap: Record<string, string>;
};

export async function exportDeckToApkg(
  deck: StudyDeck
): Promise<StudyApkgExportResult> {
  const exportedAt = Date.now();
  const mediaMap = buildMediaMap(deck.cards);
  const payload: StudyApkgPayload = {
    manifest: {
      format: STUDY_APKG_FORMAT,
      version: STUDY_APKG_VERSION,
      exportedAt,
    },
    deck: {
      name: deck.name,
      metadata: deck.metadata,
    },
    cards: deck.cards.map(card => ({
      type: card.type,
      question: card.question,
      answer: card.answer,
      concepts: card.concepts,
      noteTypeId: card.noteTypeId,
      templateId: card.templateId,
      noteFields: card.noteFields,
      clozeOrdinal: card.clozeOrdinal,
      imageOcclusion: card.imageOcclusion,
      misconceptions: card.misconceptions,
      rubric: card.rubric,
      tags: card.tags,
      suspended: card.suspended,
    })),
    mediaMap,
  };
  const zip = new JSZip();
  const manifest: StudyApkgManifest = {
    format: STUDY_APKG_FORMAT,
    version: STUDY_APKG_VERSION,
    exportedAt,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('collection.study.json', JSON.stringify(payload, null, 2));
  zip.file('media', JSON.stringify(mediaMap, null, 2));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return {
    fileName: `${slugifyDeckName(deck.name)}.apkg`,
    bytes,
    report: {
      exportedCards: deck.cards.length,
      mediaReferences: Object.keys(mediaMap).length,
      warnings: [
        'This package is AFFiNE-compatible .apkg and does not yet encode Anki sqlite collections.',
      ],
    },
  };
}

export async function importDeckFromApkg(input: {
  fileName: string;
  bytes: Uint8Array;
  workspaceId: string;
  now?: number;
}): Promise<StudyApkgImportResult> {
  const now = input.now ?? Date.now();
  const zip = await JSZip.loadAsync(input.bytes);
  const payloadFile = zip.file('collection.study.json');
  if (!payloadFile) {
    if (zip.file('collection.anki2') || zip.file('collection.anki21')) {
      throw new Error(
        'Unsupported .apkg source: sqlite-backed collection import is not implemented yet. Export from AFFiNE or use CSV import for now.'
      );
    }
    throw new Error(
      `Unsupported .apkg source: expected AFFiNE payload in collection.study.json (${input.fileName}).`
    );
  }
  const payload = parseStudyApkgPayload(await payloadFile.async('text'));
  const deckId = nanoid();
  const warnings: string[] = [];
  const cards: StudyCardContent[] = [];
  let skippedCards = 0;
  for (const [index, card] of payload.cards.entries()) {
    const question = card.question.trim();
    if (!question) {
      skippedCards += 1;
      warnings.push(`Card ${index + 1} skipped: empty question.`);
      continue;
    }
    cards.push({
      id: nanoid(),
      deckId,
      type: card.type,
      question,
      answer: card.answer?.trim() || undefined,
      concepts: sanitizeArray(card.concepts),
      noteTypeId: card.noteTypeId?.trim() || undefined,
      templateId: card.templateId?.trim() || undefined,
      noteFields: sanitizeRecord(card.noteFields),
      clozeOrdinal: sanitizePositiveInt(card.clozeOrdinal),
      imageOcclusion: sanitizeImageOcclusion(card.imageOcclusion),
      misconceptions: sanitizeArray(card.misconceptions),
      rubric: sanitizeArray(card.rubric),
      tags: sanitizeArray(card.tags),
      provenance: {
        workspaceId: input.workspaceId,
        docId: 'apkg-import',
      },
      createdAt: now,
      updatedAt: now,
      suspended: card.suspended === true,
    });
  }
  const scheduling = cards.map(card =>
    createInitialScheduling(card.id, deckId, now)
  );
  const mediaEntries = Object.keys(payload.mediaMap).length;
  if (mediaEntries > 0) {
    warnings.push(
      `${mediaEntries} media references were imported as metadata only; binary media extraction is not implemented.`
    );
  }
  return {
    deck: {
      id: deckId,
      name: payload.deck.name.trim() || 'Imported APKG Deck',
      metadata: payload.deck.metadata,
      cards,
      createdAt: now,
      updatedAt: now,
    },
    scheduling,
    report: {
      importedCards: cards.length,
      skippedCards,
      skippedMedia: mediaEntries,
      warnings,
    },
  };
}

export async function decodeApkgPayload(
  bytes: Uint8Array
): Promise<StudyApkgPayload> {
  const zip = await JSZip.loadAsync(bytes);
  const payloadFile = zip.file('collection.study.json');
  if (!payloadFile) {
    throw new Error('Missing collection.study.json');
  }
  return parseStudyApkgPayload(await payloadFile.async('text'));
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

function parseStudyApkgPayload(raw: string): StudyApkgPayload {
  const parsed = JSON.parse(raw) as StudyApkgPayload;
  if (
    parsed.manifest?.format !== STUDY_APKG_FORMAT ||
    parsed.manifest?.version !== STUDY_APKG_VERSION
  ) {
    throw new Error(
      `Unsupported AFFiNE APKG payload version: ${parsed.manifest?.version ?? 'unknown'}`
    );
  }
  if (!Array.isArray(parsed.cards)) {
    throw new Error('Invalid AFFiNE APKG payload: cards missing.');
  }
  return parsed;
}

function buildMediaMap(cards: StudyCardContent[]) {
  const media = new Map<string, string>();
  for (const card of cards) {
    const imageAssetId = card.imageOcclusion?.imageAssetId?.trim();
    if (imageAssetId && !media.has(imageAssetId)) {
      media.set(String(media.size), imageAssetId);
    }
  }
  return Object.fromEntries(media);
}

function sanitizeArray(values?: string[]) {
  if (!values?.length) {
    return undefined;
  }
  const normalized = values.map(value => value.trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
}

function sanitizeRecord(values?: Record<string, string>) {
  if (!values) {
    return undefined;
  }
  const entries = Object.entries(values)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => key && value);
  if (!entries.length) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function sanitizePositiveInt(value?: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.floor(value as number);
  return rounded > 0 ? rounded : undefined;
}

function sanitizeImageOcclusion(value?: StudyCardContent['imageOcclusion']) {
  if (!value) {
    return undefined;
  }
  const imageAssetId = value.imageAssetId?.trim() || '';
  const occlusionId = value.occlusionId?.trim() || '';
  if (!imageAssetId || !occlusionId) {
    return undefined;
  }
  return {
    imageAssetId,
    occlusionId,
    prompt: value.prompt?.trim() || undefined,
    answer: value.answer?.trim() || undefined,
  };
}

function slugifyDeckName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'study-deck';
}
