import { Loading, Progress } from '@affine/component';
import {
  getStudyGenerationProgress,
  type StudyGenerationStage,
  type StudyGenerationState,
} from '@affine/core/modules/study/services/study-command';
import { useI18n } from '@affine/i18n';

import * as styles from './styles.css';

const STAGE_MESSAGE_KEYS: Record<
  StudyGenerationStage,
  | 'com.affine.study.synthesize.loading.preparing'
  | 'com.affine.study.synthesize.loading.generating'
  | 'com.affine.study.synthesize.loading.parsing'
  | 'com.affine.study.synthesize.loading.validating'
> = {
  preparing: 'com.affine.study.synthesize.loading.preparing',
  generating: 'com.affine.study.synthesize.loading.generating',
  parsing: 'com.affine.study.synthesize.loading.parsing',
  validating: 'com.affine.study.synthesize.loading.validating',
};

export const StudyGenerationLoading = ({
  state,
}: {
  state: Extract<StudyGenerationState, { status: 'generating' }>;
}) => {
  const t = useI18n();
  const progress = getStudyGenerationProgress(state);

  return (
    <div
      className={styles.generationLoading}
      data-testid="study-generation-loading"
    >
      <Loading size={32} />
      <div className={styles.generationLoadingMessage}>
        {t[STAGE_MESSAGE_KEYS[state.stage]]()}
      </div>
      <Progress
        className={styles.generationLoadingProgress}
        readonly
        value={progress}
        testId="study-generation-progress"
      />
    </div>
  );
};
