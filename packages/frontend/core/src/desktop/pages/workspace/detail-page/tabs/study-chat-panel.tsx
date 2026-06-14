import { Button, Slider, Switch } from '@affine/component';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { EditorService } from '@affine/core/modules/editor';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { StudyService } from '@affine/core/modules/study';
import {
  clampStudyGenerateCardCount,
  STUDY_GENERATE_CARD_COUNT_MAX,
  STUDY_GENERATE_CARD_COUNT_MIN,
} from '@affine/core/modules/study/constants/generate-models';
import { useI18n } from '@affine/i18n';
import { FlashPanelIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { useCallback } from 'react';

import * as styles from './study-chat-panel.css';

const CARD_COUNT_NODES = Array.from(
  { length: STUDY_GENERATE_CARD_COUNT_MAX - STUDY_GENERATE_CARD_COUNT_MIN + 1 },
  (_, index) => STUDY_GENERATE_CARD_COUNT_MIN + index
);

export const StudyChatPanelDefaults = ({ docId }: { docId: string }) => {
  const t = useI18n();
  const featureFlagService = useService(FeatureFlagService);
  const studyService = useServiceOptional(StudyService);
  const editorService = useServiceOptional(EditorService);
  const workspaceDialogService = useService(WorkspaceDialogService);

  const enableStudy = useLiveData(featureFlagService.flags.enable_study.$);
  const currentMode = useLiveData(editorService?.editor.mode$);

  const defaultIncludeRecall = useLiveData(studyService?.defaultIncludeRecall$);
  const defaultIncludeSynthesis = useLiveData(
    studyService?.defaultIncludeSynthesis$
  );
  const defaultRecallCount = useLiveData(studyService?.defaultRecallCount$);
  const defaultSynthesisCount = useLiveData(
    studyService?.defaultSynthesisCount$
  );

  const onOpenGenerate = useCallback(() => {
    workspaceDialogService.open('study-generate', { docId });
  }, [docId, workspaceDialogService]);

  if (
    !enableStudy ||
    !studyService?.enabled ||
    currentMode !== 'page' ||
    defaultIncludeRecall === undefined ||
    defaultIncludeSynthesis === undefined ||
    defaultRecallCount === undefined ||
    defaultSynthesisCount === undefined
  ) {
    return null;
  }

  const recallCount = clampStudyGenerateCardCount(defaultRecallCount);
  const synthesisCount = clampStudyGenerateCardCount(defaultSynthesisCount);

  return (
    <div className={styles.root} data-testid="study-chat-panel-defaults">
      <div className={styles.header}>
        <div className={styles.title}>
          {t['com.affine.settings.study.card-generation']()}
        </div>
        <Button
          variant="primary"
          prefix={<FlashPanelIcon />}
          onClick={onOpenGenerate}
          data-testid="study-chat-panel-generate"
        >
          {t['com.affine.study.generate.title']()}
        </Button>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>
          {t['com.affine.study.synthesize.card-types.recall']()}
        </span>
        <div className={styles.rowControl}>
          <Switch
            checked={defaultIncludeRecall}
            onChange={value => studyService.setDefaultIncludeRecall(value)}
          />
          <span
            className={styles.countLabel}
            data-disabled={!defaultIncludeRecall}
          >
            {recallCount}
          </span>
          <Slider
            width={120}
            min={STUDY_GENERATE_CARD_COUNT_MIN}
            max={STUDY_GENERATE_CARD_COUNT_MAX}
            step={1}
            nodes={CARD_COUNT_NODES}
            value={[recallCount]}
            disabled={!defaultIncludeRecall}
            onValueChange={value =>
              studyService.setDefaultRecallCount(
                clampStudyGenerateCardCount(value[0] ?? 1)
              )
            }
            data-testid="study-chat-panel-recall-count"
          />
          <span
            className={styles.countSuffix}
            data-disabled={!defaultIncludeRecall}
          >
            {t['com.affine.study.synthesize.card-types.cards']()}
          </span>
        </div>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>
          {t['com.affine.study.synthesize.card-types.synthesis']()}
        </span>
        <div className={styles.rowControl}>
          <Switch
            checked={defaultIncludeSynthesis}
            onChange={value => studyService.setDefaultIncludeSynthesis(value)}
          />
          <span
            className={styles.countLabel}
            data-disabled={!defaultIncludeSynthesis}
          >
            {synthesisCount}
          </span>
          <Slider
            width={120}
            min={STUDY_GENERATE_CARD_COUNT_MIN}
            max={STUDY_GENERATE_CARD_COUNT_MAX}
            step={1}
            nodes={CARD_COUNT_NODES}
            value={[synthesisCount]}
            disabled={!defaultIncludeSynthesis}
            onValueChange={value =>
              studyService.setDefaultSynthesisCount(
                clampStudyGenerateCardCount(value[0] ?? 1)
              )
            }
            data-testid="study-chat-panel-synthesis-count"
          />
          <span
            className={styles.countSuffix}
            data-disabled={!defaultIncludeSynthesis}
          >
            {t['com.affine.study.synthesize.card-types.cards']()}
          </span>
        </div>
      </div>
    </div>
  );
};
