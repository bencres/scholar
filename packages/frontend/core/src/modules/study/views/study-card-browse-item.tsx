import { Button } from '@affine/component';
import type { CardType } from '@affine/core/modules/study/entities/card';
import { useI18n } from '@affine/i18n';
import { ArrowDownSmallIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { type ReactNode, useCallback, useState } from 'react';

import * as styles from './styles.css';

export type StudyCardBrowseData = {
  type: CardType;
  question: string;
  answer?: string;
  concepts?: string[];
  misconceptions?: string[];
  rubric?: string[];
};

export const StudyCardBrowseItem = ({
  card,
  index,
  headerExtra,
  onViewSource,
  defaultExpanded = false,
}: {
  card: StudyCardBrowseData;
  index: number;
  headerExtra?: ReactNode;
  onViewSource?: () => void;
  defaultExpanded?: boolean;
}) => {
  const t = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasDetails =
    (card.type === 'recall' && !!card.answer) ||
    (card.type === 'recall' && !!card.misconceptions?.length) ||
    (card.type === 'synthesis' && !!card.rubric?.length);

  const toggleExpanded = useCallback(() => {
    if (hasDetails) {
      setExpanded(value => !value);
    }
  }, [hasDetails]);

  const typeLabel =
    card.type === 'recall'
      ? t['com.affine.study.card-type.recall']()
      : t['com.affine.study.card-type.synthesis']();

  return (
    <article className={styles.browseCard}>
      <button
        type="button"
        className={clsx(
          styles.browseCardHeader,
          !hasDetails && styles.browseCardHeaderStatic
        )}
        onClick={toggleExpanded}
        disabled={!hasDetails}
        aria-expanded={hasDetails ? expanded : undefined}
      >
        <span className={styles.browseCardIndex}>{index + 1}</span>
        <div className={styles.browseCardHeaderMain}>
          <div className={styles.browseCardMeta}>
            <span className={styles.cardTypeBadge}>{typeLabel}</span>
            {card.concepts?.length ? (
              <span className={styles.cardTypeBadge}>
                {card.concepts.slice(0, 2).join(', ')}
              </span>
            ) : null}
          </div>
          <div className={styles.cardQuestion}>{card.question}</div>
        </div>
        {headerExtra ? (
          <div
            className={styles.browseCardHeaderExtra}
            onClick={event => event.stopPropagation()}
          >
            {headerExtra}
          </div>
        ) : null}
        {hasDetails ? (
          <ArrowDownSmallIcon
            className={clsx(
              styles.browseCardChevron,
              expanded && styles.browseCardChevronExpanded
            )}
          />
        ) : null}
      </button>
      {expanded && hasDetails ? (
        <div className={styles.browseCardBody}>
          {card.type === 'recall' && card.answer ? (
            <div className={styles.browseCardSection}>
              <div className={styles.cardLabel}>
                {t['com.affine.study.answer']()}
              </div>
              <div className={styles.cardAnswer}>{card.answer}</div>
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
          {onViewSource ? (
            <div className={styles.browseCardFooter}>
              <Button size="small" onClick={onViewSource}>
                {t['com.affine.study.view-source']()}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};
