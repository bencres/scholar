import { Checkbox } from '@affine/component';
import type {
  CardState,
  StudyCardContent,
  StudyCardScheduling,
} from '@affine/core/modules/study/entities/card';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { i18nTime, useI18n } from '@affine/i18n';
import { ArrowDownSmallIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { type ReactNode, useCallback, useMemo } from 'react';

import { StudyCardDetailPanel } from './study-card-detail-panel';
import * as styles from './styles.css';

export type CardSort =
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'updated-asc'
  | 'due-asc'
  | 'due-desc'
  | 'type'
  | 'question-asc'
  | 'question-desc';

type SortableColumn = 'question' | 'type' | 'due' | 'updated' | 'created';

const COLUMN_GRID = '36px 72px minmax(180px, 1fr) 120px 88px 88px 72px 32px';

export const StudyCardTable = ({
  cards,
  decksByCardId,
  schedulingByCard,
  sort,
  onSortChange,
  expandedId,
  onExpandedChange,
  selectedIds,
  onSelectedChange,
  onEdit,
  onDelete,
  onToggleSuspended,
  onViewSource,
}: {
  cards: StudyCardContent[];
  decksByCardId: Map<string, StudyDeck[]>;
  schedulingByCard: Map<string, StudyCardScheduling>;
  sort: CardSort;
  onSortChange: (sort: CardSort) => void;
  expandedId: string | null;
  onExpandedChange: (cardId: string | null) => void;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onEdit: (card: StudyCardContent) => void;
  onDelete: (card: StudyCardContent) => void;
  onToggleSuspended: (card: StudyCardContent, active: boolean) => void;
  onViewSource?: (card: StudyCardContent) => void;
}) => {
  const t = useI18n();

  const allSelected =
    cards.length > 0 && cards.every(card => selectedIds.has(card.id));
  const someSelected = cards.some(card => selectedIds.has(card.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectedChange(new Set());
      return;
    }
    onSelectedChange(new Set(cards.map(card => card.id)));
  }, [allSelected, cards, onSelectedChange]);

  const toggleSelect = useCallback(
    (cardId: string) => {
      onSelectedChange(
        (() => {
          const next = new Set(selectedIds);
          if (next.has(cardId)) next.delete(cardId);
          else next.add(cardId);
          return next;
        })()
      );
    },
    [onSelectedChange, selectedIds]
  );

  const toggleExpanded = useCallback(
    (cardId: string) => {
      onExpandedChange(expandedId === cardId ? null : cardId);
    },
    [expandedId, onExpandedChange]
  );

  const handleSortColumn = useCallback(
    (column: SortableColumn) => {
      const toggles: Record<SortableColumn, [CardSort, CardSort]> = {
        question: ['question-asc', 'question-desc'],
        type: ['type', 'type'],
        due: ['due-asc', 'due-desc'],
        updated: ['updated-desc', 'updated-asc'],
        created: ['created-desc', 'created-asc'],
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
        'question-asc': 'asc',
        'question-desc': 'desc',
        'due-asc': 'asc',
        'due-desc': 'desc',
        'updated-desc': 'desc',
        'updated-asc': 'asc',
        'created-desc': 'desc',
        'created-asc': 'asc',
      }) as Partial<Record<CardSort, 'asc' | 'desc'>>,
    []
  );

  const renderSortHeader = (
    column: SortableColumn,
    label: string,
    activeSorts: CardSort[]
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

  const stateLabels: Record<CardState, string> = {
    new: t['com.affine.study.card-library.state.new'](),
    learning: t['com.affine.study.card-library.state.learning'](),
    review: t['com.affine.study.card-library.state.review'](),
    relearning: t['com.affine.study.card-library.state.relearning'](),
  };

  const formatDue = (due?: number) => {
    if (due === undefined) return t['com.affine.study.card-library.due.none']();
    return i18nTime(due, {
      relative: { max: [2, 'day'], yesterdayAndTomorrow: true },
      absolute: { accuracy: 'day', noYear: true },
    });
  };

  const formatDecks = (memberships: StudyDeck[]) => {
    if (memberships.length === 0) {
      return t['com.affine.study.card-unassigned']();
    }
    if (memberships.length === 1) return memberships[0].name;
    return t['com.affine.study.card-library.deck-count']({
      count: String(memberships.length),
    });
  };

  return (
    <div className={styles.cardTable}>
      <div
        className={styles.cardTableHeader}
        style={{ gridTemplateColumns: COLUMN_GRID }}
        role="row"
      >
        <div className={styles.cardTableHeaderCell} role="columnheader">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && someSelected}
            onChange={toggleSelectAll}
            aria-label={t['com.affine.study.card-library.select-all']()}
          />
        </div>
        {renderSortHeader(
          'type',
          t['com.affine.study.card-library.column.type'](),
          ['type']
        )}
        {renderSortHeader(
          'question',
          t['com.affine.study.card-library.column.question'](),
          ['question-asc', 'question-desc']
        )}
        <div className={styles.cardTableHeaderCell} role="columnheader">
          {t['com.affine.study.card-library.column.decks']()}
        </div>
        {renderSortHeader(
          'due',
          t['com.affine.study.card-library.column.due'](),
          ['due-asc', 'due-desc']
        )}
        <div className={styles.cardTableHeaderCell} role="columnheader">
          {t['com.affine.study.card-library.column.state']()}
        </div>
        <div className={styles.cardTableHeaderCell} role="columnheader">
          {t['com.affine.study.card-library.column.status']()}
        </div>
        <div className={styles.cardTableHeaderCell} role="columnheader" />
      </div>
      <div className={styles.cardTableBody} role="rowgroup">
        {cards.map(card => {
          const memberships = decksByCardId.get(card.id) ?? [];
          const scheduling = schedulingByCard.get(card.id);
          const expanded = expandedId === card.id;
          const selected = selectedIds.has(card.id);
          const typeLabel =
            card.type === 'recall'
              ? t['com.affine.study.card-type.recall']()
              : t['com.affine.study.card-type.synthesis']();

          return (
            <CardTableRow
              key={card.id}
              card={card}
              columnGrid={COLUMN_GRID}
              expanded={expanded}
              selected={selected}
              typeLabel={typeLabel}
              decksLabel={formatDecks(memberships)}
              dueLabel={formatDue(scheduling?.due)}
              stateLabel={
                scheduling ? stateLabels[scheduling.state] : undefined
              }
              statusLabel={
                card.suspended
                  ? t['com.affine.study.card-library.filter.status.suspended']()
                  : t['com.affine.study.card-library.filter.status.active']()
              }
              detail={
                <StudyCardDetailPanel
                  card={card}
                  decks={memberships}
                  schedulingState={scheduling?.state}
                  due={scheduling?.due}
                  onEdit={() => onEdit(card)}
                  onDelete={() => onDelete(card)}
                  onToggleSuspended={active => onToggleSuspended(card, active)}
                  onViewSource={
                    onViewSource && card.provenance.docId !== 'manual'
                      ? () => onViewSource(card)
                      : undefined
                  }
                />
              }
              onToggleSelect={() => toggleSelect(card.id)}
              onToggleExpand={() => toggleExpanded(card.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

const CardTableRow = ({
  card,
  columnGrid,
  expanded,
  selected,
  typeLabel,
  decksLabel,
  dueLabel,
  stateLabel,
  statusLabel,
  detail,
  onToggleSelect,
  onToggleExpand,
}: {
  card: StudyCardContent;
  columnGrid: string;
  expanded: boolean;
  selected: boolean;
  typeLabel: string;
  decksLabel: string;
  dueLabel: string;
  stateLabel?: string;
  statusLabel: string;
  detail: ReactNode;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}) => {
  return (
    <div className={styles.cardTableRowGroup}>
      <div
        className={clsx(
          styles.cardTableRow,
          expanded && styles.cardTableRowExpanded,
          selected && styles.cardTableRowSelected,
          card.suspended && styles.cardTableRowSuspended
        )}
        style={{ gridTemplateColumns: columnGrid }}
        role="row"
        aria-expanded={expanded}
      >
        <div
          className={styles.cardTableCell}
          role="cell"
          onClick={event => event.stopPropagation()}
        >
          <Checkbox checked={selected} onChange={onToggleSelect} />
        </div>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={onToggleExpand}
        >
          <span className={styles.cardTypeBadge}>{typeLabel}</span>
        </button>
        <button
          type="button"
          className={clsx(
            styles.cardTableCell,
            styles.cardTableCellButton,
            styles.cardTableQuestionCell
          )}
          onClick={onToggleExpand}
        >
          <span className={styles.cardTableQuestionText}>{card.question}</span>
        </button>
        <button
          type="button"
          className={clsx(
            styles.cardTableCell,
            styles.cardTableCellButton,
            styles.cardTableDecksCell
          )}
          onClick={onToggleExpand}
        >
          {decksLabel}
        </button>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={onToggleExpand}
        >
          {dueLabel}
        </button>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={onToggleExpand}
        >
          {stateLabel ?? '—'}
        </button>
        <button
          type="button"
          className={clsx(styles.cardTableCell, styles.cardTableCellButton)}
          onClick={onToggleExpand}
        >
          <span
            className={clsx(
              styles.cardTableStatusBadge,
              card.suspended && styles.cardTableStatusSuspended
            )}
          >
            {statusLabel}
          </span>
        </button>
        <button
          type="button"
          className={clsx(
            styles.cardTableCell,
            styles.cardTableCellButton,
            styles.cardTableExpandCell
          )}
          onClick={onToggleExpand}
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
