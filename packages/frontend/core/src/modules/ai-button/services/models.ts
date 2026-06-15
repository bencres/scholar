import { getPromptModelsQuery, SubscriptionStatus } from '@affine/graphql';
import {
  createSignalFromObservable,
  type Signal,
} from '@blocksuite/affine/shared/utils';
import { signal } from '@preact/signals-core';
import { LiveData, OnEvent, Service } from '@toeverything/infra';

import type { GraphQLService, SubscriptionService } from '../../cloud';
import { AccountChanged } from '../../cloud/events/account-changed';
import { ServerStarted } from '../../cloud/events/server-started';
import type { GlobalStateService } from '../../storage';
import {
  type AIModel,
  CHAT_PROMPT_MODELS,
  getFallbackChatModels,
  mapPromptModels,
} from '../constants/chat-models';

const AI_MODEL_ID_KEY = 'AIModelId';
const MODEL_FETCH_TIMEOUT = 60_000;

export type { AIModel };

@OnEvent(AccountChanged, s => s.onAccountChanged)
@OnEvent(ServerStarted, s => s.onServerStarted)
export class AIModelService extends Service {
  modelId: Signal<string | undefined>;

  models: Signal<AIModel[]> = signal([]);

  private readonly modelId$ = LiveData.from(
    this.globalStateService.globalState.watch<string>(AI_MODEL_ID_KEY),
    undefined
  );

  constructor(
    private readonly globalStateService: GlobalStateService,
    private readonly gqlService: GraphQLService,
    private readonly subscriptionService: SubscriptionService
  ) {
    super();

    const { signal: modelId, cleanup } = createSignalFromObservable<
      string | undefined
    >(this.modelId$, undefined);
    this.modelId = modelId;
    this.disposables.push(cleanup);

    this.init().catch(err => {
      console.error(err);
    });
  }

  resetModel = () => {
    this.globalStateService.globalState.set(AI_MODEL_ID_KEY, undefined);
  };

  setModel = (modelId: string) => {
    const isSubscribed =
      this.subscriptionService.subscription.ai$.value?.status ===
      SubscriptionStatus.Active;
    const model = this.models.value.find(model => model.id === modelId);
    if (!isSubscribed && model?.isPro) {
      return;
    }
    this.globalStateService.globalState.set(AI_MODEL_ID_KEY, modelId);
  };

  reloadModels = async (prompt?: string) => {
    await this.initModels(prompt);
  };

  private onAccountChanged() {
    this.initModels().catch(console.error);
  }

  private onServerStarted() {
    this.initModels().catch(console.error);
  }

  private readonly init = async () => {
    await this.initModels();

    const sub = this.subscriptionService.subscription.ai$.subscribe(
      subscription => {
        const isSubscribed = subscription?.status === SubscriptionStatus.Active;
        const model = this.models.value.find(
          model => model.id === this.modelId.value
        );
        if (!isSubscribed && model?.isPro) {
          this.resetModel();
        }
      }
    );
    this.disposables.push(() => sub.unsubscribe());
  };

  private readonly initModels = async (prompt?: string) => {
    const promptName = prompt || CHAT_PROMPT_MODELS.promptName;
    try {
      const models = await this.getModelsByPrompt(promptName);
      if (models?.optionalModels.length) {
        this.models.value = mapPromptModels(models);
        return;
      }
    } catch (error) {
      console.warn(
        'Failed to load AI chat models, using fallback list.',
        error
      );
    }

    if (!this.models.value.length) {
      this.models.value = getFallbackChatModels();
    }
  };

  private readonly getModelsByPrompt = async (promptName: string) => {
    return this.gqlService
      .gql({
        query: getPromptModelsQuery,
        variables: { promptName },
        timeout: MODEL_FETCH_TIMEOUT,
      })
      .then(res => res.currentUser?.copilot?.models);
  };
}
