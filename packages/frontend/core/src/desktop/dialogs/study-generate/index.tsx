import {
  Button,
  Checkbox,
  Input,
  Modal,
  PropertyCollapsibleSection,
  PropertyName,
  PropertyRoot,
  PropertyValue,
  Scrollable,
  Slider,
  Switch,
  toast,
  useConfirmModal,
} from '@affine/component';
import { BlocksuiteHeaderTitle } from '@affine/core/blocksuite/block-suite-header/title';
import type { DialogComponentProps } from '@affine/core/modules/dialogs';
import type { WORKSPACE_DIALOG_SCHEMA } from '@affine/core/modules/dialogs/constant';
import { type Doc, DocsService } from '@affine/core/modules/doc';
import { StudyService } from '@affine/core/modules/study';
import {
  clampStudyGenerateCardCount,
  STUDY_GENERATE_CARD_COUNT_MAX,
  STUDY_GENERATE_CARD_COUNT_MIN,
  STUDY_GENERATE_MODELS,
} from '@affine/core/modules/study/constants/generate-models';
import type { StudyDeck } from '@affine/core/modules/study/entities/deck';
import { getDecksForDoc } from '@affine/core/modules/study/utils/study-storage';
import { StudyCardBrowseItem } from '@affine/core/modules/study/views/study-card-browse-item';
import { StudyGenerationLoading } from '@affine/core/modules/study/views/study-generation-loading';
import {
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { AiIcon, ExplainIcon, FlashPanelIcon } from '@blocksuite/icons/rc';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as styles from './styles.css';

const CARD_COUNT_NODES = Array.from(
  { length: STUDY_GENERATE_CARD_COUNT_MAX - STUDY_GENERATE_CARD_COUNT_MIN + 1 },
  (_, index) => STUDY_GENERATE_CARD_COUNT_MIN + index
);

export const StudyGenerateDialog = ({
  close,
  docId,
}: DialogComponentProps<WORKSPACE_DIALOG_SCHEMA['study-generate']>) => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;
  const { openConfirmModal } = useConfirmModal();
  const generationState = useLiveData(studyService.generationState$);
  const decks = useLiveData(studyService.decks$);

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
  const defaultModelId = useLiveData(studyService.generateModelId$);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [modelId, setModelId] = useState(defaultModelId);
  const [includeRecall, setIncludeRecall] = useState(defaultIncludeRecall);
  const [includeSynthesis, setIncludeSynthesis] = useState(
    defaultIncludeSynthesis
  );
  const [recallCount, setRecallCount] = useState(
    clampStudyGenerateCardCount(defaultRecallCount)
  );
  const [synthesisCount, setSynthesisCount] = useState(
    clampStudyGenerateCardCount(defaultSynthesisCount)
  );
  const [focus, setFocus] = useState(defaultGenerationFocus ?? '');
  const [savedDeck, setSavedDeck] = useState<StudyDeck | null>(null);

  const existingDecks = useMemo(
    () => (docId ? getDecksForDoc(docId, decks) : []),
    [decks, docId]
  );

  useEffect(() => {
    if (!docId) return;
    const docRef = docsService.open(docId);
    setDoc(docRef.doc);
    return () => {
      docRef.release();
      setDoc(null);
    };
  }, [docId, docsService]);

  useEffect(() => {
    setModelId(defaultModelId);
    setIncludeRecall(defaultIncludeRecall);
    setIncludeSynthesis(defaultIncludeSynthesis);
    setRecallCount(clampStudyGenerateCardCount(defaultRecallCount));
    setSynthesisCount(clampStudyGenerateCardCount(defaultSynthesisCount));
    setFocus(defaultGenerationFocus ?? '');
  }, [
    defaultGenerationFocus,
    defaultIncludeRecall,
    defaultIncludeSynthesis,
    defaultModelId,
    defaultRecallCount,
    defaultSynthesisCount,
  ]);

  const handleClose = useCallback(() => {
    if (generationState.status === 'generating') {
      return;
    }
    if (
      generationState.status === 'preview' ||
      generationState.status === 'error'
    ) {
      studyService.resetGeneration();
    }
    close();
  }, [close, generationState.status, studyService]);

  const runGenerate = useCallback(async () => {
    if (!docId || !doc) return;

    if (!includeRecall && !includeSynthesis) {
      toast(t['com.affine.study.generate.no-card-types']());
      return;
    }

    try {
      await studyService.generateFromDoc(
        doc.blockSuiteDoc,
        (focus ?? '').trim() || undefined,
        modelId,
        {
          targetRecallCount: recallCount,
          targetSynthesisCount: synthesisCount,
          includeRecall,
          includeSynthesis,
        }
      );
    } catch (error) {
      console.warn('[study.cards.generate] header modal caught error', error);
      toast(
        error instanceof Error
          ? error.message
          : t['com.affine.study.generate.failed'](),
        { duration: 10000 }
      );
    }
  }, [
    doc,
    docId,
    focus,
    includeRecall,
    includeSynthesis,
    modelId,
    recallCount,
    studyService,
    synthesisCount,
    t,
  ]);

  const handleGenerate = useCallback(() => {
    if (!docId || !doc) return;

    if (!includeRecall && !includeSynthesis) {
      toast(t['com.affine.study.generate.no-card-types']());
      return;
    }

    if (existingDecks.length) {
      const deckNames = existingDecks.map(deck => deck.name).join(', ');
      openConfirmModal({
        title: t['com.affine.study.generate.existing-deck.title'](),
        description: t['com.affine.study.generate.existing-deck.description']({
          decks: deckNames,
        }),
        cancelText: t['com.affine.confirmModal.button.cancel'](),
        confirmText: t['com.affine.study.generate.existing-deck.confirm'](),
        onConfirm: async () => {
          await runGenerate();
        },
      });
      return;
    }

    runGenerate().catch(error => {
      console.error('[study.cards.generate] modal failed', error);
      toast(
        error instanceof Error
          ? error.message
          : t['com.affine.study.generate.failed'](),
        { duration: 10000 }
      );
    });
  }, [
    doc,
    docId,
    existingDecks,
    includeRecall,
    includeSynthesis,
    openConfirmModal,
    runGenerate,
    t,
  ]);

  const handleSave = useCallback(async () => {
    try {
      const deck = await studyService.savePreviewDeck();
      setSavedDeck(deck);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : t['com.affine.study.generate.failed'](),
        { duration: 10000 }
      );
    }
  }, [studyService, t]);

  const handleViewDeck = useCallback(() => {
    if (!savedDeck) return;
    workbench.open(`/study/decks/${savedDeck.id}`, { at: 'active' });
    close();
  }, [close, savedDeck, workbench]);

  const isGenerating = generationState.status === 'generating';
  const isPreview = generationState.status === 'preview';
  const isIdle =
    generationState.status === 'idle' || generationState.status === 'error';
  const showForm = isIdle && !savedDeck;
  const modalWide = isPreview || savedDeck;

  if (!doc || !docId) return null;

  return (
    <FrameworkScope scope={doc.scope}>
      <Modal
        contentOptions={{
          className: modalWide ? styles.containerWide : styles.container,
        }}
        open
        onOpenChange={open => {
          if (!open) {
            handleClose();
          }
        }}
        withoutCloseButton={isGenerating}
        persistent={isGenerating}
      >
        <Scrollable.Root>
          <Scrollable.Viewport
            className={styles.viewport}
            data-testid="study-generate-modal"
          >
            <div
              className={styles.titleContainer}
              data-testid="study-generate-modal-title"
            >
              <BlocksuiteHeaderTitle className={styles.titleStyle} />
            </div>

            {savedDeck ? (
              <div
                className={styles.savedState}
                data-testid="study-generate-saved"
              >
                <div className={styles.savedTitle}>
                  {t['com.affine.study.generate.saved.title']()}
                </div>
                <WorkbenchLink
                  to={`/study/decks/${savedDeck.id}`}
                  className={styles.savedDeckLink}
                  onClick={() => close()}
                >
                  {savedDeck.name}
                </WorkbenchLink>
                <div className={styles.actions}>
                  <Button variant="primary" onClick={handleViewDeck}>
                    {t['com.affine.study.generate.view-deck']()}
                  </Button>
                  <Button onClick={() => close()}>{t['Done']()}</Button>
                </div>
              </div>
            ) : null}

            {showForm ? (
              <>
                <PropertyCollapsibleSection
                  title={t['com.affine.study.generate.modal.section']()}
                >
                  <div className={styles.formSection}>
                    <PropertyRoot>
                      <PropertyName
                        name={t['com.affine.settings.study.model.name']()}
                        icon={<AiIcon />}
                      />
                      <PropertyValue>
                        <select
                          className={styles.modelSelect}
                          value={modelId}
                          onChange={event => setModelId(event.target.value)}
                          data-testid="study-generate-model-select"
                        >
                          {STUDY_GENERATE_MODELS.map(model => (
                            <option key={model.id} value={model.id}>
                              {t[model.labelKey]()}
                            </option>
                          ))}
                        </select>
                      </PropertyValue>
                    </PropertyRoot>
                    <PropertyRoot>
                      <PropertyName
                        name={t[
                          'com.affine.study.synthesize.card-types.recall'
                        ]()}
                        icon={<FlashPanelIcon />}
                      />
                      <PropertyValue>
                        <div className={styles.cardTypeControl}>
                          <Switch
                            checked={includeRecall}
                            onChange={setIncludeRecall}
                          />
                          <span
                            className={styles.countLabel}
                            data-disabled={!includeRecall}
                          >
                            {recallCount}
                          </span>
                          <Slider
                            width={160}
                            min={STUDY_GENERATE_CARD_COUNT_MIN}
                            max={STUDY_GENERATE_CARD_COUNT_MAX}
                            step={1}
                            nodes={CARD_COUNT_NODES}
                            value={[recallCount]}
                            disabled={!includeRecall}
                            onValueChange={value =>
                              setRecallCount(
                                clampStudyGenerateCardCount(value[0] ?? 1)
                              )
                            }
                            data-testid="study-generate-recall-count"
                          />
                          <span
                            className={styles.countSuffix}
                            data-disabled={!includeRecall}
                          >
                            {t[
                              'com.affine.study.synthesize.card-types.cards'
                            ]()}
                          </span>
                        </div>
                      </PropertyValue>
                    </PropertyRoot>
                    <PropertyRoot>
                      <PropertyName
                        name={t[
                          'com.affine.study.synthesize.card-types.synthesis'
                        ]()}
                        icon={<ExplainIcon />}
                      />
                      <PropertyValue>
                        <div className={styles.cardTypeControl}>
                          <Switch
                            checked={includeSynthesis}
                            onChange={setIncludeSynthesis}
                          />
                          <span
                            className={styles.countLabel}
                            data-disabled={!includeSynthesis}
                          >
                            {synthesisCount}
                          </span>
                          <Slider
                            width={160}
                            min={STUDY_GENERATE_CARD_COUNT_MIN}
                            max={STUDY_GENERATE_CARD_COUNT_MAX}
                            step={1}
                            nodes={CARD_COUNT_NODES}
                            value={[synthesisCount]}
                            disabled={!includeSynthesis}
                            onValueChange={value =>
                              setSynthesisCount(
                                clampStudyGenerateCardCount(value[0] ?? 1)
                              )
                            }
                            data-testid="study-generate-synthesis-count"
                          />
                          <span
                            className={styles.countSuffix}
                            data-disabled={!includeSynthesis}
                          >
                            {t[
                              'com.affine.study.synthesize.card-types.cards'
                            ]()}
                          </span>
                        </div>
                      </PropertyValue>
                    </PropertyRoot>
                    <PropertyRoot>
                      <PropertyName
                        name={t['com.affine.study.synthesize.focus.title']()}
                        icon={<ExplainIcon />}
                      />
                      <PropertyValue>
                        <Input
                          className={styles.focusInput}
                          value={focus}
                          onChange={setFocus}
                          placeholder={t[
                            'com.affine.study.synthesize.focus.placeholder'
                          ]()}
                          data-testid="study-generate-focus-input"
                        />
                      </PropertyValue>
                    </PropertyRoot>
                  </div>
                </PropertyCollapsibleSection>
                {generationState.status === 'error' ? (
                  <div className={styles.errorState}>
                    {generationState.message}
                  </div>
                ) : null}
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    data-testid="study-generate-submit"
                  >
                    {t['com.affine.study.synthesize.action']()}
                  </Button>
                </div>
              </>
            ) : null}

            {isGenerating ? (
              <StudyGenerationLoading state={generationState} />
            ) : null}

            {isPreview ? (
              <>
                <div className={styles.previewTitle}>
                  {generationState.output.deckName}
                </div>
                <div className={styles.previewList}>
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
                            studyService.setPreviewCardAccepted(
                              card.id,
                              checked
                            )
                          }
                        />
                      }
                    />
                  ))}
                </div>
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleSave().catch(error => {
                        console.error(
                          '[study.cards.generate] save failed',
                          error
                        );
                      });
                    }}
                    data-testid="study-generate-save"
                  >
                    {t['com.affine.study.generate.save']()}
                  </Button>
                  <Button onClick={() => studyService.resetGeneration()}>
                    {t['Cancel']()}
                  </Button>
                </div>
              </>
            ) : null}
          </Scrollable.Viewport>
          <Scrollable.Scrollbar className={styles.scrollBar} />
        </Scrollable.Root>
      </Modal>
    </FrameworkScope>
  );
};
