import { Button, Input } from '@affine/component';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { StudyService } from '@affine/core/modules/study';
import type {
  CardState,
  CardType,
  StudyCardContent,
  StudyCardScheduling,
} from '@affine/core/modules/study/entities/card';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { getDeckCards } from '@affine/core/modules/study/utils/study-storage';
import {
  type CardDraft,
  cardDraftToPayload,
  DEFAULT_CARD_DRAFT,
  parseCsvInput,
} from '@affine/core/modules/study/views/study-card-draft';
import { StudyCardFormFields } from '@affine/core/modules/study/views/study-card-form-fields';
import { StudyCardSearchHelp } from '@affine/core/modules/study/views/study-card-search-help';
import {
  type CardSort,
  StudyCardTable,
} from '@affine/core/modules/study/views/study-card-table';
import {
  StudyDeckHeader,
  StudyDeckHeaderActions,
} from '@affine/core/modules/study/views/study-deck-header';
import { StudyPageBody } from '@affine/core/modules/study/views/study-page-shell';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type CardTypeFilter = 'all' | CardType;
type StateFilter = 'all' | CardState;
type StatusFilter = 'all' | 'active' | 'suspended';

function sortCards(
  cards: StudyCardContent[],
  sort: CardSort,
  schedulingByCard: Map<string, StudyCardScheduling>
) {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    if (sort === 'question-asc' || sort === 'question-desc') {
      const cmp = a.question.localeCompare(b.question);
      return sort === 'question-asc' ? cmp : -cmp;
    }
    if (sort === 'type') {
      return (
        a.type.localeCompare(b.type) || a.question.localeCompare(b.question)
      );
    }
    if (sort === 'updated-desc') {
      return b.updatedAt - a.updatedAt;
    }
    if (sort === 'updated-asc') {
      return a.updatedAt - b.updatedAt;
    }
    if (sort === 'created-asc') {
      return a.createdAt - b.createdAt;
    }
    if (sort === 'due-asc' || sort === 'due-desc') {
      const aDue = schedulingByCard.get(a.id)?.due ?? Number.MAX_SAFE_INTEGER;
      const bDue = schedulingByCard.get(b.id)?.due ?? Number.MAX_SAFE_INTEGER;
      const cmp = aDue - bDue;
      return sort === 'due-asc' ? cmp : -cmp;
    }
    return b.createdAt - a.createdAt;
  });
  return sorted;
}

export const StudyDeckDetailPage = () => {
  const t = useI18n();
  const { deckId = '' } = useParams<{ deckId: string }>();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const deck = useLiveData(studyService.deck$(deckId));
  const allCards = useLiveData(studyService.cards$);
  const allDecks = useLiveData(studyService.decks$);
  const scheduling = useLiveData(studyService.scheduling$);
  const dueCount = useLiveData(studyService.dueCountForDeck$(deckId));
  const sourceDocId =
    deck?.sourceDocId ?? deck?.metadata?.sourcePage?.docId ?? '';
  const sourceTitle = useLiveData(docDisplayMetaService.title$(sourceDocId));
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckTags, setDeckTags] = useState('');
  const [dailyNewLimit, setDailyNewLimit] = useState('');
  const [dailyReviewLimit, setDailyReviewLimit] = useState('');
  const [newCardDraft, setNewCardDraft] =
    useState<CardDraft>(DEFAULT_CARD_DRAFT);
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySelection, setLibrarySelection] = useState<Set<string>>(
    () => new Set()
  );
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<CardSort>('created-desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const deckCards = useMemo(
    () => (deck ? getDeckCards(deck, allCards) : []),
    [allCards, deck]
  );

  const activeCards = useMemo(
    () => deckCards.filter(card => !card.suspended),
    [deckCards]
  );

  const schedulingByCard = useMemo(
    () =>
      new Map<string, StudyCardScheduling>(
        scheduling.map(row => [row.cardId, row])
      ),
    [scheduling]
  );

  const decksByCardId = useMemo(() => {
    const map = new Map<string, StudyDeck[]>();
    for (const item of allDecks) {
      for (const cardId of item.cardIds) {
        const existing = map.get(cardId) ?? [];
        existing.push(item);
        map.set(cardId, existing);
      }
    }
    return map;
  }, [allDecks]);

  const filteredCards = useMemo(() => {
    let base = deckCards;
    if (search.trim()) {
      const searched = new Set(
        studyService.searchCards(search).map(card => card.id)
      );
      base = base.filter(card => searched.has(card.id));
    }
    if (typeFilter !== 'all') {
      base = base.filter(card => card.type === typeFilter);
    }
    if (stateFilter !== 'all') {
      base = base.filter(
        card => schedulingByCard.get(card.id)?.state === stateFilter
      );
    }
    if (statusFilter === 'active') {
      base = base.filter(card => !card.suspended);
    } else if (statusFilter === 'suspended') {
      base = base.filter(card => card.suspended);
    }
    return sortCards(base, sort, schedulingByCard);
  }, [
    deckCards,
    search,
    typeFilter,
    stateFilter,
    statusFilter,
    sort,
    schedulingByCard,
    studyService,
  ]);

  const libraryCandidates = useMemo(() => {
    if (!deck) return [];
    const inDeck = new Set(deck.cardIds);
    const query = librarySearch.trim();
    return studyService.searchCards(query).filter(card => !inDeck.has(card.id));
  }, [deck, librarySearch, studyService]);
  const learningGraph = useMemo(
    () => (deck ? studyService.learningGraphSnapshot(deck.id) : null),
    [deck, studyService]
  );

  const openReview = useCallback(() => {
    if (!deck) return;
    workbench.open(`/study/review/${deck.id}`, { at: 'active' });
  }, [deck, workbench]);

  const openSourceDoc = useCallback(() => {
    if (!sourceDocId) return;
    workbench.openDoc({ docId: sourceDocId, mode: 'page' });
  }, [sourceDocId, workbench]);

  const syncDeckDraft = useCallback(() => {
    if (!deck) return;
    setDeckName(deck.name);
    setDeckDescription(deck.metadata?.description ?? '');
    setDeckTags((deck.metadata?.tags ?? []).join(', '));
    setDailyNewLimit(String(deck.metadata?.limits?.dailyNewLimit ?? ''));
    setDailyReviewLimit(String(deck.metadata?.limits?.dailyReviewLimit ?? ''));
  }, [deck]);

  useEffect(() => {
    syncDeckDraft();
  }, [syncDeckDraft]);

  const handleSaveDeck = async () => {
    if (!deck) return;
    await studyService.updateDeck(deck.id, {
      name: deckName,
      metadata: {
        description: deckDescription,
        tags: parseCsvInput(deckTags),
        limits: {
          dailyNewLimit: Number.parseInt(dailyNewLimit, 10) || undefined,
          dailyReviewLimit: Number.parseInt(dailyReviewLimit, 10) || undefined,
        },
      },
    });
  };

  const handleDeleteDeck = async () => {
    if (!deck) return;
    await studyService.deleteDeck(deck.id);
    workbench.open('/study/decks', { at: 'active' });
  };

  const handleAddCard = async () => {
    if (!deck || !newCardDraft.question.trim()) return;
    await studyService.createCard(cardDraftToPayload(newCardDraft), {
      deckIds: [deck.id],
    });
    setNewCardDraft(DEFAULT_CARD_DRAFT);
  };

  const handleImportFromLibrary = async () => {
    if (!deck || librarySelection.size === 0) return;
    await studyService.addCardsToDeck(deck.id, [...librarySelection]);
    setLibrarySelection(new Set());
    setShowLibraryPicker(false);
  };

  const toggleLibraryCard = (cardId: string, selected: boolean) => {
    setLibrarySelection(prev => {
      const next = new Set(prev);
      if (selected) next.add(cardId);
      else next.delete(cardId);
      return next;
    });
  };

  const handleBulkRemove = useCallback(async () => {
    if (!deck) return;
    const ids = [...selectedIds];
    await studyService.removeCardsFromDeck(deck.id, ids);
    setSelectedIds(new Set());
    if (expandedId && ids.includes(expandedId)) {
      setExpandedId(null);
    }
  }, [deck, expandedId, selectedIds, studyService]);

  const handleBulkSuspend = useCallback(
    async (suspended: boolean) => {
      const ids = [...selectedIds];
      await Promise.all(
        ids.map(id => studyService.updateCard(id, { suspended }))
      );
      setSelectedIds(new Set());
    },
    [selectedIds, studyService]
  );

  const handleRemoveCard = useCallback(
    (card: StudyCardContent) => {
      if (!deck) return;
      studyService.removeCardsFromDeck(deck.id, [card.id]).catch(error => {
        console.error('[study.deck] remove card failed', error);
      });
      if (expandedId === card.id) setExpandedId(null);
    },
    [deck, expandedId, studyService]
  );

  if (!deck) {
    return (
      <StudyPageBody>
        <div className={styles.emptyState}>
          {t['com.affine.study.deck-not-found']()}
        </div>
      </StudyPageBody>
    );
  }

  return (
    <>
      <ViewTitle title={deck.name} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyDeckHeader
          deckName={deck.name}
          actions={
            <StudyDeckHeaderActions dueCount={dueCount} onReview={openReview} />
          }
        />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody>
        <div className={styles.deckStats}>
          <span className={styles.deckStatPill}>
            {t['com.affine.study.card-count']({
              count: String(activeCards.length),
            })}
          </span>
          {dueCount > 0 ? (
            <span className={styles.deckStatPill}>
              {t['com.affine.study.due-count']({ count: String(dueCount) })}
            </span>
          ) : null}
          {sourceDocId ? (
            <button
              type="button"
              className={styles.deckStatLink}
              onClick={openSourceDoc}
            >
              {t['com.affine.study.source-document']({
                title: sourceTitle || t['Untitled'](),
              })}
            </button>
          ) : null}
        </div>
        {learningGraph ? (
          <div className={styles.formCard}>
            <div className={styles.formTitle}>Concept coverage</div>
            <div className={styles.modeSummary}>
              <span>
                {`Mapped cards: ${learningGraph.mappedCards}/${learningGraph.totalCards}`}
              </span>
              {learningGraph.uncoveredCardIds.length > 0 ? (
                <span>
                  {`Uncovered cards: ${learningGraph.uncoveredCardIds.length}`}
                </span>
              ) : null}
            </div>
            {learningGraph.concepts.length ? (
              <div className={styles.conceptGrid}>
                {learningGraph.concepts.slice(0, 6).map(concept => (
                  <div key={concept.id} className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>{concept.label}</div>
                    <div className={styles.conceptMeta}>
                      {`Cards: ${concept.cardCount}`}
                    </div>
                    <div className={styles.conceptMeta}>
                      {`Mastery: ${Math.round(concept.mastery * 100)}%`}
                    </div>
                    <div className={styles.conceptMeta}>
                      {`Forgetting risk: ${Math.round(
                        concept.forgettingRisk * 100
                      )}%`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No mapped concepts yet.</div>
            )}
          </div>
        ) : null}
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t['com.affine.study.deck-settings']()}
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
            <Input
              value={dailyNewLimit}
              onChange={event => setDailyNewLimit(event.target.value)}
              placeholder={t['com.affine.study.daily-new-limit.placeholder']()}
            />
            <Input
              value={dailyReviewLimit}
              onChange={event => setDailyReviewLimit(event.target.value)}
              placeholder={t[
                'com.affine.study.daily-review-limit.placeholder'
              ]()}
            />
          </div>
          <div className={styles.actionsRow}>
            <Button
              variant="primary"
              onClick={() => {
                handleSaveDeck().catch(error => {
                  console.error('[study.deck] update deck failed', error);
                });
              }}
            >
              {t['Save']()}
            </Button>
            <Button
              onClick={() => {
                handleDeleteDeck().catch(error => {
                  console.error('[study.deck] delete deck failed', error);
                });
              }}
            >
              {t['Delete']()}
            </Button>
          </div>
        </div>
        <div className={styles.sectionTitle}>
          {t['com.affine.study.browse-cards']()}
        </div>
        <div className={styles.actionsRow}>
          <Button onClick={() => setShowLibraryPicker(value => !value)}>
            {t['com.affine.study.import-from-library']()}
          </Button>
        </div>
        {showLibraryPicker ? (
          <div className={styles.formCard}>
            <Input
              value={librarySearch}
              onChange={event => setLibrarySearch(event.target.value)}
              placeholder={t[
                'com.affine.study.card-library.search.placeholder'
              ]()}
            />
            <StudyCardSearchHelp />
            <div className={styles.pickerList}>
              {libraryCandidates.map(card => (
                <label key={card.id} className={styles.pickerItem}>
                  <input
                    type="checkbox"
                    checked={librarySelection.has(card.id)}
                    onChange={event =>
                      toggleLibraryCard(card.id, event.target.checked)
                    }
                  />
                  <span>{card.question}</span>
                </label>
              ))}
            </div>
            <div className={styles.actionsRow}>
              <Button
                variant="primary"
                disabled={librarySelection.size === 0}
                onClick={() => {
                  handleImportFromLibrary().catch(console.error);
                }}
              >
                {t['com.affine.study.add-to-deck']()}
              </Button>
            </div>
          </div>
        ) : null}
        <div className={styles.libraryToolbar}>
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t[
              'com.affine.study.card-library.search.placeholder'
            ]()}
            style={{ flex: 1, minWidth: 200 }}
          />
        </div>
        <div className={styles.cardTableFilterRow}>
          <div
            className={styles.toggleRow}
            role="group"
            aria-label={t['com.affine.study.card-library.filter.type.label']()}
          >
            <Button
              variant={typeFilter === 'all' ? 'primary' : 'plain'}
              onClick={() => setTypeFilter('all')}
            >
              {t['com.affine.study.card-library.filter.type.all']()}
            </Button>
            <Button
              variant={typeFilter === 'recall' ? 'primary' : 'plain'}
              onClick={() => setTypeFilter('recall')}
            >
              {t['com.affine.study.card-type.recall']()}
            </Button>
            <Button
              variant={typeFilter === 'synthesis' ? 'primary' : 'plain'}
              onClick={() => setTypeFilter('synthesis')}
            >
              {t['com.affine.study.card-type.synthesis']()}
            </Button>
          </div>
          <select
            className={styles.cardTableFilterSelect}
            value={stateFilter}
            onChange={event =>
              setStateFilter(event.target.value as StateFilter)
            }
            aria-label={t['com.affine.study.card-library.filter.state.label']()}
          >
            <option value="all">
              {t['com.affine.study.card-library.filter.state.all']()}
            </option>
            <option value="new">
              {t['com.affine.study.card-library.state.new']()}
            </option>
            <option value="learning">
              {t['com.affine.study.card-library.state.learning']()}
            </option>
            <option value="review">
              {t['com.affine.study.card-library.state.review']()}
            </option>
            <option value="relearning">
              {t['com.affine.study.card-library.state.relearning']()}
            </option>
          </select>
          <select
            className={styles.cardTableFilterSelect}
            value={statusFilter}
            onChange={event =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            aria-label={t[
              'com.affine.study.card-library.filter.status.label'
            ]()}
          >
            <option value="all">
              {t['com.affine.study.card-library.filter.status.all']()}
            </option>
            <option value="active">
              {t['com.affine.study.card-library.filter.status.active']()}
            </option>
            <option value="suspended">
              {t['com.affine.study.card-library.filter.status.suspended']()}
            </option>
          </select>
        </div>
        <StudyCardSearchHelp />
        {selectedIds.size > 0 ? (
          <div className={styles.cardTableBulkBar}>
            <span className={styles.cardTableBulkCount}>
              {t['com.affine.study.card-library.bulk.selected']({
                count: String(selectedIds.size),
              })}
            </span>
            <Button
              onClick={() => {
                handleBulkSuspend(true).catch(error => {
                  console.error('[study.deck] bulk suspend failed', error);
                });
              }}
            >
              {t['com.affine.study.card-library.bulk.suspend']()}
            </Button>
            <Button
              onClick={() => {
                handleBulkSuspend(false).catch(error => {
                  console.error('[study.deck] bulk activate failed', error);
                });
              }}
            >
              {t['com.affine.study.card-library.bulk.activate']()}
            </Button>
            <Button
              onClick={() => {
                handleBulkRemove().catch(error => {
                  console.error('[study.deck] bulk remove failed', error);
                });
              }}
            >
              {t['com.affine.study.remove-from-deck']()}
            </Button>
            <Button onClick={() => setSelectedIds(new Set())}>
              {t['Cancel']()}
            </Button>
          </div>
        ) : null}
        {deckCards.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.review.empty']()}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.card-library.empty']()}
          </div>
        ) : (
          <StudyCardTable
            cards={filteredCards}
            decksByCardId={decksByCardId}
            schedulingByCard={schedulingByCard}
            sort={sort}
            onSortChange={setSort}
            expandedId={expandedId}
            onExpandedChange={setExpandedId}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            deleteLabel={t['com.affine.study.remove-from-deck']()}
            onSave={async (card, draft) => {
              await studyService.updateCard(card.id, cardDraftToPayload(draft));
            }}
            onDelete={handleRemoveCard}
            onToggleSuspended={(card, active) => {
              studyService
                .updateCard(card.id, { suspended: !active })
                .catch(error => {
                  console.error('[study.deck] toggle suspended failed', error);
                });
            }}
            onViewSource={card => {
              if (card.provenance.docId === 'manual') return;
              workbench.openDoc({
                docId: card.provenance.docId,
                mode: 'page',
                blockIds: card.provenance.blockIds,
              });
            }}
          />
        )}
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t['com.affine.study.add-card']()}
          </div>
          <StudyCardFormFields
            draft={newCardDraft}
            onDraftChange={updater =>
              setNewCardDraft(current => updater(current))
            }
          />
          <div className={styles.actionsRow}>
            <Button
              variant="primary"
              disabled={!newCardDraft.question.trim()}
              onClick={() => {
                handleAddCard().catch(error => {
                  console.error('[study.deck] add card failed', error);
                });
              }}
            >
              {t['com.affine.study.add-card']()}
            </Button>
          </div>
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyDeckDetailPage />;
