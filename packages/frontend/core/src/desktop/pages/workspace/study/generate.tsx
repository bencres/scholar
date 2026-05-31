import { Button, Checkbox } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import { StudyCardBrowseItem } from '@affine/core/modules/study/views/study-card-browse-item';
import {
  StudyPageBody,
  StudyPageHeader,
} from '@affine/core/modules/study/views/study-page-shell';
import * as styles from '@affine/core/modules/study/views/styles.css';
import {
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

export const StudyGeneratePage = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const generationState = useLiveData(studyService.generationState$);

  const handleSave = useCallback(async () => {
    const deck = await studyService.savePreviewDeck();
    workbench.open(`/study/decks/${deck.id}`, { at: 'active' });
  }, [studyService, workbench]);

  return (
    <>
      <ViewTitle title={t['com.affine.study.generate.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <StudyPageHeader title={t['com.affine.study.generate.title']()} />
      </ViewHeader>
      <StudyPageBody>
        {generationState.status === 'generating' ? (
          <div className={styles.emptyState}>
            {t['com.affine.study.generate.loading']()}
          </div>
        ) : null}
        {generationState.status === 'error' ? (
          <div className={styles.emptyState}>
            <div>{generationState.message}</div>
            {generationState.rawResponse ? (
              <pre className={styles.debugResponse}>
                {generationState.rawResponse}
              </pre>
            ) : null}
          </div>
        ) : null}
        {generationState.status === 'preview' ? (
          <>
            <div className={styles.sectionTitle}>
              {generationState.output.deckName}
            </div>
            <div className={styles.browseCardList}>
              {generationState.cards.map((card, index) => (
                <StudyCardBrowseItem
                  key={card.id}
                  index={index}
                  card={card}
                  defaultExpanded
                  headerExtra={
                    <Checkbox
                      checked={card.accepted}
                      onChange={checked =>
                        studyService.setPreviewCardAccepted(card.id, checked)
                      }
                    />
                  }
                />
              ))}
            </div>
            <div className={styles.actionsRow}>
              <Button
                variant="primary"
                onClick={() => {
                  handleSave().catch(error => {
                    console.error('[study.generate] save failed', error);
                  });
                }}
              >
                {t['com.affine.study.generate.save']()}
              </Button>
              <Button onClick={() => studyService.resetGeneration()}>
                {t['Cancel']()}
              </Button>
            </div>
          </>
        ) : null}
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyGeneratePage />;
