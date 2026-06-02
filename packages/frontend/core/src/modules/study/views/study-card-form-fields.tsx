import { Button, Input } from '@affine/component';
import { useI18n } from '@affine/i18n';

import type { CardDraft } from './study-card-draft';
import * as styles from './styles.css';

export const StudyCardFormFields = ({
  draft,
  onDraftChange,
}: {
  draft: CardDraft;
  onDraftChange: (updater: (current: CardDraft) => CardDraft) => void;
}) => {
  const t = useI18n();

  return (
    <div className={styles.formGrid}>
      <div className={styles.toggleRow}>
        <Button
          variant={draft.type === 'recall' ? 'primary' : 'plain'}
          onClick={() =>
            onDraftChange(current => ({ ...current, type: 'recall' }))
          }
        >
          {t['com.affine.study.card-type.recall']()}
        </Button>
        <Button
          variant={draft.type === 'synthesis' ? 'primary' : 'plain'}
          onClick={() =>
            onDraftChange(current => ({ ...current, type: 'synthesis' }))
          }
        >
          {t['com.affine.study.card-type.synthesis']()}
        </Button>
      </div>
      <Input
        value={draft.question}
        onChange={event =>
          onDraftChange(current => ({
            ...current,
            question: event.target.value,
          }))
        }
        placeholder={t['com.affine.study.card-question.placeholder']()}
      />
      <Input
        value={draft.answer}
        onChange={event =>
          onDraftChange(current => ({
            ...current,
            answer: event.target.value,
          }))
        }
        placeholder={t['com.affine.study.card-answer.placeholder']()}
      />
      <Input
        value={draft.concepts}
        onChange={event =>
          onDraftChange(current => ({
            ...current,
            concepts: event.target.value,
          }))
        }
        placeholder="Concepts (comma separated)"
      />
      <Input
        value={draft.misconceptions}
        onChange={event =>
          onDraftChange(current => ({
            ...current,
            misconceptions: event.target.value,
          }))
        }
        placeholder={t['com.affine.study.card-misconceptions.placeholder']()}
      />
      <Input
        value={draft.rubric}
        onChange={event =>
          onDraftChange(current => ({
            ...current,
            rubric: event.target.value,
          }))
        }
        placeholder={t['com.affine.study.card-rubric.placeholder']()}
      />
      <Input
        value={draft.tags}
        onChange={event =>
          onDraftChange(current => ({
            ...current,
            tags: event.target.value,
          }))
        }
        placeholder={t['com.affine.study.card-tags.placeholder']()}
      />
    </div>
  );
};
