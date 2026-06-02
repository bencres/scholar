import { Button, Input } from '@affine/component';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { StudyService } from '@affine/core/modules/study';
import type { StudyCardContent } from '@affine/core/modules/study/entities/card';
import {
  type CardDraft,
  cardDraftToPayload,
  DEFAULT_CARD_DRAFT,
  parseCsvInput,
  toCardDraft,
} from '@affine/core/modules/study/views/study-card-draft';
import { StudyCardEditableBrowseItem } from '@affine/core/modules/study/views/study-card-editable-browse-item';
import { StudyCardFormFields } from '@affine/core/modules/study/views/study-card-form-fields';
import {
  StudyDeckHeader,
  StudyDeckHeaderActions,
} from '@affine/core/modules/study/views/study-deck-header';
import { StudyPageBody } from '@affine/core/modules/study/views/study-page-shell';
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

export const StudyDeckDetailPage = () => {
  const t = useI18n();
  const { deckId = '' } = useParams<{ deckId: string }>();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const deck = useLiveData(studyService.deck$(deckId));
  const dueCount = useLiveData(studyService.dueCountForDeck$(deckId));

  const sourceTitle = useLiveData(
    docDisplayMetaService.title$(deck?.sourceDocId ?? '')
  );
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckTags, setDeckTags] = useState('');
  const [dailyNewLimit, setDailyNewLimit] = useState('');
  const [dailyReviewLimit, setDailyReviewLimit] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardDraft, setEditingCardDraft] =
    useState<CardDraft>(DEFAULT_CARD_DRAFT);
  const [newCardDraft, setNewCardDraft] =
    useState<CardDraft>(DEFAULT_CARD_DRAFT);

  const activeCards = useMemo(
    () => deck?.cards.filter(card => !card.suspended) ?? [],
    [deck?.cards]
  );
  const learningGraph = useMemo(
    () => (deck ? studyService.learningGraphSnapshot(deck.id) : null),
    [deck, studyService]
  );

  const openReview = useCallback(() => {
    if (!deck) return;
    workbench.open(`/study/review/${deck.id}`, { at: 'active' });
  }, [deck, workbench]);

  const openSourceDoc = useCallback(() => {
    if (!deck?.sourceDocId) return;
    workbench.openDoc({ docId: deck.sourceDocId, mode: 'page' });
  }, [deck?.sourceDocId, workbench]);

  const cancelCardEdit = () => {
    setEditingCardId(null);
    setEditingCardDraft(DEFAULT_CARD_DRAFT);
  };

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
    workbench.open('/study', { at: 'active' });
  };

  const handleAddCard = async () => {
    if (!deck || !newCardDraft.question.trim()) return;
    await studyService.createCard(deck.id, cardDraftToPayload(newCardDraft));
    setNewCardDraft(DEFAULT_CARD_DRAFT);
  };

  const handleSaveCardEdit = async () => {
    if (!editingCardId || !editingCardDraft.question.trim()) return;
    await studyService.updateCard(
      editingCardId,
      cardDraftToPayload(editingCardDraft)
    );
    cancelCardEdit();
  };

  const handleStartCardEdit = (card: StudyCardContent) => {
    setEditingCardId(card.id);
    setEditingCardDraft(toCardDraft(card));
  };

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
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyDeckHeader
          deckName={deck.name}
          actions={
            <StudyDeckHeaderActions dueCount={dueCount} onReview={openReview} />
          }
        />
      </ViewHeader>
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
          {deck.sourceDocId ? (
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
        {deck.cards.length === 0 ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.review.empty']()}
          </div>
        ) : (
          <div className={styles.browseCardList}>
            {deck.cards.map((card, index) => (
              <StudyCardEditableBrowseItem
                key={card.id}
                index={index}
                card={card}
                editing={editingCardId === card.id}
                draft={editingCardDraft}
                onDraftChange={setEditingCardDraft}
                onSave={() => {
                  handleSaveCardEdit().catch(error => {
                    console.error('[study.deck] save card failed', error);
                  });
                }}
                onCancel={cancelCardEdit}
                onStartEdit={() => handleStartCardEdit(card)}
                onDelete={() => {
                  if (editingCardId === card.id) {
                    cancelCardEdit();
                  }
                  studyService.deleteCard(card.id).catch(error => {
                    console.error('[study.deck] delete card failed', error);
                  });
                }}
                onToggleSuspended={active => {
                  studyService
                    .updateCard(card.id, { suspended: !active })
                    .catch(error => {
                      console.error(
                        '[study.deck] toggle suspended failed',
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
            ))}
          </div>
        )}
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t['com.affine.study.add-card']()}
          </div>
          <StudyCardFormFields
            draft={newCardDraft}
            onDraftChange={setNewCardDraft}
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
