import { Button, Input } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { getDeckCards } from '@affine/core/modules/study/utils/study-storage';
import {
  type DeckSort,
  type DeckTableRow,
  StudyDeckTable,
} from '@affine/core/modules/study/views/study-deck-table';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import { StudySubnav } from '@affine/core/modules/study/views/study-subnav';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo, useState } from 'react';

type DueFilter = 'all' | 'has-due' | 'no-due';
type SourceFilter = 'all' | 'has-source' | 'no-source';

function sortDecks(rows: DeckTableRow[], sort: DeckSort) {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sort === 'name-asc' || sort === 'name-desc') {
      const cmp = a.deck.name.localeCompare(b.deck.name);
      return sort === 'name-asc' ? cmp : -cmp;
    }
    if (sort === 'created-asc' || sort === 'created-desc') {
      const cmp = a.deck.createdAt - b.deck.createdAt;
      return sort === 'created-asc' ? cmp : -cmp;
    }
    if (sort === 'updated-asc' || sort === 'updated-desc') {
      const cmp = a.deck.updatedAt - b.deck.updatedAt;
      return sort === 'updated-asc' ? cmp : -cmp;
    }
    if (sort === 'card-count-asc' || sort === 'card-count-desc') {
      const cmp = a.activeCardCount - b.activeCardCount;
      return sort === 'card-count-asc' ? cmp : -cmp;
    }
    if (sort === 'due-asc' || sort === 'due-desc') {
      const cmp = a.dueCount - b.dueCount;
      return sort === 'due-asc' ? cmp : -cmp;
    }
    return a.deck.name.localeCompare(b.deck.name);
  });
  return sorted;
}

export const StudyDecksPage = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const decks = useLiveData(studyService.decks$);
  const cards = useLiveData(studyService.cards$);
  const dueByDeck = useLiveData(studyService.dueCountByDeck$);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckTags, setDeckTags] = useState('');
  const [search, setSearch] = useState('');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sort, setSort] = useState<DeckSort>('name-asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canCreateDeck = deckName.trim().length > 0;

  const deckRows = useMemo(() => {
    return decks.map(deck => {
      const deckCards = getDeckCards(deck, cards);
      return {
        deck,
        activeCardCount: deckCards.filter(card => !card.suspended).length,
        totalCardCount: deckCards.length,
        dueCount: dueByDeck.get(deck.id) ?? 0,
      };
    });
  }, [cards, decks, dueByDeck]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let filtered = deckRows;
    if (query) {
      filtered = filtered.filter(({ deck }) => {
        const haystack = [
          deck.name,
          deck.metadata?.description ?? '',
          ...(deck.metadata?.tags ?? []),
          deck.sourceDocId ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    if (dueFilter === 'has-due') {
      filtered = filtered.filter(row => row.dueCount > 0);
    } else if (dueFilter === 'no-due') {
      filtered = filtered.filter(row => row.dueCount === 0);
    }
    if (sourceFilter === 'has-source') {
      filtered = filtered.filter(
        ({ deck }) => !!(deck.sourceDocId ?? deck.metadata?.sourcePage?.docId)
      );
    } else if (sourceFilter === 'no-source') {
      filtered = filtered.filter(
        ({ deck }) => !(deck.sourceDocId ?? deck.metadata?.sourcePage?.docId)
      );
    }
    return sortDecks(filtered, sort);
  }, [deckRows, dueFilter, search, sort, sourceFilter]);

  const handleCreateDeck = async () => {
    if (!canCreateDeck) return;
    const deck = await studyService.createDeck({
      name: deckName,
      metadata: {
        description: deckDescription,
        tags: deckTags
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      },
    });
    setDeckName('');
    setDeckDescription('');
    setDeckTags('');
    workbench.open(`/study/decks/${deck.id}`, { at: 'active' });
  };

  const handleBrowse = useCallback(
    (deck: StudyDeck) => {
      workbench.open(`/study/decks/${deck.id}`, { at: 'active' });
    },
    [workbench]
  );

  const handleReview = useCallback(
    (deck: StudyDeck) => {
      workbench.open(`/study/review/${deck.id}`, { at: 'active' });
    },
    [workbench]
  );

  const handleOpenSource = useCallback(
    (deck: StudyDeck) => {
      const docId = deck.sourceDocId ?? deck.metadata?.sourcePage?.docId;
      if (!docId) return;
      workbench.openDoc({ docId, mode: 'page' });
    },
    [workbench]
  );

  if (!studyService.enabled) {
    return (
      <StudyPageBody>
        <div className={styles.emptyState}>
          {t['com.affine.study.disabled']()}
        </div>
      </StudyPageBody>
    );
  }

  return (
    <>
      <ViewTitle title={t['com.affine.study.decks']()} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader title={t['com.affine.study.decks']()} />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody>
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t['com.affine.study.create-deck']()}
          </div>
          <div className={styles.formGrid}>
            <Input
              value={deckName}
              onChange={event => setDeckName(event.target.value)}
              placeholder={t['com.affine.study.deck-name.placeholder']()}
            />
            <Input
              value={deckDescription}
              onChange={event => setDeckDescription(event.target.value)}
              placeholder={t['com.affine.study.deck-description.placeholder']()}
            />
            <Input
              value={deckTags}
              onChange={event => setDeckTags(event.target.value)}
              placeholder={t['com.affine.study.deck-tags.placeholder']()}
            />
          </div>
          <div className={styles.actionsRow}>
            <Button
              variant="primary"
              disabled={!canCreateDeck}
              onClick={() => {
                handleCreateDeck().catch(error => {
                  console.error('[study.decks] create deck failed', error);
                });
              }}
            >
              {t['com.affine.study.create-deck']()}
            </Button>
          </div>
        </div>
        <div className={styles.libraryToolbar}>
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t[
              'com.affine.study.deck-library.search.placeholder'
            ]()}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>
        <div className={styles.cardTableFilterRow}>
          <select
            className={styles.cardTableFilterSelect}
            value={dueFilter}
            onChange={event => setDueFilter(event.target.value as DueFilter)}
            aria-label={t['com.affine.study.deck-library.filter.due.label']()}
          >
            <option value="all">
              {t['com.affine.study.deck-library.filter.due.all']()}
            </option>
            <option value="has-due">
              {t['com.affine.study.deck-library.filter.due.has-due']()}
            </option>
            <option value="no-due">
              {t['com.affine.study.deck-library.filter.due.none']()}
            </option>
          </select>
          <select
            className={styles.cardTableFilterSelect}
            value={sourceFilter}
            onChange={event =>
              setSourceFilter(event.target.value as SourceFilter)
            }
            aria-label={t[
              'com.affine.study.deck-library.filter.source.label'
            ]()}
          >
            <option value="all">
              {t['com.affine.study.deck-library.filter.source.all']()}
            </option>
            <option value="has-source">
              {t['com.affine.study.deck-library.filter.source.has-source']()}
            </option>
            <option value="no-source">
              {t['com.affine.study.deck-library.filter.source.none']()}
            </option>
          </select>
        </div>
        {decks.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.empty-decks']()}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.deck-library.empty']()}
          </div>
        ) : (
          <StudyDeckTable
            rows={filteredRows}
            sort={sort}
            onSortChange={setSort}
            expandedId={expandedId}
            onExpandedChange={setExpandedId}
            onBrowse={handleBrowse}
            onReview={handleReview}
            onOpenSource={handleOpenSource}
          />
        )}
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyDecksPage />;
