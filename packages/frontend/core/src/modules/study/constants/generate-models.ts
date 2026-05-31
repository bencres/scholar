export const STUDY_GENERATE_MODEL_STORAGE_KEY = 'StudyGenerateModelId';

export const DEFAULT_STUDY_GENERATE_MODEL = 'claude-sonnet-4-6';

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
