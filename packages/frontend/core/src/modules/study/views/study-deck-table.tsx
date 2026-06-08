import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { i18nTime, useI18n } from '@affine/i18n';
import { ArrowDownSmallIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { type MouseEvent, type ReactNode, useCallback, useMemo } from 'react';

import { StudyDeckDetailPanel } from './study-deck-detail-panel';
import * as styles from './styles.css';

export type DeckSort =
  | 'name-asc'
  | 'name-desc'
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'updated-asc'
  | 'card-count-desc'
  | 'card-count-asc'
  | 'due-desc'
  | 'due-asc';

type SortableColumn = 'name' | 'created' | 'updated' | 'card-count' | 'due';

const COLUMN_GRID = 'minmax(200px, 1fr) 88px 88px 100px 32px';

export type DeckTableRow = {
  deck: StudyDeck;
  activeCardCount: number;
  totalCardCount: number;
  dueCount: number;
};

export const StudyDeckTable = ({
  rows,
  sort,
  onSortChange,
  expandedId,
  onExpandedChange,
  onBrowse,
  onReview,
  onOpenSource,
}: {
  rows: DeckTableRow[];
  sort: DeckSort;
  onSortChange: (sort: DeckSort) => void;
  expandedId: string | null;
  onExpandedChange: (deckId: string | null) => void;
  onBrowse: (deck: StudyDeck) => void;
  onReview: (deck: StudyDeck) => void;
  onOpenSource?: (deck: StudyDeck) => void;
}) => {
  const t = useI18n();

  const toggleExpanded = useCallback(
    (deckId: string) => {
      onExpandedChange(expandedId === deckId ? null : deckId);
    },
    [expandedId, onExpandedChange]
  );

  const handleSortColumn = useCallback(
    (column: SortableColumn) => {
      const toggles: Record<SortableColumn, [DeckSort, DeckSort]> = {
        name: ['name-asc', 'name-desc'],
        created: ['created-desc', 'created-asc'],
        updated: ['updated-desc', 'updated-asc'],
        'card-count': ['card-count-desc', 'card-count-asc'],
        due: ['due-desc', 'due-asc'],
      };
      const [asc, desc] = toggles[column];
      if (sort === asc) {
        onSortChange(desc);
        return;
      }
      onSortChange(asc);
    },
    [onSortChange, sort]
  );

  const sortDirection = useMemo(
    () =>
      ({
        'name-asc': 'asc',
        'name-desc': 'desc',
        'created-desc': 'desc',
        'created-asc': 'asc',
        'updated-desc': 'desc',
        'updated-asc': 'asc',
        'card-count-desc': 'desc',
        'card-count-asc': 'asc',
        'due-desc': 'desc',
        'due-asc': 'asc',
      }) as Partial<Record<DeckSort, 'asc' | 'desc'>>,
    []
  );

  const renderSortHeader = (
    column: SortableColumn,
    label: string,
    activeSorts: DeckSort[]
  ) => {
    const active = activeSorts.includes(sort);
    const direction = active ? sortDirection[sort] : undefined;
    return (
      <button
        type="button"
        className={clsx(
          styles.cardTableHeaderCell,
          styles.cardTableHeaderSortable,
          active && styles.cardTableHeaderActive
        )}
        onClick={() => handleSortColumn(column)}
      >
        <span>{label}</span>
        {active && direction ? (
          <ArrowDownSmallIcon
            className={clsx(
              styles.cardTableSortIcon,
              direction === 'asc' && styles.cardTableSortIconAsc
            )}
          />
        ) : null}
      </button>
    );
  };

  const formatDue = (dueCount: number) => {
    if (dueCount === 0) return t['com.affine.study.card-library.due.none']();
    return t['com.affine.study.due-count']({ count: String(dueCount) });
  };

  return (
    <div className={styles.cardTable}>
      <div
        className={styles.cardTableHeader}
        style={{ gridTemplateColumns: COLUMN_GRID }}
        role="row"
      >
        {renderSortHeader(
          'name',
          t['com.affine.study.deck-library.column.name'](),
          ['name-asc', 'name-desc']
        )}
        {renderSortHeader(
          'card-count',
          t['com.affine.study.deck-library.column.cards'](),
          ['card-count-desc', 'card-count-asc']
        )}
        {renderSortHeader(
          'due',
          t['com.affine.study.deck-library.column.due'](),
          ['due-desc', 'due-asc']
        )}
        {renderSortHeader(
          'created',
          t['com.affine.study.deck-library.column.created'](),
          ['created-desc', 'created-asc']
        )}
        <div className={styles.cardTableHeaderCell} role="columnheader" />
      </div>
      <div className={styles.cardTableBody} role="rowgroup">
        {rows.map(row => {
          const { deck, activeCardCount, totalCardCount, dueCount } = row;
          const expanded = expandedId === deck.id;
          const sourceDocId =
            deck.sourceDocId ?? deck.metadata?.sourcePage?.docId;

          return (
            <DeckTableRow
              key={deck.id}
              columnGrid={COLUMN_GRID}
              expanded={expanded}
              name={deck.name}
              cardsLabel={t['com.affine.study.card-count']({
                count: String(activeCardCount),
              })}
              dueLabel={formatDue(dueCount)}
              createdLabel={i18nTime(deck.createdAt, {
                absolute: { accuracy: 'day', noYear: true },
              })}
              hasDue={dueCount > 0}
              detail={
                <StudyDeckDetailPanel
                  deck={deck}
                  activeCardCount={activeCardCount}
                  totalCardCount={totalCardCount}
                  dueCount={dueCount}
                  onBrowse={() => onBrowse(deck)}
                  onReview={() => onReview(deck)}
                  onOpenSource={
                    sourceDocId && onOpenSource
                      ? () => onOpenSource(deck)
                      : undefined
                  }
                />
              }
              onToggleExpand={() => toggleExpanded(deck.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

const DeckTableRow = ({
  columnGrid,
  expanded,
  name,
  cardsLabel,
  dueLabel,
  createdLabel,
  hasDue,
  detail,
  onToggleExpand,
}: {
  columnGrid: string;
  expanded: boolean;
  name: string;
  cardsLabel: string;
  dueLabel: string;
  createdLabel: string;
  hasDue: boolean;
  detail: ReactNode;
  onToggleExpand: () => void;
}) => {
  const handleRowClick = (event: MouseEvent) => {
    event.preventDefault();
    onToggleExpand();
  };

  return (
    <div className={styles.cardTableRowGroup}>
      <div
        className={clsx(
          styles.cardTableRow,
          expanded && styles.cardTableRowExpanded
        )}
        style={{ gridTemplateColumns: columnGrid }}
        role="row"
        aria-expanded={expanded}
      >
        <button
          type="button"
          className={clsx(
            styles.cardTableCell,
            styles.cardTableCellButton,
            styles.cardTableQuestionCell
          )}
          onClick={handleRowClick}
        >
          <span className={styles.cardTableQuestionText}>{name}</span>
        </button>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={handleRowClick}
        >
          {cardsLabel}
        </button>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={handleRowClick}
        >
          <span className={clsx(hasDue && styles.deckTableDueHighlight)}>
            {dueLabel}
          </span>
        </button>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={handleRowClick}
        >
          {createdLabel}
        </button>
        <button
          type="button"
          className={clsx(
            styles.cardTableCell,
            styles.cardTableCellButton,
            styles.cardTableExpandCell
          )}
          onClick={handleRowClick}
          aria-label="Toggle details"
        >
          <ArrowDownSmallIcon
            className={clsx(
              styles.cardTableExpandIcon,
              expanded && styles.cardTableExpandIconOpen
            )}
          />
        </button>
      </div>
      <div
        className={clsx(
          styles.cardTableDetailWrapper,
          expanded && styles.cardTableDetailWrapperOpen
        )}
      >
        <div className={styles.cardTableDetailInner}>{detail}</div>
      </div>
    </div>
  );
};
