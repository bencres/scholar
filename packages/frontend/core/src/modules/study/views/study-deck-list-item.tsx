import { Button } from '@affine/component';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';
import { type MouseEvent, useCallback } from 'react';

import * as styles from './styles.css';

export const StudyDeckListItem = ({
  deck,
  dueCount,
}: {
  deck: StudyDeck;
  dueCount: number;
}) => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;

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

  const activeCount = deck.cards.filter(card => !card.suspended).length;

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
        <Button size="small" onClick={openReview}>
          {t['com.affine.study.review']()}
        </Button>
      </div>
    </div>
  );
};
