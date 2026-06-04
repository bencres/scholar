import type { StudyCardContent, StudyCardScheduling } from '../entities/card';
import type { StudyDeck } from '../entities/deck';

export interface StudyBrowserSearchInput {
  deck: StudyDeck;
  card: StudyCardContent;
  scheduling?: StudyCardScheduling;
  /** True when the card is not in any deck membership list. */
  unassigned?: boolean;
  now?: number;
}

interface ParsedStudyBrowserQuery {
  deckNames: string[];
  tags: string[];
  states: string[];
  due: Array<'overdue' | 'today' | 'future'>;
  text: string[];
}

const TOKEN_PATTERN = /"([^"]+)"|(\S+)/g;

export function matchStudyBrowserQuery(
  query: string,
  input: StudyBrowserSearchInput
) {
  const parsed = parseStudyBrowserQuery(query);
  const now = input.now ?? Date.now();
  const searchableText = buildSearchableText(input.card).toLowerCase();
  const deckName = input.deck.name.toLowerCase();
  const tags = new Set((input.card.tags ?? []).map(tag => tag.toLowerCase()));
  const state = input.scheduling?.state?.toLowerCase();

  if (parsed.deckNames.length) {
    const wantsUnassigned = parsed.deckNames.includes('none');
    const namedFilters = parsed.deckNames.filter(name => name !== 'none');
    if (wantsUnassigned && !input.unassigned) return false;
    if (namedFilters.length) {
      const deckMatched = namedFilters.some(name => deckName.includes(name));
      if (!deckMatched) return false;
    }
  }

  if (parsed.tags.length) {
    const tagsMatched = parsed.tags.every(tag => tags.has(tag));
    if (!tagsMatched) return false;
  }

  if (parsed.states.length && (!state || !parsed.states.includes(state))) {
    return false;
  }

  if (parsed.due.length) {
    const dueTag = deriveDueTag(input.scheduling, now);
    if (!dueTag || !parsed.due.includes(dueTag)) return false;
  }

  return parsed.text.every(term => searchableText.includes(term));
}

function parseStudyBrowserQuery(query: string): ParsedStudyBrowserQuery {
  const parsed: ParsedStudyBrowserQuery = {
    deckNames: [],
    tags: [],
    states: [],
    due: [],
    text: [],
  };
  for (const token of tokenize(query)) {
    const normalized = token.toLowerCase();
    const prefix = normalized.split(':', 1)[0];
    const value = token
      .slice(prefix.length + 1)
      .trim()
      .toLowerCase();
    if (!value || !normalized.includes(':')) {
      parsed.text.push(normalized);
      continue;
    }
    if (prefix === 'deck') {
      parsed.deckNames.push(value);
      continue;
    }
    if (prefix === 'tag') {
      parsed.tags.push(value);
      continue;
    }
    if (prefix === 'state') {
      parsed.states.push(value);
      continue;
    }
    if (
      prefix === 'due' &&
      (value === 'overdue' || value === 'today' || value === 'future')
    ) {
      parsed.due.push(value);
      continue;
    }
    parsed.text.push(normalized);
  }
  return parsed;
}

function tokenize(input: string) {
  const values: string[] = [];
  for (const match of input.matchAll(TOKEN_PATTERN)) {
    values.push((match[1] ?? match[2] ?? '').trim());
  }
  return values.filter(Boolean);
}

function buildSearchableText(card: StudyCardContent) {
  return [
    card.question,
    card.answer,
    ...(card.misconceptions ?? []),
    ...(card.rubric ?? []),
    ...(card.tags ?? []),
    ...(card.noteFields ? Object.values(card.noteFields) : []),
  ]
    .filter(Boolean)
    .join('\n');
}

function deriveDueTag(
  scheduling: StudyCardScheduling | undefined,
  now: number
): 'overdue' | 'today' | 'future' | undefined {
  if (!scheduling) {
    return undefined;
  }
  if (scheduling.due < now) {
    return 'overdue';
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (scheduling.due <= end.getTime()) {
    return 'today';
  }
  return 'future';
}
