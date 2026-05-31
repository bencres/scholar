import { Button, Checkbox, Input } from '@affine/component';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { StudyService } from '@affine/core/modules/study';
import type { StudyCardContent } from '@affine/core/modules/study/entities/card';
import { StudyCardBrowseItem } from '@affine/core/modules/study/views/study-card-browse-item';
import {
  StudyDeckHeader,
  StudyDeckHeaderActions,
} from '@affine/core/modules/study/views/study-deck-header';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type CardDraft = {
  type: StudyCardContent['type'];
  question: string;
  answer: string;
  misconceptions: string;
  rubric: string;
  tags: string;
};

const DEFAULT_CARD_DRAFT: CardDraft = {
  type: 'recall',
  question: '',
  answer: '',
  misconceptions: '',
  rubric: '',
  tags: '',
};

function parseCsvInput(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function toCardDraft(card: StudyCardContent): CardDraft {
  return {
    type: card.type,
    question: card.question,
    answer: card.answer ?? '',
    misconceptions: (card.misconceptions ?? []).join(', '),
    rubric: (card.rubric ?? []).join(', '),
    tags: (card.tags ?? []).join(', '),
  };
}

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
  const [cardDraft, setCardDraft] = useState<CardDraft>(DEFAULT_CARD_DRAFT);

  const activeCards = useMemo(
    () => deck?.cards.filter(card => !card.suspended) ?? [],
    [deck?.cards]
  );

  const openReview = useCallback(() => {
    if (!deck) return;
    workbench.open(`/study/review/${deck.id}`, { at: 'active' });
  }, [deck, workbench]);

  const openSourceDoc = useCallback(() => {
    if (!deck?.sourceDocId) return;
    workbench.openDoc({ docId: deck.sourceDocId, mode: 'page' });
  }, [deck?.sourceDocId, workbench]);

  const resetCardDraft = () => {
    setEditingCardId(null);
    setCardDraft(DEFAULT_CARD_DRAFT);
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

  const handleSubmitCard = async () => {
    if (!deck || !cardDraft.question.trim()) return;
    const payload = {
      type: cardDraft.type,
      question: cardDraft.question,
      answer: cardDraft.answer,
      misconceptions: parseCsvInput(cardDraft.misconceptions),
      rubric: parseCsvInput(cardDraft.rubric),
      tags: parseCsvInput(cardDraft.tags),
    };
    if (editingCardId) {
      await studyService.updateCard(editingCardId, payload);
    } else {
      await studyService.createCard(deck.id, payload);
    }
    resetCardDraft();
  };

  const handleEditCard = (card: StudyCardContent) => {
    setEditingCardId(card.id);
    setCardDraft(toCardDraft(card));
  };

  if (!deck) {
    return (
      <ViewBody>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            {t['com.affine.study.deck-not-found']()}
          </div>
        </div>
      </ViewBody>
    );
  }

  return (
    <>
      <ViewTitle title={deck.name} />
      <ViewIcon icon="today" />
      <ViewHeader />
      <ViewBody>
        <div className={styles.pageBody}>
          <StudyDeckHeader
            deckName={deck.name}
            actions={
              <StudyDeckHeaderActions
                dueCount={dueCount}
                onReview={openReview}
              />
            }
          />
          <div className={styles.content}>
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
                  placeholder={t[
                    'com.affine.study.deck-description.placeholder'
                  ]()}
                />
                <Input
                  value={deckTags}
                  onChange={event => setDeckTags(event.target.value)}
                  placeholder={t['com.affine.study.deck-tags.placeholder']()}
                />
                <Input
                  value={dailyNewLimit}
                  onChange={event => setDailyNewLimit(event.target.value)}
                  placeholder={t[
                    'com.affine.study.daily-new-limit.placeholder'
                  ]()}
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
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {editingCardId
                  ? t['com.affine.study.edit-card']()
                  : t['com.affine.study.add-card']()}
              </div>
              <div className={styles.formGrid}>
                <div className={styles.toggleRow}>
                  <Button
                    variant={cardDraft.type === 'recall' ? 'primary' : 'plain'}
                    onClick={() =>
                      setCardDraft(current => ({ ...current, type: 'recall' }))
                    }
                  >
                    {t['com.affine.study.card-type.recall']()}
                  </Button>
                  <Button
                    variant={
                      cardDraft.type === 'synthesis' ? 'primary' : 'plain'
                    }
                    onClick={() =>
                      setCardDraft(current => ({
                        ...current,
                        type: 'synthesis',
                      }))
                    }
                  >
                    {t['com.affine.study.card-type.synthesis']()}
                  </Button>
                </div>
                <Input
                  value={cardDraft.question}
                  onChange={event =>
                    setCardDraft(current => ({
                      ...current,
                      question: event.target.value,
                    }))
                  }
                  placeholder={t[
                    'com.affine.study.card-question.placeholder'
                  ]()}
                />
                <Input
                  value={cardDraft.answer}
                  onChange={event =>
                    setCardDraft(current => ({
                      ...current,
                      answer: event.target.value,
                    }))
                  }
                  placeholder={t['com.affine.study.card-answer.placeholder']()}
                />
                <Input
                  value={cardDraft.misconceptions}
                  onChange={event =>
                    setCardDraft(current => ({
                      ...current,
                      misconceptions: event.target.value,
                    }))
                  }
                  placeholder={t[
                    'com.affine.study.card-misconceptions.placeholder'
                  ]()}
                />
                <Input
                  value={cardDraft.rubric}
                  onChange={event =>
                    setCardDraft(current => ({
                      ...current,
                      rubric: event.target.value,
                    }))
                  }
                  placeholder={t['com.affine.study.card-rubric.placeholder']()}
                />
                <Input
                  value={cardDraft.tags}
                  onChange={event =>
                    setCardDraft(current => ({
                      ...current,
                      tags: event.target.value,
                    }))
                  }
                  placeholder={t['com.affine.study.card-tags.placeholder']()}
                />
              </div>
              <div className={styles.actionsRow}>
                <Button
                  variant="primary"
                  disabled={!cardDraft.question.trim()}
                  onClick={() => {
                    handleSubmitCard().catch(error => {
                      console.error('[study.deck] save card failed', error);
                    });
                  }}
                >
                  {editingCardId
                    ? t['Save']()
                    : t['com.affine.study.add-card']()}
                </Button>
                {editingCardId ? (
                  <Button onClick={resetCardDraft}>{t['Cancel']()}</Button>
                ) : null}
              </div>
            </div>
            <div className={styles.sectionTitle}>
              {t['com.affine.study.browse-cards']()}
            </div>
            {activeCards.length === 0 ? (
              <div className={styles.emptyState}>
                {t['com.affine.study.review.empty']()}
              </div>
            ) : (
              <div className={styles.browseCardList}>
                {deck.cards.map((card, index) => (
                  <StudyCardBrowseItem
                    key={card.id}
                    index={index}
                    card={card}
                    headerExtra={
                      <div className={styles.inlineActions}>
                        <Checkbox
                          checked={!card.suspended}
                          onChange={checked => {
                            studyService
                              .updateCard(card.id, { suspended: !checked })
                              .catch(error => {
                                console.error(
                                  '[study.deck] toggle suspended failed',
                                  error
                                );
                              });
                          }}
                        />
                        <Button
                          size="small"
                          onClick={() => handleEditCard(card)}
                        >
                          {t['Edit']()}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            studyService.deleteCard(card.id).catch(error => {
                              console.error(
                                '[study.deck] delete card failed',
                                error
                              );
                            });
                          }}
                        >
                          {t['Delete']()}
                        </Button>
                      </div>
                    }
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
          </div>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <StudyDeckDetailPage />;
