import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
import { StudyDeckListItem } from '@affine/core/modules/study/views/study-deck-list-item';
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
  const dueByDeck = useLiveData(studyService.dueCountByDeck$);

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
        <div className={styles.sectionTitle}>
          {t['com.affine.study.title']()}
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.pageBody}>
          <div className={styles.content}>
            <div className={styles.hero}>
              <div className={styles.heroTitle}>
                {t['com.affine.study.title']()}
              </div>
              <div className={styles.heroSub}>
                {t['com.affine.study.hero.subtitle']()}
              </div>
              {dueCount > 0 ? (
                <div className={styles.actionsRow} style={{ marginTop: 8 }}>
                  <Button
                    variant="primary"
                    onClick={() =>
                      workbench.open('/study/review', { at: 'active' })
                    }
                  >
                    {t['com.affine.study.review-due']({
                      count: String(dueCount),
                    })}
                  </Button>
                </div>
              ) : null}
            </div>
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
                  <StudyDeckListItem
                    key={deck.id}
                    deck={deck}
                    dueCount={dueByDeck.get(deck.id) ?? 0}
                  />
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
