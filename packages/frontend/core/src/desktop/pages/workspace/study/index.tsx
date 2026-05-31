import { Button, Input } from '@affine/component';
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
import { useMemo, useState } from 'react';

export const StudyHome = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const decks = useLiveData(studyService.decks$);
  const dueCount = useLiveData(studyService.dueCount$);
  const dueByDeck = useLiveData(studyService.dueCountByDeck$);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckTags, setDeckTags] = useState('');
  const learningGraph = studyService.learningGraphSnapshot();
  const weakestConcepts = useMemo(
    () => learningGraph.concepts.slice(0, 5),
    [learningGraph.concepts]
  );

  const canCreateDeck = deckName.trim().length > 0;

  const handleCreateDeck = async () => {
    if (!canCreateDeck) return;
    const deck = await studyService.createDeck({
      name: deckName,
      metadata: {
        description: deckDescription,
        tags: deckTags
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      },
    });
    setDeckName('');
    setDeckDescription('');
    setDeckTags('');
    workbench.open(`/study/decks/${deck.id}`, { at: 'active' });
  };

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
              <div className={styles.modeGrid}>
                <Button
                  onClick={() =>
                    workbench.open('/study/flashcards', { at: 'active' })
                  }
                >
                  {t['com.affine.study.flashcards.title']()}
                </Button>
                <Button
                  onClick={() =>
                    workbench.open('/study/learn', { at: 'active' })
                  }
                >
                  {t['com.affine.study.learn.title']()}
                </Button>
                <Button
                  onClick={() =>
                    workbench.open('/study/test', { at: 'active' })
                  }
                >
                  {t['com.affine.study.test.title']()}
                </Button>
                <Button
                  onClick={() =>
                    workbench.open('/study/graph', { at: 'active' })
                  }
                >
                  Learning graph
                </Button>
                <Button
                  onClick={() =>
                    workbench.open('/study/tutor', { at: 'active' })
                  }
                >
                  Adaptive tutor
                </Button>
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
            <div className={styles.formCard}>
              <div className={styles.formTitle}>Learning graph overview</div>
              <div className={styles.modeSummary}>
                <span>
                  {`Mapped cards: ${learningGraph.mappedCards}/${learningGraph.totalCards}`}
                </span>
                <span>{`Concept links: ${learningGraph.edges.length}`}</span>
              </div>
              {weakestConcepts.length ? (
                <div className={styles.conceptGrid}>
                  {weakestConcepts.map(concept => (
                    <div key={concept.id} className={styles.conceptCard}>
                      <div className={styles.conceptTitle}>{concept.label}</div>
                      <div className={styles.conceptMeta}>
                        {`Mastery: ${Math.round(concept.mastery * 100)}%`}
                      </div>
                      <div className={styles.conceptMeta}>
                        {`Risk: ${Math.round(concept.forgettingRisk * 100)}%`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>No mapped concepts yet.</div>
              )}
            </div>
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {t['com.affine.study.create-deck']()}
              </div>
              <div className={styles.formGrid}>
                <Input
                  value={deckName}
                  onChange={event => setDeckName(event.target.value)}
                  placeholder={t['com.affine.study.deck-name.placeholder']()}
                />
                <Input
                  value={deckDescription}
                  onChange={event => setDeckDescription(event.target.value)}
                  placeholder={t[
                    'com.affine.study.deck-description.placeholder'
                  ]()}
                />
                <Input
                  value={deckTags}
                  onChange={event => setDeckTags(event.target.value)}
                  placeholder={t['com.affine.study.deck-tags.placeholder']()}
                />
              </div>
              <div className={styles.actionsRow}>
                <Button
                  variant="primary"
                  disabled={!canCreateDeck}
                  onClick={() => {
                    handleCreateDeck().catch(error => {
                      console.error('[study.home] create deck failed', error);
                    });
                  }}
                >
                  {t['com.affine.study.create-deck']()}
                </Button>
                <Button
                  onClick={() =>
                    workbench.open('/study/generate', { at: 'active' })
                  }
                >
                  {t['com.affine.study.generate.title']()}
                </Button>
              </div>
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
