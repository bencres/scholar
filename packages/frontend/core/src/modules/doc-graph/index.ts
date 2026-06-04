import type { Framework } from '@toeverything/infra';

import { DocsService } from '../doc';
import { DocsSearchService } from '../docs-search';
import { GlobalContextService } from '../global-context';
import { GuardService } from '../permissions';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { DocGraphService } from './services/doc-graph';

export { DocGraphService } from './services/doc-graph';
export type {
  DocLinkGraphEdge,
  DocLinkGraphFilters,
  DocLinkGraphNode,
  DocLinkGraphSnapshot,
} from './types';

export function configureDocGraphModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(DocGraphService, [
      DocsSearchService,
      DocsService,
      GuardService,
      WorkspaceService,
      GlobalContextService,
    ]);
}
