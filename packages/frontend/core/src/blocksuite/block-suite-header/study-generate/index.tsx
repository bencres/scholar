import { IconButton } from '@affine/component';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { EditorService } from '@affine/core/modules/editor';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { StudyService } from '@affine/core/modules/study';
import { useI18n } from '@affine/i18n';
import { FlashPanelIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { useCallback } from 'react';

export const StudyGenerateButton = ({ docId }: { docId: string }) => {
  const t = useI18n();
  const workspaceDialogService = useService(WorkspaceDialogService);
  const featureFlagService = useService(FeatureFlagService);
  const studyService = useServiceOptional(StudyService);
  const editorService = useService(EditorService);
  const enableStudy = useLiveData(featureFlagService.flags.enable_study.$);
  const currentMode = useLiveData(editorService.editor.mode$);

  const onOpenStudyGenerateModal = useCallback(() => {
    workspaceDialogService.open('study-generate', { docId });
  }, [docId, workspaceDialogService]);

  if (!enableStudy || !studyService?.enabled || currentMode !== 'page') {
    return null;
  }

  return (
    <IconButton
      size="20"
      tooltip={t['com.affine.study.generate.menu']()}
      data-testid="header-study-generate-button"
      onClick={onOpenStudyGenerateModal}
    >
      <FlashPanelIcon />
    </IconButton>
  );
};
