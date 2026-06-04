import { fromPromise, LiveData, Service } from '@toeverything/infra';
import { switchMap } from 'rxjs';

import type { DocsService } from '../../doc';
import type { DocsSearchService } from '../../docs-search';
import type { AllRefBlocksResult } from '../../docs-search/services/docs-search';
import type { GlobalContextService } from '../../global-context';
import type { GuardService } from '../../permissions';
import type { WorkspaceService } from '../../workspace';
import type { DocLinkGraphFilters, DocLinkGraphSnapshot } from '../types';
import { buildWorkspaceLinkGraph } from '../utils/build-workspace-link-graph';

const defaultFilters: DocLinkGraphFilters = {
  mode: 'global',
  hideOrphans: false,
  localDepth: 1,
};

export class DocGraphService extends Service {
  readonly filters$ = new LiveData<DocLinkGraphFilters>(defaultFilters);

  private readonly refBlocks$ = LiveData.from<AllRefBlocksResult>(
    this.docsSearchService.watchAllRefBlocks$(),
    { edges: [], truncated: false }
  );

  private readonly graphInputs$ = LiveData.computed(get => ({
    refData: get(this.refBlocks$),
    nonTrashDocIds: get(this.docsService.list.nonTrashDocsIds$),
    filters: get(this.filters$),
    activeDocId: get(this.globalContextService.globalContext.docId.$),
  }));

  readonly graphSnapshot$ = LiveData.from<DocLinkGraphSnapshot | undefined>(
    this.graphInputs$.pipe(
      switchMap(({ refData, nonTrashDocIds, filters, activeDocId }) =>
        fromPromise(async () => {
          const mergedFilters: DocLinkGraphFilters = {
            ...filters,
            centerDocId:
              filters.mode === 'local'
                ? (filters.centerDocId ?? activeDocId ?? undefined)
                : filters.centerDocId,
          };

          const allowedDocIds = new Set(nonTrashDocIds);
          const docTitles = new Map<string, string>();
          for (const docId of nonTrashDocIds) {
            docTitles.set(
              docId,
              this.docsService.list.doc$(docId).value?.title$.value ??
                'Untitled'
            );
          }

          const edgeDocIds = new Set<string>();
          for (const edge of refData.edges) {
            edgeDocIds.add(edge.sourceDocId);
            edgeDocIds.add(edge.targetDocId);
          }
          const readableDocIds = await this.resolveReadableDocIds([
            ...new Set([...allowedDocIds, ...edgeDocIds]),
          ]);

          return buildWorkspaceLinkGraph({
            refEdges: refData.edges,
            docTitles,
            allowedDocIds,
            readableDocIds,
            truncated: refData.truncated,
            filters: mergedFilters,
          });
        })
      )
    ),
    undefined
  );

  readonly isLoading$ = LiveData.computed(
    get => get(this.graphSnapshot$) === undefined
  );

  constructor(
    private readonly docsSearchService: DocsSearchService,
    private readonly docsService: DocsService,
    private readonly guardService: GuardService,
    private readonly workspaceService: WorkspaceService,
    private readonly globalContextService: GlobalContextService
  ) {
    super();
  }

  setFilters(patch: Partial<DocLinkGraphFilters>) {
    this.filters$.next({ ...this.filters$.value, ...patch });
  }

  openLocalGraph(centerDocId: string) {
    this.setFilters({
      mode: 'local',
      centerDocId,
      localDepth: 1,
    });
  }

  private async resolveReadableDocIds(docIds: string[]): Promise<Set<string>> {
    if (
      this.workspaceService.workspace.flavour === 'local' ||
      this.workspaceService.workspace.openOptions.isSharedMode
    ) {
      return new Set(docIds);
    }

    const readable = new Set<string>();
    await Promise.all(
      docIds.map(async docId => {
        if (await this.guardService.can('Doc_Read', docId)) {
          readable.add(docId);
        }
      })
    );
    return readable;
  }
}
