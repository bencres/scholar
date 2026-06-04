import { Button, Input } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import { getDeckCards } from '@affine/core/modules/study/utils/study-storage';
import { StudyDeckListItem } from '@affine/core/modules/study/views/study-deck-list-item';
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
import { useMemo, useState } from 'react';

type DeckSort = 'name' | 'created' | 'card-count' | 'due-count';

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
  const [sort, setSort] = useState<DeckSort>('name');

  const canCreateDeck = deckName.trim().length > 0;

  const sortedDecks = useMemo(() => {
    const query = search.trim().toLowerCase();
    let filtered = decks;
    if (query) {
      filtered = decks.filter(deck => {
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
    return [...filtered].sort((a, b) => {
      if (sort === 'created') {
        return b.createdAt - a.createdAt;
      }
      if (sort === 'card-count') {
        return getDeckCards(b, cards).length - getDeckCards(a, cards).length;
      }
      if (sort === 'due-count') {
        return (dueByDeck.get(b.id) ?? 0) - (dueByDeck.get(a.id) ?? 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [cards, decks, dueByDeck, search, sort]);

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
      <ViewIcon icon="today" />
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
          <select
            value={sort}
            onChange={event => setSort(event.target.value as DeckSort)}
            aria-label={t['com.affine.study.card-library.sort.label']()}
          >
            <option value="name">
              {t['com.affine.study.deck-library.sort.name']()}
            </option>
            <option value="created">
              {t['com.affine.study.deck-library.sort.created']()}
            </option>
            <option value="card-count">
              {t['com.affine.study.deck-library.sort.card-count']()}
            </option>
            <option value="due-count">
              {t['com.affine.study.deck-library.sort.due-count']()}
            </option>
          </select>
        </div>
        <div className={styles.sectionTitle}>
          {t['com.affine.study.decks']()}
        </div>
        {sortedDecks.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.empty-decks']()}
          </div>
        ) : (
          <div className={styles.deckList}>
            {sortedDecks.map(deck => (
              <StudyDeckListItem
                key={deck.id}
                deck={deck}
                cards={cards}
                dueCount={dueByDeck.get(deck.id) ?? 0}
              />
            ))}
          </div>
        )}
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyDecksPage />;
