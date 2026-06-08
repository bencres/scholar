import { Button } from '@affine/component';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { i18nTime, useI18n } from '@affine/i18n';

import * as styles from './styles.css';

export const StudyDeckDetailPanel = ({
  deck,
  activeCardCount,
  totalCardCount,
  dueCount,
  onBrowse,
  onReview,
  onOpenSource,
}: {
  deck: StudyDeck;
  activeCardCount: number;
  totalCardCount: number;
  dueCount: number;
  onBrowse: () => void;
  onReview: () => void;
  onOpenSource?: () => void;
}) => {
  const t = useI18n();
  const description = deck.metadata?.description?.trim();
  const tags = deck.metadata?.tags ?? [];
  const dailyNewLimit = deck.metadata?.limits?.dailyNewLimit;
  const dailyReviewLimit = deck.metadata?.limits?.dailyReviewLimit;

  return (
    <div className={styles.cardTableDetailContent}>
      <div className={styles.cardTableDetailGrid}>
        {description ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.deck-library.description']()}
            </div>
            <div className={styles.cardAnswer}>{description}</div>
          </div>
        ) : null}
        {tags.length ? (
          <div className={styles.browseCardSection}>
            <div className={styles.cardLabel}>
              {t['com.affine.study.deck-library.tags']()}
            </div>
            <div className={styles.conceptChipRow}>
              {tags.map(tag => (
                <span key={tag} className={styles.conceptChip}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.cardTableDetailMeta}>
          <span className={styles.cardTableMetaItem}>
            {t['com.affine.study.deck-library.column.cards']()}:{' '}
            {t['com.affine.study.card-count']({
              count: String(activeCardCount),
            })}
            {totalCardCount !== activeCardCount
              ? ` (${totalCardCount} total)`
              : ''}
          </span>
          <span className={styles.cardTableMetaItem}>
            {t['com.affine.study.deck-library.column.due']()}:{' '}
            {dueCount > 0
              ? t['com.affine.study.due-count']({ count: String(dueCount) })
              : t['com.affine.study.card-library.due.none']()}
          </span>
          {dailyNewLimit !== undefined ? (
            <span className={styles.cardTableMetaItem}>
              {t['com.affine.study.daily-new-limit.placeholder']()}:{' '}
              {dailyNewLimit}
            </span>
          ) : null}
          {dailyReviewLimit !== undefined ? (
            <span className={styles.cardTableMetaItem}>
              {t['com.affine.study.daily-review-limit.placeholder']()}:{' '}
              {dailyReviewLimit}
            </span>
          ) : null}
          <span className={styles.cardTableMetaItem}>
            {t['com.affine.study.deck-library.column.created']()}:{' '}
            {i18nTime(deck.createdAt, {
              absolute: { accuracy: 'day', noYear: true },
            })}
          </span>
          <span className={styles.cardTableMetaItem}>
            {t['com.affine.study.card-library.updated']()}:{' '}
            {i18nTime(deck.updatedAt, {
              absolute: { accuracy: 'day', noYear: true },
            })}
          </span>
        </div>
      </div>
      <div className={styles.cardTableDetailActions}>
        <Button variant="primary" onClick={onBrowse}>
          {t['com.affine.study.deck-library.browse']()}
        </Button>
        {dueCount > 0 ? (
          <Button onClick={onReview}>{t['com.affine.study.review']()}</Button>
        ) : null}
        {onOpenSource ? (
          <Button onClick={onOpenSource}>
            {t['com.affine.study.open-source-page']()}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
