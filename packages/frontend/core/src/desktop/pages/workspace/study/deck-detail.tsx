import { StudyService } from '@affine/core/modules/study';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useParams } from 'react-router-dom';

import { Button } from '@affine/component';

export const StudyDeckDetailPage = () => {
  const t = useI18n();
  const { deckId = '' } = useParams<{ deckId: string }>();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const deck = useLiveData(studyService.deck$(deckId));

  if (!deck) {
    return (
      <ViewBody>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            {t['com.affine.study.deck-not-found']()}
          </div>
        </div>
      </ViewBody>
    );
  }

  return (
    <>
      <ViewTitle title={deck.name} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <div className={styles.sectionTitle}>{deck.name}</div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.content}>
            <div className={styles.actionsRow}>
              <Button
                variant="primary"
                onClick={() =>
                  workbench.open(`/study/review/${deck.id}`, { at: 'active' })
                }
              >
                {t['com.affine.study.review']()}
              </Button>
            </div>
            <div className={styles.previewGrid}>
              {deck.cards.map(card => (
                <div key={card.id} className={styles.previewItem}>
                  <div className={styles.cardLabel}>{card.type}</div>
                  <div className={styles.cardQuestion}>{card.question}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <StudyDeckDetailPage />;
