import { Button } from '@affine/component';
import type {
  CardState,
  StudyCardContent,
} from '@affine/core/modules/study/entities/card';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import { i18nTime, useI18n } from '@affine/i18n';

import * as styles from './styles.css';

export const StudyCardDetailPanel = ({
  card,
  decks,
  schedulingState,
  due,
  onEdit,
  onDelete,
  onToggleSuspended,
  onViewSource,
  deleteLabel,
}: {
  card: StudyCardContent;
  decks: StudyDeck[];
  schedulingState?: CardState;
  due?: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSuspended: (active: boolean) => void;
  onViewSource?: () => void;
  deleteLabel?: string;
}) => {
  const t = useI18n();

  const stateLabel = schedulingState
    ? {
        new: t['com.affine.study.card-library.state.new'](),
        learning: t['com.affine.study.card-library.state.learning'](),
        review: t['com.affine.study.card-library.state.review'](),
        relearning: t['com.affine.study.card-library.state.relearning'](),
      }[schedulingState]
    : null;

  const dueLabel =
    due === undefined
      ? t['com.affine.study.card-library.due.none']()
      : i18nTime(due, {
          relative: { max: [2, 'day'], yesterdayAndTomorrow: true },
          absolute: { accuracy: 'day', noYear: true },
        });

  return (
    <div className={styles.cardTableDetailContent}>
      <div className={styles.cardTableDetailGrid}>
        {card.type === 'recall' && card.answer ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.answer']()}
            </div>
            <div className={styles.cardAnswer}>{card.answer}</div>
          </div>
        ) : null}
        {card.type === 'synthesis' && card.rubric?.length ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.rubric']()}
            </div>
            <ul className={styles.browseList}>
              {card.rubric.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {card.type === 'recall' && card.misconceptions?.length ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.misconceptions']()}
            </div>
            <ul className={styles.browseList}>
              {card.misconceptions.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {card.concepts?.length ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.card-library.concepts']()}
            </div>
            <div className={styles.conceptChipRow}>
              {card.concepts.map(concept => (
                <span key={concept} className={styles.conceptChip}>
                  {concept}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {card.tags?.length ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.card-library.tags']()}
            </div>
            <div className={styles.conceptChipRow}>
              {card.tags.map(tag => (
                <span key={tag} className={styles.conceptChip}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.browseCardSection}>
          <div className={styles.cardLabel}>
            {t['com.affine.study.card-in-decks']()}
          </div>
          <div className={styles.deckBadgeRow}>
            {decks.length === 0 ? (
              <span className={styles.deckBadge}>
                {t['com.affine.study.card-unassigned']()}
              </span>
            ) : (
              decks.map(deck => (
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
        <div className={styles.cardTableDetailMeta}>
          {stateLabel ? (
            <span className={styles.cardTableMetaItem}>
              {t['com.affine.study.card-library.column.state']()}: {stateLabel}
            </span>
          ) : null}
          <span className={styles.cardTableMetaItem}>
            {t['com.affine.study.card-library.column.due']()}: {dueLabel}
          </span>
          <span className={styles.cardTableMetaItem}>
            {t['com.affine.study.card-library.updated']()}:{' '}
            {i18nTime(card.updatedAt, {
              absolute: { accuracy: 'day', noYear: true },
            })}
          </span>
        </div>
      </div>
      <div className={styles.cardTableDetailActions}>
        <Button onClick={onEdit}>{t['Edit']()}</Button>
        <Button onClick={() => onToggleSuspended(!card.suspended)}>
          {card.suspended
            ? t['com.affine.study.card-library.filter.status.active']()
            : t['com.affine.study.card-library.bulk.suspend']()}
        </Button>
        <Button onClick={onDelete}>{deleteLabel ?? t['Delete']()}</Button>
        {onViewSource ? (
          <Button onClick={onViewSource}>
            {t['com.affine.study.view-source']()}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
