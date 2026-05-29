import { Button } from '@affine/component';
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

export const StudyHome = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const decks = useLiveData(studyService.decks$);
  const dueCount = useLiveData(studyService.dueCount$);

  if (!studyService.enabled) {
    return (
      <ViewBody>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            {t['com.affine.study.disabled']()}
          </div>
        </div>
      </ViewBody>
    );
  }

  return (
    <>
      <ViewTitle title={t['com.affine.study.title']()} />
      <ViewIcon icon="today" />
      <ViewHeader>
        <div className={styles.sectionTitle}>{t['com.affine.study.title']()}</div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.content}>
            {dueCount > 0 ? (
              <div className={styles.actionsRow}>
                <Button
                  variant="primary"
                  onClick={() => workbench.open('/study/review', { at: 'active' })}
                >
                  {t['com.affine.study.review-due']({ count: String(dueCount) })}
                </Button>
              </div>
            ) : null}
            <div className={styles.sectionTitle}>
              {t['com.affine.study.decks']()}
            </div>
            {decks.length === 0 ? (
              <div className={styles.emptyState}>
                {t['com.affine.study.empty-decks']()}
              </div>
            ) : (
              <div className={styles.deckList}>
                {decks.map(deck => (
                  <div key={deck.id} className={styles.deckItem}>
                    <div className={styles.deckMeta}>
                      <div className={styles.deckName}>{deck.name}</div>
                      <div className={styles.deckSub}>
                        {t['com.affine.study.card-count']({
                          count: String(deck.cards.length),
                        })}
                      </div>
                    </div>
                    <div className={styles.actionsRow}>
                      <Button
                        onClick={() =>
                          workbench.open(`/study/review/${deck.id}`, {
                            at: 'active',
                          })
                        }
                      >
                        {t['com.affine.study.review']()}
                      </Button>
                      <Button
                        onClick={() =>
                          workbench.open(`/study/decks/${deck.id}`, {
                            at: 'active',
                          })
                        }
                      >
                        {t['com.affine.study.view-deck']()}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => <StudyHome />;
