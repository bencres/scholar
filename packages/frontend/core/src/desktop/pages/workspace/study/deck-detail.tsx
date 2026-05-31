import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { StudyService } from '@affine/core/modules/study';
import { StudyCardBrowseItem } from '@affine/core/modules/study/views/study-card-browse-item';
import {
  StudyDeckHeader,
  StudyDeckHeaderActions,
} from '@affine/core/modules/study/views/study-deck-header';
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
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

export const StudyDeckDetailPage = () => {
  const t = useI18n();
  const { deckId = '' } = useParams<{ deckId: string }>();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const deck = useLiveData(studyService.deck$(deckId));
  const dueCount = useLiveData(studyService.dueCountForDeck$(deckId));

  const sourceTitle = useLiveData(
    docDisplayMetaService.title$(deck?.sourceDocId ?? '')
  );

  const activeCards = useMemo(
    () => deck?.cards.filter(card => !card.suspended) ?? [],
    [deck?.cards]
  );

  const openReview = useCallback(() => {
    if (!deck) return;
    workbench.open(`/study/review/${deck.id}`, { at: 'active' });
  }, [deck, workbench]);

  const openSourceDoc = useCallback(() => {
    if (!deck?.sourceDocId) return;
    workbench.openDoc({ docId: deck.sourceDocId, mode: 'page' });
  }, [deck?.sourceDocId, workbench]);

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
      <ViewHeader />
      <ViewBody>
        <div className={styles.pageBody}>
          <StudyDeckHeader
            deckName={deck.name}
            actions={
              <StudyDeckHeaderActions
                dueCount={dueCount}
                onReview={openReview}
              />
            }
          />
          <div className={styles.content}>
            <div className={styles.deckStats}>
              <span className={styles.deckStatPill}>
                {t['com.affine.study.card-count']({
                  count: String(activeCards.length),
                })}
              </span>
              {dueCount > 0 ? (
                <span className={styles.deckStatPill}>
                  {t['com.affine.study.due-count']({ count: String(dueCount) })}
                </span>
              ) : null}
              {deck.sourceDocId ? (
                <button
                  type="button"
                  className={styles.deckStatLink}
                  onClick={openSourceDoc}
                >
                  {t['com.affine.study.source-document']({
                    title: sourceTitle || t['Untitled'](),
                  })}
                </button>
              ) : null}
            </div>
            <div className={styles.sectionTitle}>
              {t['com.affine.study.browse-cards']()}
            </div>
            {activeCards.length === 0 ? (
              <div className={styles.emptyState}>
                {t['com.affine.study.review.empty']()}
              </div>
            ) : (
              <div className={styles.browseCardList}>
                {activeCards.map((card, index) => (
                  <StudyCardBrowseItem
                    key={card.id}
                    index={index}
                    card={card}
                    onViewSource={() =>
                      workbench.openDoc({
                        docId: card.provenance.docId,
                        mode: 'page',
                        blockIds: card.provenance.blockIds,
                      })
                    }
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

export const Component = () => <StudyDeckDetailPage />;
