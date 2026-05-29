import { Button, Checkbox } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

import * as styles from '@affine/core/modules/study/views/styles.css';

export const StudyGeneratePage = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const generationState = useLiveData(studyService.generationState$);

  const handleSave = useCallback(async () => {
    const deck = await studyService.savePreviewDeck();
    workbench.open(`/study/review/${deck.id}`, { at: 'active' });
  }, [studyService, workbench]);

  return (
    <>
      <ViewTitle title={t['com.affine.study.generate.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <div className={styles.sectionTitle}>
          {t['com.affine.study.generate.title']()}
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.content}>
            {generationState.status === 'generating' ? (
              <div className={styles.emptyState}>
                {t['com.affine.study.generate.loading']()}
              </div>
            ) : null}
            {generationState.status === 'error' ? (
              <div className={styles.emptyState}>{generationState.message}</div>
            ) : null}
            {generationState.status === 'preview' ? (
              <>
                <div className={styles.sectionTitle}>
                  {generationState.output.deckName}
                </div>
                <div className={styles.previewGrid}>
                  {generationState.cards.map(card => (
                    <div key={card.id} className={styles.previewItem}>
                      <div className={styles.previewHeader}>
                        <span className={styles.cardLabel}>{card.type}</span>
                        <Checkbox
                          checked={card.accepted}
                          onChange={checked =>
                            studyService.setPreviewCardAccepted(
                              card.id,
                              checked
                            )
                          }
                        />
                      </div>
                      <div className={styles.cardQuestion}>{card.question}</div>
                      {card.type === 'recall' && card.answer ? (
                        <div className={styles.cardAnswer}>{card.answer}</div>
                      ) : null}
                      {card.type === 'synthesis' && card.rubric ? (
                        <ul>
                          {card.rubric.map(item => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className={styles.actionsRow}>
                  <Button variant="primary" onClick={handleSave}>
                    {t['com.affine.study.generate.save']()}
                  </Button>
                  <Button onClick={() => studyService.resetGeneration()}>
                    {t['Cancel']()}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <StudyGeneratePage />;
