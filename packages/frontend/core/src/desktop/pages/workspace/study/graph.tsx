import { Button } from '@affine/component';
import { StudyService } from '@affine/core/modules/study';
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
import { useService } from '@toeverything/infra';

export const StudyGraphPage = () => {
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const graph = studyService.learningGraphSnapshot();

  return (
    <>
      <ViewTitle title="Learning graph" />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader title="Learning graph" />
      </ViewHeader>
      <StudyPageBody>
        <div className={styles.formCard}>
          <div className={styles.formTitle}>Coverage summary</div>
          <div className={styles.modeSummary}>
            <span>{`Mapped cards: ${graph.mappedCards}/${graph.totalCards}`}</span>
            <span>{`Concept nodes: ${graph.concepts.length}`}</span>
            <span>{`Concept edges: ${graph.edges.length}`}</span>
          </div>
          <div className={styles.actionsRow}>
            <Button
              onClick={() => workbench.open('/study/tutor', { at: 'active' })}
            >
              Open adaptive tutor
            </Button>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Deck coverage</div>
          {graph.coverageByDeck.length ? (
            <div className={styles.conceptGrid}>
              {graph.coverageByDeck.map(deck => (
                <div key={deck.deckId} className={styles.conceptCard}>
                  <div className={styles.conceptTitle}>{deck.deckName}</div>
                  <div className={styles.conceptMeta}>
                    {`Mapped ratio: ${Math.round(deck.mappedRatio * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Mapped cards: ${deck.mappedCards}/${deck.totalCards}`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Due mapped cards: ${deck.dueMappedCards}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No decks available.</div>
          )}
        </div>

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Concept hotspots</div>
          {graph.concepts.length ? (
            <div className={styles.conceptGrid}>
              {graph.concepts.slice(0, 12).map(concept => (
                <div key={concept.id} className={styles.conceptCard}>
                  <div className={styles.conceptTitle}>{concept.label}</div>
                  <div className={styles.conceptMeta}>
                    {`Mastery: ${Math.round(concept.mastery * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Risk: ${Math.round(concept.forgettingRisk * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Coverage: ${Math.round(concept.coverageShare * 100)}%`}
                  </div>
                  <div className={styles.conceptMeta}>
                    {`Prereq readiness: ${Math.round(
                      concept.prerequisiteReadiness * 100
                    )}%`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No mapped concepts yet.</div>
          )}
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyGraphPage />;
