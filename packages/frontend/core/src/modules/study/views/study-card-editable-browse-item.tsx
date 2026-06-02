import { Button, Checkbox } from '@affine/component';
import type { StudyCardContent } from '@affine/core/modules/study/entities/card';
import { useI18n } from '@affine/i18n';
import clsx from 'clsx';

import { StudyCardBrowseItem } from './study-card-browse-item';
import type { CardDraft } from './study-card-draft';
import { StudyCardFormFields } from './study-card-form-fields';
import * as styles from './styles.css';

export const StudyCardEditableBrowseItem = ({
  card,
  index,
  editing,
  draft,
  onDraftChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  onToggleSuspended,
  onViewSource,
}: {
  card: StudyCardContent;
  index: number;
  editing: boolean;
  draft: CardDraft;
  onDraftChange: (updater: (current: CardDraft) => CardDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onToggleSuspended: (active: boolean) => void;
  onViewSource?: () => void;
}) => {
  const t = useI18n();

  if (editing) {
    return (
      <article className={clsx(styles.browseCard, styles.browseCardEditing)}>
        <div className={styles.browseCardEditHeader}>
          <span className={styles.browseCardIndex}>{index + 1}</span>
          <div className={styles.browseCardEditHeaderMain}>
            <div className={styles.formTitle}>
              {t['com.affine.study.edit-card']()}
            </div>
          </div>
          <div className={styles.browseCardHeaderExtra}>
            <div className={styles.inlineActions}>
              <Checkbox
                checked={!card.suspended}
                onChange={checked => onToggleSuspended(checked)}
              />
            </div>
          </div>
        </div>
        <div className={styles.browseCardEditBody}>
          <StudyCardFormFields draft={draft} onDraftChange={onDraftChange} />
          <div className={styles.actionsRow}>
            <Button
              variant="primary"
              disabled={!draft.question.trim()}
              onClick={onSave}
            >
              {t['Save']()}
            </Button>
            <Button onClick={onCancel}>{t['Cancel']()}</Button>
            <Button onClick={onDelete}>{t['Delete']()}</Button>
          </div>
          {onViewSource ? (
            <div className={styles.browseCardFooter}>
              <Button onClick={onViewSource}>
                {t['com.affine.study.view-source']()}
              </Button>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <StudyCardBrowseItem
      index={index}
      card={card}
      onViewSource={onViewSource}
      headerExtra={
        <div className={styles.inlineActions}>
          <Checkbox
            checked={!card.suspended}
            onChange={checked => onToggleSuspended(checked)}
          />
          <Button onClick={onStartEdit}>{t['Edit']()}</Button>
          <Button onClick={onDelete}>{t['Delete']()}</Button>
        </div>
      }
    />
  );
};
