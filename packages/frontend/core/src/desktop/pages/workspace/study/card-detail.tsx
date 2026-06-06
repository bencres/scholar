import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import {
  type CardDraft,
  cardDraftToPayload,
  DEFAULT_CARD_DRAFT,
  toCardDraft,
} from '@affine/core/modules/study/views/study-card-draft';
import { StudyCardFormFields } from '@affine/core/modules/study/views/study-card-form-fields';
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
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export const StudyCardDetailPage = () => {
  const t = useI18n();
  const { cardId = '' } = useParams<{ cardId: string }>();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const card = useLiveData(studyService.card$(cardId));
  const decks = useLiveData(studyService.decks$);
  const memberships = useLiveData(studyService.decksForCard$(cardId));
  const [draft, setDraft] = useState<CardDraft>(DEFAULT_CARD_DRAFT);
  const [addDeckId, setAddDeckId] = useState('');

  useEffect(() => {
    if (card) {
      setDraft(toCardDraft(card));
    }
  }, [card]);

  const openSource = useCallback(() => {
    if (!card || card.provenance.docId === 'manual') return;
    workbench.openDoc({
      docId: card.provenance.docId,
      mode: 'page',
      blockIds: card.provenance.blockIds,
    });
  }, [card, workbench]);

  const handleSave = async () => {
    if (!card) return;
    await studyService.updateCard(card.id, cardDraftToPayload(draft));
  };

  const handleDelete = async () => {
    if (!card) return;
    await studyService.deleteCard(card.id);
    workbench.open('/study/cards', { at: 'active' });
  };

  const handleAddToDeck = async () => {
    if (!card || !addDeckId) return;
    await studyService.addCardsToDeck(addDeckId, [card.id]);
    setAddDeckId('');
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

  if (!card) {
    return (
      <>
        <ViewTitle title={t['com.affine.study.card-detail.title']()} />
        <ViewIcon icon="study" />
        <StudySubnav />
        <StudyPageBody>
          <div className={styles.emptyState}>
            {t['com.affine.study.card-not-found']()}
          </div>
        </StudyPageBody>
      </>
    );
  }

  const decksNotContaining = decks.filter(
    deck => !memberships.some(item => item.id === deck.id)
  );

  return (
    <>
      <ViewTitle title={t['com.affine.study.card-detail.title']()} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader title={t['com.affine.study.card-detail.title']()} />
      </ViewHeader>
      <StudySubnav />
      <StudyPageBody>
        <div className={styles.formCard}>
          <StudyCardFormFields
            draft={draft}
            onDraftChange={updater => setDraft(current => updater(current))}
          />
          <div className={styles.actionsRow}>
            <Button
              variant="primary"
              onClick={() => {
                handleSave().catch(error => {
                  console.error('[study.card-detail] save failed', error);
                });
              }}
            >
              {t['Save']()}
            </Button>
            {card.provenance.docId !== 'manual' ? (
              <Button onClick={openSource}>
                {t['com.affine.study.view-source']()}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                studyService
                  .updateCard(card.id, { suspended: !card.suspended })
                  .catch(console.error);
              }}
            >
              {card.suspended ? 'Unsuspend' : 'Suspend'}
            </Button>
            <Button
              onClick={() => {
                handleDelete().catch(error => {
                  console.error('[study.card-detail] delete failed', error);
                });
              }}
            >
              {t['com.affine.study.delete-card']()}
            </Button>
          </div>
        </div>
        <div className={styles.formCard}>
          <div className={styles.formTitle}>
            {t['com.affine.study.card-in-decks']()}
          </div>
          {memberships.length === 0 ? (
            <div className={styles.emptyState}>
              {t['com.affine.study.card-unassigned']()}
            </div>
          ) : (
            <div className={styles.deckBadgeRow}>
              {memberships.map(deck => (
                <div key={deck.id} className={styles.actionsRow}>
                  <WorkbenchLink
                    to={`/study/decks/${deck.id}`}
                    className={styles.deckBadge}
                  >
                    {deck.name}
                  </WorkbenchLink>
                  <Button
                    onClick={() => {
                      studyService
                        .removeCardsFromDeck(deck.id, [card.id])
                        .catch(console.error);
                    }}
                  >
                    {t['com.affine.study.remove-from-deck']()}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {decksNotContaining.length > 0 ? (
            <div className={styles.actionsRow} style={{ marginTop: 12 }}>
              <select
                value={addDeckId}
                onChange={event => setAddDeckId(event.target.value)}
                aria-label={t['com.affine.study.add-to-deck']()}
              >
                <option value="">{t['com.affine.study.add-to-deck']()}</option>
                {decksNotContaining.map(deck => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <Button
                disabled={!addDeckId}
                onClick={() => {
                  handleAddToDeck().catch(console.error);
                }}
              >
                {t['com.affine.study.add-to-deck']()}
              </Button>
            </div>
          ) : null}
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyCardDetailPage />;
