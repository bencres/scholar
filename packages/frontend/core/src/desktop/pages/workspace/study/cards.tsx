import { Button, Input } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import type {
  CardState,
  CardType,
  StudyCardContent,
  StudyCardScheduling,
} from '@affine/core/modules/study/entities/card';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import {
  type CardDraft,
  cardDraftToPayload,
  DEFAULT_CARD_DRAFT,
} from '@affine/core/modules/study/views/study-card-draft';
import { StudyCardFormFields } from '@affine/core/modules/study/views/study-card-form-fields';
import { StudyCardSearchHelp } from '@affine/core/modules/study/views/study-card-search-help';
import {
  type CardSort,
  StudyCardTable,
} from '@affine/core/modules/study/views/study-card-table';
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

export const StudyCardsPage = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const decks = useLiveData(studyService.decks$);
  const scheduling = useLiveData(studyService.scheduling$);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<CardSort>('created-desc');
  const [showCreate, setShowCreate] = useState(false);
  const [newCardDraft, setNewCardDraft] =
    useState<CardDraft>(DEFAULT_CARD_DRAFT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const schedulingByCard = useMemo(
    () =>
      new Map<string, StudyCardScheduling>(
        scheduling.map(row => [row.cardId, row])
      ),
    [scheduling]
  );

  const decksByCardId = useMemo(() => {
    const map = new Map<string, StudyDeck[]>();
    for (const deck of decks) {
      for (const cardId of deck.cardIds) {
        const existing = map.get(cardId) ?? [];
        existing.push(deck);
        map.set(cardId, existing);
      }
    }
    return map;
  }, [decks]);

  const filteredCards = useMemo(() => {
    let base = studyService.searchCards(search);
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
    search,
    typeFilter,
    stateFilter,
    statusFilter,
    sort,
    schedulingByCard,
    studyService,
  ]);

  const handleCreateCard = async () => {
    const card = await studyService.createCard(
      cardDraftToPayload(newCardDraft)
    );
    setNewCardDraft(DEFAULT_CARD_DRAFT);
    setShowCreate(false);
    workbench.open(`/study/cards/${card.id}`, { at: 'active' });
  };

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => studyService.deleteCard(id)));
    setSelectedIds(new Set());
    if (expandedId && ids.includes(expandedId)) {
      setExpandedId(null);
    }
  }, [expandedId, selectedIds, studyService]);

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
      <ViewTitle title={t['com.affine.study.cards-library']()} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader
          title={t['com.affine.study.cards-library']()}
          actions={
            <Button
              variant="primary"
              onClick={() => setShowCreate(value => !value)}
            >
              {t['com.affine.study.create-card']()}
            </Button>
          }
        />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody>
        {showCreate ? (
          <div className={styles.formCard}>
            <div className={styles.formTitle}>
              {t['com.affine.study.create-card']()}
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
                  handleCreateCard().catch(error => {
                    console.error('[study.cards] create card failed', error);
                  });
                }}
              >
                {t['com.affine.study.create-card']()}
              </Button>
              <Button onClick={() => setShowCreate(false)}>
                {t['Cancel']()}
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
                  console.error('[study.cards] bulk suspend failed', error);
                });
              }}
            >
              {t['com.affine.study.card-library.bulk.suspend']()}
            </Button>
            <Button
              onClick={() => {
                handleBulkSuspend(false).catch(error => {
                  console.error('[study.cards] bulk activate failed', error);
                });
              }}
            >
              {t['com.affine.study.card-library.bulk.activate']()}
            </Button>
            <Button
              onClick={() => {
                handleBulkDelete().catch(error => {
                  console.error('[study.cards] bulk delete failed', error);
                });
              }}
            >
              {t['com.affine.study.card-library.bulk.delete']()}
            </Button>
            <Button onClick={() => setSelectedIds(new Set())}>
              {t['Cancel']()}
            </Button>
          </div>
        ) : null}
        {filteredCards.length === 0 ? (
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
            onEdit={card =>
              workbench.open(`/study/cards/${card.id}`, { at: 'active' })
            }
            onDelete={card => {
              studyService.deleteCard(card.id).catch(error => {
                console.error('[study.cards] delete card failed', error);
              });
              if (expandedId === card.id) setExpandedId(null);
            }}
            onToggleSuspended={(card, active) => {
              studyService
                .updateCard(card.id, { suspended: !active })
                .catch(error => {
                  console.error('[study.cards] toggle suspended failed', error);
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
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyCardsPage />;
