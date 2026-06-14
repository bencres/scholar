import {
  Button,
  Input,
  Modal,
  PropertyCollapsibleSection,
  PropertyName,
  PropertyRoot,
  PropertyValue,
  Scrollable,
  Switch,
  toast,
} from '@affine/component';
import { BlocksuiteHeaderTitle } from '@affine/core/blocksuite/block-suite-header/title';
import type { DialogComponentProps } from '@affine/core/modules/dialogs';
import type { WORKSPACE_DIALOG_SCHEMA } from '@affine/core/modules/dialogs/constant';
import { type Doc, DocsService } from '@affine/core/modules/doc';
import { StudyService } from '@affine/core/modules/study';
import { STUDY_GENERATE_MODELS } from '@affine/core/modules/study/constants/generate-models';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { AiIcon, ExplainIcon, FlashPanelIcon } from '@blocksuite/icons/rc';
import { FrameworkScope, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useState } from 'react';

import * as styles from './styles.css';

export const StudyGenerateDialog = ({
  close,
  docId,
}: DialogComponentProps<WORKSPACE_DIALOG_SCHEMA['study-generate']>) => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const studyService = useService(StudyService);
  const workbench = useService(WorkbenchService).workbench;

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
  const [recallCount, setRecallCount] = useState(defaultRecallCount);
  const [synthesisCount, setSynthesisCount] = useState(defaultSynthesisCount);
  const [focus, setFocus] = useState(defaultGenerationFocus);
  const [generating, setGenerating] = useState(false);

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
    setRecallCount(defaultRecallCount);
    setSynthesisCount(defaultSynthesisCount);
    setFocus(defaultGenerationFocus);
  }, [
    defaultGenerationFocus,
    defaultIncludeRecall,
    defaultIncludeSynthesis,
    defaultModelId,
    defaultRecallCount,
    defaultSynthesisCount,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!docId || !doc) return;

    const store = doc.blockSuiteDoc.getStore({ id: docId });
    if (!store) {
      toast(t['com.affine.study.generate.failed']());
      return;
    }

    if (!includeRecall && !includeSynthesis) {
      toast(t['com.affine.study.generate.no-card-types']());
      return;
    }

    setGenerating(true);
    close();

    try {
      await studyService.generateFromDoc(
        store,
        focus.trim() || undefined,
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
    } finally {
      setGenerating(false);
      workbench.open(`/study/synthesize?docId=${docId}`, { at: 'active' });
    }
  }, [
    close,
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
    workbench,
  ]);

  if (!doc || !docId) return null;

  return (
    <FrameworkScope scope={doc.scope}>
      <Modal
        contentOptions={{
          className: styles.container,
        }}
        open
        onOpenChange={() => close()}
        withoutCloseButton
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
                    name={t['com.affine.study.synthesize.card-types.recall']()}
                    icon={<FlashPanelIcon />}
                  />
                  <PropertyValue>
                    <div className={styles.cardTypeControl}>
                      <Switch
                        checked={includeRecall}
                        onChange={setIncludeRecall}
                      />
                      <input
                        type="number"
                        className={styles.countInput}
                        min={1}
                        max={30}
                        value={recallCount}
                        disabled={!includeRecall}
                        onChange={event =>
                          setRecallCount(
                            Math.max(
                              1,
                              Math.min(30, Number(event.target.value))
                            )
                          )
                        }
                        data-testid="study-generate-recall-count"
                      />
                      <span>
                        {t['com.affine.study.synthesize.card-types.cards']()}
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
                      <input
                        type="number"
                        className={styles.countInput}
                        min={1}
                        max={30}
                        value={synthesisCount}
                        disabled={!includeSynthesis}
                        onChange={event =>
                          setSynthesisCount(
                            Math.max(
                              1,
                              Math.min(30, Number(event.target.value))
                            )
                          )
                        }
                        data-testid="study-generate-synthesis-count"
                      />
                      <span>
                        {t['com.affine.study.synthesize.card-types.cards']()}
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
            <div className={styles.actions}>
              <Button
                variant="primary"
                disabled={generating}
                onClick={() => {
                  handleGenerate().catch(error => {
                    console.error('[study.cards.generate] modal failed', error);
                  });
                }}
                data-testid="study-generate-submit"
              >
                {t['com.affine.study.synthesize.action']()}
              </Button>
            </div>
          </Scrollable.Viewport>
          <Scrollable.Scrollbar className={styles.scrollBar} />
        </Scrollable.Root>
      </Modal>
    </FrameworkScope>
  );
};
