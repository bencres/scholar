import { Injectable } from '@nestjs/common';

import { Config, CopilotSessionInvalidInput } from '../../../base';
import { llmResolveRequestedModelMatch } from '../../../native';
import { CopilotProviderRegistryService } from '../providers/registry-service';

export type ResolveModelInput = {
  defaultModel: string;
  optionalModels?: string[] | null;
  requestedModelId?: string;
};

@Injectable()
export class ModelSelectionPolicy {
  constructor(
    private readonly registries: CopilotProviderRegistryService,
    private readonly config: Config
  ) {}

  private getRegistry() {
    return this.registries.getRegistry();
  }

  private resolveModelVariable(modelId: string): string {
    const variables: Record<string, () => string> = {
      'fast-text': () => this.config.copilot.models.fastText,
    };
    return variables[modelId]?.() ?? modelId;
  }

  private matchRequestedModel(
    optionalModels: string[],
    requestedModelId?: string,
    defaultModel?: string
  ) {
    return llmResolveRequestedModelMatch({
      providerIds: [...this.getRegistry().profiles.keys()],
      optionalModels,
      requestedModelId,
      defaultModel,
    });
  }

  resolveRequestedModel(input: ResolveModelInput): {
    selectedModel: string;
    matchedOptionalModel: boolean;
  } {
    if (!input.defaultModel) {
      throw new CopilotSessionInvalidInput('Model is required');
    }
    const defaultModel = this.resolveModelVariable(input.defaultModel);
    const matched = this.matchRequestedModel(
      input.optionalModels ?? [],
      input.requestedModelId,
      defaultModel
    );
    return {
      selectedModel: matched.selectedModel ?? defaultModel,
      matchedOptionalModel: matched.matchedOptionalModel,
    };
  }

  matchesModelList(models: string[], modelId?: string) {
    return this.matchRequestedModel(models, modelId).matchedOptionalModel;
  }
}
