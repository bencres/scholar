import { Button } from '@affine/component';
import type { StudyCardContent } from '@affine/core/modules/study/entities/card';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { getDeckCards } from '@affine/core/modules/study/utils/study-storage';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';
import { type MouseEvent, useCallback, useMemo } from 'react';

import * as styles from './styles.css';

export const StudyDeckListItem = ({
  deck,
  cards,
  dueCount,
}: {
  deck: StudyDeck;
  cards: StudyCardContent[];
  dueCount: number;
}) => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;

  const activeCount = useMemo(
    () => getDeckCards(deck, cards).filter(card => !card.suspended).length,
    [cards, deck]
  );

  const hasSource = !!(deck.sourceDocId ?? deck.metadata?.sourcePage?.docId);

  const openBrowse = useCallback(() => {
    workbench.open(`/study/decks/${deck.id}`, { at: 'active' });
  }, [deck.id, workbench]);

  const openReview = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      workbench.open(`/study/review/${deck.id}`, { at: 'active' });
    },
    [deck.id, workbench]
  );

  const openSource = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      const docId = deck.sourceDocId ?? deck.metadata?.sourcePage?.docId;
      if (!docId) return;
      workbench.openDoc({ docId, mode: 'page' });
    },
    [deck.metadata?.sourcePage?.docId, deck.sourceDocId, workbench]
  );

  return (
    <div
      className={styles.deckListItem}
      role="button"
      tabIndex={0}
      onClick={openBrowse}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openBrowse();
        }
      }}
    >
      <div className={styles.deckListItemMain}>
        <div className={styles.deckName}>{deck.name}</div>
        <div className={styles.deckSub}>
          {t['com.affine.study.card-count']({ count: String(activeCount) })}
          {dueCount > 0
            ? ` · ${t['com.affine.study.due-count']({ count: String(dueCount) })}`
            : null}
          {hasSource ? (
            <>
              {' · '}
              <button
                type="button"
                className={styles.deckStatLink}
                onClick={openSource}
              >
                {t['com.affine.study.open-source-page']()}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div
        className={styles.deckListItemActions}
        onClick={event => event.stopPropagation()}
      >
        {dueCount > 0 ? (
          <span className={styles.deckDuePill}>
            {t['com.affine.study.due-count']({ count: String(dueCount) })}
          </span>
        ) : null}
        <Button onClick={openReview}>{t['com.affine.study.review']()}</Button>
      </div>
    </div>
  );
};
