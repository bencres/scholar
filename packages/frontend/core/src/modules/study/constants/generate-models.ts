export const STUDY_GENERATE_MODEL_STORAGE_KEY = 'StudyGenerateModelId';
export const STUDY_DEFAULT_INCLUDE_RECALL_KEY = 'StudyDefaultIncludeRecall';
export const STUDY_DEFAULT_INCLUDE_SYNTHESIS_KEY =
  'StudyDefaultIncludeSynthesis';
export const STUDY_DEFAULT_RECALL_COUNT_KEY = 'StudyDefaultRecallCount';
export const STUDY_DEFAULT_SYNTHESIS_COUNT_KEY = 'StudyDefaultSynthesisCount';
export const STUDY_DEFAULT_GENERATION_FOCUS_KEY = 'StudyDefaultGenerationFocus';
export const STUDY_FLASHCARDS_TRACK_SCHEDULE_KEY =
  'StudyFlashcardsTrackSchedule';

export const DEFAULT_STUDY_GENERATE_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_STUDY_FLASHCARDS_TRACK_SCHEDULE = true;
export const DEFAULT_STUDY_INCLUDE_RECALL = true;
export const DEFAULT_STUDY_INCLUDE_SYNTHESIS = false;
export const DEFAULT_STUDY_RECALL_COUNT = 10;
export const DEFAULT_STUDY_SYNTHESIS_COUNT = 7;
export const DEFAULT_STUDY_GENERATION_FOCUS = '';

export const STUDY_GENERATE_MODELS = [
  {
    id: 'claude-haiku-4-5',
    labelKey: 'com.affine.study.generate.model.haiku',
  },
  {
    id: 'claude-sonnet-4-6',
    labelKey: 'com.affine.study.generate.model.sonnet',
  },
  {
    id: 'claude-opus-4-6',
    labelKey: 'com.affine.study.generate.model.opus',
  },
] as const;

export type StudyGenerateModelId = (typeof STUDY_GENERATE_MODELS)[number]['id'];

export function isStudyGenerateModelId(
  modelId: string
): modelId is StudyGenerateModelId {
  return STUDY_GENERATE_MODELS.some(model => model.id === modelId);
}
