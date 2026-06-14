import {
  Button,
  Checkbox,
  IconButton,
  Input,
  notify,
  Switch,
} from '@affine/component';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { StudyService } from '@affine/core/modules/study';
import { StudyCardBrowseItem } from '@affine/core/modules/study/views/study-card-browse-item';
import { StudyGenerationLoading } from '@affine/core/modules/study/views/study-generation-loading';
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
import { CloseIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SelectedDocRow = ({
  docId,
  onRemove,
}: {
  docId: string;
  onRemove: () => void;
}) => {
  const t = useI18n();
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const title = useLiveData(docDisplayMetaService.title$(docId));

  return (
    <div className={styles.selectedDocItem}>
      <span>{title || docId}</span>
      <IconButton
        icon={<CloseIcon />}
        onClick={onRemove}
        aria-label={t['com.affine.study.synthesize.pages.remove']()}
      />
    </div>
  );
};

export const StudyGeneratePage = () => {
  const t = useI18n();
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const workspaceDialogService = useService(WorkspaceDialogService);
  const generationState = useLiveData(studyService.generationState$);
  const defaultIncludeRecall = useLiveData(studyService.defaultIncludeRecall$);
  const defaultIncludeSynthesis = useLiveData(
    studyService.defaultIncludeSynthesis$
  );
  const defaultRecallCount = useLiveData(studyService.defaultRecallCount$);
  const defaultSynthesisCount = useLiveData(
    studyService.defaultSynthesisCount$
  );
  const defaultGenerationFocus = useLiveData(
    studyService.defaultGenerationFocus$
  );
  const [searchParams] = useSearchParams();
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [focus, setFocus] = useState(defaultGenerationFocus ?? '');
  const [includeRecall, setIncludeRecall] = useState(defaultIncludeRecall);
  const [includeSynthesis, setIncludeSynthesis] = useState(
    defaultIncludeSynthesis
  );
  const [recallCount, setRecallCount] = useState(defaultRecallCount);
  const [synthesisCount, setSynthesisCount] = useState(defaultSynthesisCount);

  useEffect(() => {
    setIncludeRecall(defaultIncludeRecall);
  }, [defaultIncludeRecall]);

  useEffect(() => {
    setIncludeSynthesis(defaultIncludeSynthesis);
  }, [defaultIncludeSynthesis]);

  useEffect(() => {
    setRecallCount(defaultRecallCount);
  }, [defaultRecallCount]);

  useEffect(() => {
    setSynthesisCount(defaultSynthesisCount);
  }, [defaultSynthesisCount]);

  useEffect(() => {
    setFocus(defaultGenerationFocus ?? '');
  }, [defaultGenerationFocus]);

  useEffect(() => {
    const docId = searchParams.get('docId');
    if (docId) {
      setSelectedDocIds(current =>
        current.includes(docId) ? current : [...current, docId]
      );
    }
  }, [searchParams]);

  const handleAddPages = useCallback(() => {
    workspaceDialogService.open(
      'doc-selector',
      { init: selectedDocIds },
      ids => {
        if (ids !== undefined) {
          setSelectedDocIds(ids);
        }
      }
    );
  }, [selectedDocIds, workspaceDialogService]);

  const handleRemovePage = useCallback((docId: string) => {
    setSelectedDocIds(current => current.filter(id => id !== docId));
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      await studyService.generateFromDocs(
        selectedDocIds,
        (focus ?? '').trim() || undefined,
        undefined,
        {
          targetRecallCount: recallCount,
          targetSynthesisCount: synthesisCount,
          includeRecall,
          includeSynthesis,
        }
      );
    } catch (error) {
      notify.error({
        title: t['com.affine.study.synthesize.failed'](),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [
    focus,
    includeRecall,
    includeSynthesis,
    recallCount,
    selectedDocIds,
    studyService,
    synthesisCount,
    t,
  ]);

  const handleSave = useCallback(async () => {
    const deck = await studyService.savePreviewDeck();
    workbench.open(`/study/decks/${deck.id}`, { at: 'active' });
  }, [studyService, workbench]);

  const isIdle =
    generationState.status === 'idle' || generationState.status === 'error';

  return (
    <>
      <ViewTitle title={t['com.affine.study.synthesize.title']()} />
      <ViewIcon icon="study" />
      <ViewHeader>
        <StudyPageHeader title={t['com.affine.study.synthesize.title']()} />
      </ViewHeader>
      <StudyPageBody>
        {isIdle ? (
          <>
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {t['com.affine.study.synthesize.pages.title']()}
              </div>
              <div className={styles.heroSub}>
                {t['com.affine.study.synthesize.pages.subtitle']()}
              </div>
              <div className={styles.actionsRow}>
                <Button onClick={handleAddPages}>
                  {t['com.affine.study.synthesize.pages.add']()}
                </Button>
              </div>
              {selectedDocIds.length ? (
                <div className={styles.selectedDocList}>
                  {selectedDocIds.map(docId => (
                    <SelectedDocRow
                      key={docId}
                      docId={docId}
                      onRemove={() => handleRemovePage(docId)}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  {t['com.affine.study.synthesize.pages.empty']()}
                </div>
              )}
            </div>
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {t['com.affine.study.synthesize.focus.title']()}
              </div>
              <Input
                value={focus}
                onChange={setFocus}
                placeholder={t[
                  'com.affine.study.synthesize.focus.placeholder'
                ]()}
              />
            </div>
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                {t['com.affine.study.synthesize.card-types.title']()}
              </div>
              <div className={styles.formGrid}>
                <div className={styles.cardTypeRow}>
                  <Switch checked={includeRecall} onChange={setIncludeRecall} />
                  <span className={styles.cardTypeLabel}>
                    {t['com.affine.study.synthesize.card-types.recall']()}
                  </span>
                  <input
                    type="number"
                    className={styles.countInput}
                    min={1}
                    max={30}
                    value={recallCount}
                    disabled={!includeRecall}
                    onChange={e =>
                      setRecallCount(
                        Math.max(1, Math.min(30, Number(e.target.value)))
                      )
                    }
                  />
                  <span className={styles.cardTypeLabel}>
                    {t['com.affine.study.synthesize.card-types.cards']()}
                  </span>
                </div>
                <div className={styles.cardTypeRow}>
                  <Switch
                    checked={includeSynthesis}
                    onChange={setIncludeSynthesis}
                  />
                  <span className={styles.cardTypeLabel}>
                    {t['com.affine.study.synthesize.card-types.synthesis']()}
                  </span>
                  <input
                    type="number"
                    className={styles.countInput}
                    min={1}
                    max={30}
                    value={synthesisCount}
                    disabled={!includeSynthesis}
                    onChange={e =>
                      setSynthesisCount(
                        Math.max(1, Math.min(30, Number(e.target.value)))
                      )
                    }
                  />
                  <span className={styles.cardTypeLabel}>
                    {t['com.affine.study.synthesize.card-types.cards']()}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.actionsRow}>
              <Button
                variant="primary"
                disabled={!selectedDocIds.length}
                onClick={() => {
                  handleGenerate().catch(() => undefined);
                }}
              >
                {t['com.affine.study.synthesize.action']()}
              </Button>
            </div>
            {generationState.status === 'error' ? (
              <div className={styles.emptyState}>
                <div>{generationState.message}</div>
              </div>
            ) : null}
          </>
        ) : null}

        {generationState.status === 'generating' ? (
          <StudyGenerationLoading state={generationState} />
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
                    console.error('[study.synthesize] save failed', error);
                  });
                }}
              >
                {t['com.affine.study.synthesize.save']()}
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
