import type { Framework } from '@toeverything/infra';

import { WorkspaceServerService } from '../cloud';
import { FeatureFlagService } from '../feature-flag';
import { CacheStorage, GlobalStateService } from '../storage';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { StudyCommandRepository } from './repositories/study-command-repository';
import { StudyQueryRepository } from './repositories/study-query-repository';
import { StudyService } from './services/study';
import { StudyCommandService } from './services/study-command';
import { StudyQueryService } from './services/study-query';
import { StudyDeckStore } from './stores/study-deck';
import { StudySidecarStore } from './stores/study-sidecar';

export { StudyService };
export {
  DEFAULT_STUDY_GENERATE_MODEL,
  STUDY_GENERATE_MODELS,
} from './constants/generate-models';
export type { StudyCardContent } from './entities/card';
export type { StudyDeck } from './entities/deck';
export type { StudyReviewLog, StudyReviewStats } from './entities/review-log';
export type { StudyGenerationDebug } from './services/study';

export function configureStudyModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .store(StudyQueryRepository, [StudyDeckStore, StudySidecarStore])
    .store(StudyCommandRepository, [StudyDeckStore, StudySidecarStore])
    .service(StudyQueryService, [StudyQueryRepository, FeatureFlagService])
    .service(StudyCommandService, [
      WorkspaceService,
      StudyCommandRepository,
      FeatureFlagService,
      GlobalStateService,
    ])
    .service(StudyService, [StudyQueryService, StudyCommandService])
    .store(StudyDeckStore, f => {
      return new StudyDeckStore(
        f.get(WorkspaceService),
        f.get(CacheStorage),
        f.getOptional(WorkspaceServerService)
      );
    })
    .store(StudySidecarStore, f => {
      return new StudySidecarStore(
        f.get(WorkspaceService),
        f.get(CacheStorage),
        f.getOptional(WorkspaceServerService)
      );
    });
}
