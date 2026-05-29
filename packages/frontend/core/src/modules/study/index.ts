import type { Framework } from '@toeverything/infra';

import { FeatureFlagService } from '../feature-flag';
import { CacheStorage } from '../storage';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { StudyService } from './services/study';
import { StudyDeckStore } from './stores/study-deck';
import { StudySidecarStore } from './stores/study-sidecar';

export { StudyService };
export type { StudyDeck } from './entities/deck';
export type { StudyCardContent } from './entities/card';

export function configureStudyModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(StudyService, [
      WorkspaceService,
      StudyDeckStore,
      StudySidecarStore,
      FeatureFlagService,
    ])
    .store(StudyDeckStore, [WorkspaceService, CacheStorage])
    .store(StudySidecarStore, [WorkspaceService, CacheStorage]);
}
