import type { Framework } from '@toeverything/infra';

import { FeatureFlagService } from '../feature-flag';
import { CacheStorage, GlobalStateService } from '../storage';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { StudyService } from './services/study';
import { StudyDeckStore } from './stores/study-deck';
import { StudySidecarStore } from './stores/study-sidecar';

export { StudyService };
export {
  DEFAULT_STUDY_GENERATE_MODEL,
  STUDY_GENERATE_MODELS,
} from './constants/generate-models';
export type { StudyCardContent } from './entities/card';
export type { StudyDeck } from './entities/deck';
export type { StudyGenerationDebug } from './services/study';

export function configureStudyModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(StudyService, [
      WorkspaceService,
      StudyDeckStore,
      StudySidecarStore,
      FeatureFlagService,
      GlobalStateService,
    ])
    .store(StudyDeckStore, [WorkspaceService, CacheStorage])
    .store(StudySidecarStore, [WorkspaceService, CacheStorage]);
}
