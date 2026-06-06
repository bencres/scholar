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
import { useLiveData, useService } from '@toeverything/infra';
import { useState } from 'react';

export const StudyTutorPage = () => {
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const decks = useLiveData(studyService.decks$);
  const tutor = studyService.adaptiveTutorSnapshot(10);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [teachBack, setTeachBack] = useState('');
  const [feedback, setFeedback] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [createdCardIds, setCreatedCardIds] = useState<string[]>([]);

  const active = tutor.queue[index];
  const activeDeckName =
    decks.find(deck => deck.id === active?.deckId)?.name ?? 'Unknown deck';

  const handleEvaluate = () => {
    if (!active) return;
    const result = studyService.evaluateTeachBack(active.cardId, teachBack);
    setScore(result.score);
    setFeedback([
      ...result.feedback,
      ...(result.missingKeywords.length
        ? [`Missing details: ${result.missingKeywords.slice(0, 4).join(', ')}`]
        : []),
    ]);
  };

  const handleCreateRemediationCard = async () => {
    if (!active) return;
    const draft = active.remediationDraft;
    const card = await studyService.createCard(
      {
        type: 'recall',
        question: draft.question,
        answer: draft.answer,
        concepts: draft.concepts,
        misconceptions: draft.misconceptions,
        tags: draft.tags,
        provenance: {
          docId: draft.provenance.docId,
          blockIds: draft.provenance.blockIds,
          chunkId: draft.provenance.chunkId,
        },
      },
      { deckIds: [draft.deckId] }
    );
    setCreatedCardIds(current => [...current, card.id]);
  };

  const goNext = () => {
    setRevealed(false);
    setTeachBack('');
    setFeedback([]);
    setScore(null);
    setIndex(current =>
      Math.min(current + 1, Math.max(0, tutor.queue.length - 1))
    );
  };

  return (
    <>
      <ViewTitle title="Adaptive tutor" />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader title="Adaptive tutor" />
      </ViewHeader>
      <StudyPageBody>
        {!active ? (
          <div className={styles.emptyState}>
            No tutor queue available yet. Add concepts and review activity
            first.
          </div>
        ) : (
          <>
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {`Tutor card ${index + 1} of ${tutor.queue.length}`}
              </div>
              <div className={styles.modeSummary}>
                <span>{`Deck: ${activeDeckName}`}</span>
                <span>{`Priority: ${Math.round(active.priorityScore * 100)}%`}</span>
                <span>{`Concepts: ${active.concepts.join(', ') || 'none'}`}</span>
                <span>{`Provenance: ${active.provenance.docId}`}</span>
              </div>
              <div className={styles.cardQuestion}>{active.question}</div>
              {revealed && active.answer ? (
                <div className={styles.cardAnswer}>{active.answer}</div>
              ) : null}
              <div className={styles.modeSummary}>
                {active.rationale.map(reason => (
                  <span key={reason}>{`- ${reason}`}</span>
                ))}
              </div>
              <div className={styles.actionsRow}>
                <Button variant="primary" onClick={() => setRevealed(true)}>
                  Reveal guidance
                </Button>
                <Button onClick={goNext}>Next tutor card</Button>
                <Button
                  onClick={() =>
                    workbench.open('/study/graph', { at: 'active' })
                  }
                >
                  View learning graph
                </Button>
              </div>
            </div>

            <div className={styles.formCard}>
              <div className={styles.formTitle}>Teach-back evaluation</div>
              <textarea
                value={teachBack}
                onChange={event => setTeachBack(event.target.value)}
                placeholder="Explain the answer in your own words."
                style={{
                  width: '100%',
                  minHeight: 120,
                  resize: 'vertical',
                }}
              />
              <div className={styles.actionsRow}>
                <Button variant="primary" onClick={handleEvaluate}>
                  Score teach-back
                </Button>
                <Button
                  onClick={() => {
                    setTeachBack('');
                    setFeedback([]);
                    setScore(null);
                  }}
                >
                  Clear
                </Button>
              </div>
              {score !== null ? (
                <div className={styles.modeSummary}>
                  <span>{`Teach-back score: ${score}/5`}</span>
                  {feedback.map(item => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={styles.formCard}>
              <div className={styles.formTitle}>Remediation loop</div>
              <div className={styles.modeSummary}>
                <span>{active.remediationDraft.question}</span>
                <span>{`Tags: ${active.remediationDraft.tags.join(', ')}`}</span>
              </div>
              <div className={styles.actionsRow}>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleCreateRemediationCard().catch(error => {
                      console.error(
                        '[study.tutor] remediation creation failed',
                        error
                      );
                    });
                  }}
                >
                  Create remediation card
                </Button>
              </div>
              {createdCardIds.length ? (
                <div className={styles.modeSummary}>
                  <span>{`Created remediation cards: ${createdCardIds.length}`}</span>
                </div>
              ) : null}
            </div>
          </>
        )}

        <div className={styles.formCard}>
          <div className={styles.formTitle}>Cross-deck synthesis drills</div>
          {tutor.synthesisDrills.length ? (
            <div className={styles.modeSummary}>
              {tutor.synthesisDrills.map(drill => (
                <span key={drill.conceptId}>
                  {`${drill.conceptLabel}: ${drill.prompt}`}
                </span>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              Add shared concepts across decks to unlock synthesis drills.
            </div>
          )}
        </div>
      </StudyPageBody>
    </>
  );
};

export const Component = () => <StudyTutorPage />;
