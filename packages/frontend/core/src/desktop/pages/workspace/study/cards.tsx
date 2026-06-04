import { Button, Input } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import type { StudyCardContent } from '@affine/core/modules/study/entities/card';
import { getDecksForCard } from '@affine/core/modules/study/utils/study-storage';
import {
  type CardDraft,
  cardDraftToPayload,
  DEFAULT_CARD_DRAFT,
} from '@affine/core/modules/study/views/study-card-draft';
import { StudyCardEditableBrowseItem } from '@affine/core/modules/study/views/study-card-editable-browse-item';
import { StudyCardFormFields } from '@affine/core/modules/study/views/study-card-form-fields';
import { StudyCardSearchHelp } from '@affine/core/modules/study/views/study-card-search-help';
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
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo, useState } from 'react';

type CardSort =
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'due-asc'
  | 'type';

function sortCards(
  cards: StudyCardContent[],
  sort: CardSort,
  schedulingByCard: Map<string, { due: number; state: string }>
) {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    if (sort === 'type') {
      return (
        a.type.localeCompare(b.type) || a.question.localeCompare(b.question)
      );
    }
    if (sort === 'updated-desc') {
      return b.updatedAt - a.updatedAt;
    }
    if (sort === 'created-asc') {
      return a.createdAt - b.createdAt;
    }
    if (sort === 'due-asc') {
      const aDue = schedulingByCard.get(a.id)?.due ?? Number.MAX_SAFE_INTEGER;
      const bDue = schedulingByCard.get(b.id)?.due ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
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
  const [sort, setSort] = useState<CardSort>('created-desc');
  const [showCreate, setShowCreate] = useState(false);
  const [newCardDraft, setNewCardDraft] =
    useState<CardDraft>(DEFAULT_CARD_DRAFT);

  const schedulingByCard = useMemo(
    () => new Map(scheduling.map(row => [row.cardId, row])),
    [scheduling]
  );

  const filteredCards = useMemo(() => {
    const base = studyService.searchCards(search);
    return sortCards(base, sort, schedulingByCard);
  }, [search, sort, schedulingByCard, studyService]);

  const handleCreateCard = async () => {
    const card = await studyService.createCard(
      cardDraftToPayload(newCardDraft)
    );
    setNewCardDraft(DEFAULT_CARD_DRAFT);
    setShowCreate(false);
    workbench.open(`/study/cards/${card.id}`, { at: 'active' });
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
      <ViewTitle title={t['com.affine.study.cards-library']()} />
      <ViewIcon icon="today" />
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
          <select
            value={sort}
            onChange={event => setSort(event.target.value as CardSort)}
            aria-label={t['com.affine.study.card-library.sort.label']()}
          >
            <option value="created-desc">
              {t['com.affine.study.card-library.sort.created-desc']()}
            </option>
            <option value="created-asc">
              {t['com.affine.study.card-library.sort.created-asc']()}
            </option>
            <option value="updated-desc">
              {t['com.affine.study.card-library.sort.updated-desc']()}
            </option>
            <option value="due-asc">
              {t['com.affine.study.card-library.sort.due-asc']()}
            </option>
            <option value="type">
              {t['com.affine.study.card-library.sort.type']()}
            </option>
          </select>
        </div>
        <StudyCardSearchHelp />
        {filteredCards.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.card-library.empty']()}
          </div>
        ) : (
          <div className={styles.browseCardList}>
            {filteredCards.map((card, index) => {
              const memberships = getDecksForCard(card.id, decks);
              return (
                <div key={card.id}>
                  <StudyCardEditableBrowseItem
                    index={index}
                    card={card}
                    editing={false}
                    draft={DEFAULT_CARD_DRAFT}
                    onDraftChange={() => undefined}
                    onSave={() => {}}
                    onCancel={() => {}}
                    onStartEdit={() =>
                      workbench.open(`/study/cards/${card.id}`, {
                        at: 'active',
                      })
                    }
                    onDelete={() => {
                      studyService.deleteCard(card.id).catch(error => {
                        console.error(
                          '[study.cards] delete card failed',
                          error
                        );
                      });
                    }}
                    onToggleSuspended={active => {
                      studyService
                        .updateCard(card.id, { suspended: !active })
                        .catch(error => {
                          console.error(
                            '[study.cards] toggle suspended failed',
                            error
                          );
                        });
                    }}
                    onViewSource={
                      card.provenance.docId === 'manual'
                        ? undefined
                        : () =>
                            workbench.openDoc({
                              docId: card.provenance.docId,
                              mode: 'page',
                              blockIds: card.provenance.blockIds,
                            })
                    }
                  />
                  <div className={styles.deckBadgeRow}>
                    {memberships.length === 0 ? (
                      <span className={styles.deckBadge}>
                        {t['com.affine.study.card-unassigned']()}
                      </span>
                    ) : (
                      memberships.map(deck => (
                        <WorkbenchLink
                          key={deck.id}
                          to={`/study/decks/${deck.id}`}
                          className={styles.deckBadge}
                        >
                          {deck.name}
                        </WorkbenchLink>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyCardsPage />;
