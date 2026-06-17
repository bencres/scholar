export interface AIModel {
  name: string;
  id: string;
  version: string;
  category: string;
  isPro: boolean;
  isDefault: boolean;
}

const CHAT_PROMPT_NAME = 'Chat With AFFiNE AI';

function toAIModel(
  model: { id: string; name: string },
  options: { isPro?: boolean; isDefault?: boolean } = {}
): AIModel {
  const [category] = model.name.split(' ');
  const version = model.name.slice(category.length + 1);
  return {
    id: model.id,
    name: model.name,
    version,
    category,
    isPro: options.isPro ?? false,
    isDefault: options.isDefault ?? false,
  };
}

export const CHAT_PROMPT_MODELS = {
  promptName: CHAT_PROMPT_NAME,
  defaultModel: 'claude-sonnet-4-6',
  optionalModels: [
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  ],
  proModels: [{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' }],
} as const;

export function getFallbackChatModels(): AIModel[] {
  const { defaultModel, optionalModels, proModels } = CHAT_PROMPT_MODELS;
  const proModelIds = new Set(proModels.map(model => model.id));

  return optionalModels.map(model =>
    toAIModel(model, {
      isPro: proModelIds.has(model.id),
      isDefault: model.id === defaultModel,
    })
  );
}

export function mapPromptModels(models: {
  defaultModel: string;
  optionalModels: Array<{ id: string; name: string }>;
  proModels: Array<{ id: string; name: string }>;
}): AIModel[] {
  const proModelIds = new Set(models.proModels.map(model => model.id));

  return models.optionalModels.map(model =>
    toAIModel(model, {
      isPro: proModelIds.has(model.id),
      isDefault: model.id === models.defaultModel,
    })
  );
}
