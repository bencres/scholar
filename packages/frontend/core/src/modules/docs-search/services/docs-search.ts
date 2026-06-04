import { toDocSearchParams } from '@affine/core/modules/navigation';
import type { IndexerPreferOptions, IndexerSyncState } from '@affine/nbstore';
import { fromPromise, LiveData, Service } from '@toeverything/infra';
import { isEmpty, omit } from 'lodash-es';
import {
  distinctUntilChanged,
  map,
  type Observable,
  of,
  switchMap,
} from 'rxjs';
import { z } from 'zod';

import { normalizeSearchText } from '../../../utils/normalize-search-text';
import type { DocsService } from '../../doc/services/docs';
import type { WorkspaceService } from '../../workspace';
import {
  type IndexerRefEdge,
  parseParsedRefsFromNodes,
  parseRefEdgesFromNodes,
  refEdgesSignature,
} from '../utils/parse-indexer-refs';

const REF_BLOCKS_PAGE_SIZE = 100;
const REF_BLOCKS_MAX = 10_000;

export type AllRefBlocksResult = {
  edges: IndexerRefEdge[];
  truncated: boolean;
};

const ALL_REF_BLOCKS_QUERY = {
  type: 'exists' as const,
  field: 'refDocId' as const,
};

const ALL_REF_BLOCKS_OPTIONS = {
  fields: ['docId', 'refDocId', 'ref'] as const,
  pagination: {
    limit: REF_BLOCKS_PAGE_SIZE,
    skip: 0,
  },
};

export class DocsSearchService extends Service {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly docsService: DocsService
  ) {
    super();
  }

  get indexer() {
    return this.workspaceService.workspace.engine.indexer;
  }

  readonly indexerState$ = LiveData.from(this.indexer.state$, {
    indexing: 0,
    errorMessage: null,
  } as IndexerSyncState);

  searchTitle$(query: string) {
    return this.indexer
      .search$(
        'doc',
        {
          type: 'match',
          field: 'title',
          match: query,
        },
        {
          pagination: {
            skip: 0,
            limit: Infinity,
          },
        }
      )
      .pipe(
        map(({ nodes }) => {
          return nodes.map(node => node.id);
        })
      );
  }

  search$(
    query: string,
    prefer: IndexerPreferOptions = 'remote'
  ): Observable<
    {
      docId: string;
      title: string;
      score: number;
      blockId?: string;
      blockContent?: string;
    }[]
  > {
    return this.indexer
      .aggregate$(
        'block',
        {
          type: 'boolean',
          occur: 'must',
          queries: [
            {
              type: 'match',
              field: 'content',
              match: query,
            },
            {
              type: 'boolean',
              occur: 'should',
              queries: [
                {
                  type: 'match',
                  field: 'content',
                  match: query,
                },
                {
                  type: 'boost',
                  boost: 1.5,
                  query: {
                    type: 'match',
                    field: 'flavour',
                    match: 'affine:page',
                  },
                },
              ],
            },
          ],
        },
        'docId',
        {
          pagination: {
            limit: 50,
            skip: 0,
          },
          hits: {
            pagination: {
              limit: 2,
              skip: 0,
            },
            fields: ['blockId', 'flavour'],
            highlights: [
              {
                field: 'content',
                before: '<b>',
                end: '</b>',
              },
            ],
          },
          prefer,
        }
      )
      .pipe(
        map(({ buckets }) => {
          const result = [];

          for (const bucket of buckets) {
            const firstMatchFlavour = bucket.hits.nodes[0]?.fields.flavour;
            if (firstMatchFlavour === 'affine:page') {
              // is title match
              const blockContent = normalizeSearchText(
                bucket.hits.nodes[1]?.highlights.content[0]
              ); // try to get block content
              result.push({
                docId: bucket.key,
                title: normalizeSearchText(
                  bucket.hits.nodes[0].highlights.content[0]
                ),
                score: bucket.score,
                blockContent,
              });
            } else {
              const title =
                this.docsService.list.doc$(bucket.key).value?.title$.value ??
                '';
              const matchedBlockId = bucket.hits.nodes[0]?.fields.blockId;
              // is block match
              result.push({
                docId: bucket.key,
                title: title,
                blockId:
                  typeof matchedBlockId === 'string'
                    ? matchedBlockId
                    : matchedBlockId[0],
                score: bucket.score,
                blockContent: normalizeSearchText(
                  bucket.hits.nodes[0]?.highlights.content[0]
                ),
              });
            }
          }

          return result;
        })
      );
  }

  watchRefsFrom(ids: string | string[]) {
    const docIds = Array.isArray(ids) ? ids : [ids];
    if (docIds.length === 0) {
      return of([]);
    }

    return this.indexer
      .search$(
        'block',
        {
          type: 'boolean',
          occur: 'must',
          queries: [
            {
              type: 'boolean',
              occur: 'should',
              queries: docIds.map(id => ({
                type: 'match',
                field: 'docId',
                match: id,
              })),
            },
            {
              type: 'exists',
              field: 'refDocId',
            },
          ],
        },
        {
          fields: ['refDocId', 'ref'],
          pagination: {
            limit: 100,
          },
        }
      )
      .pipe(
        switchMap(({ nodes }) => {
          return fromPromise(async () => {
            const refs = parseParsedRefsFromNodes(nodes, docIds);

            return refs
              .flatMap(ref => {
                const doc = this.docsService.list.doc$(ref.docId).value;
                if (!doc) return null;

                const title = doc.title$.value;
                const params = omit(ref, ['docId']);

                return {
                  title,
                  docId: doc.id,
                  params: isEmpty(params)
                    ? undefined
                    : toDocSearchParams(params),
                };
              })
              .filter(ref => !!ref);
          });
        }),
        // Only propagate downstream when the actual set of linked docs
        // changes (a link was added or removed). Without this guard,
        // every re-index triggered by typing emits a new array (same
        // docs, arbitrary search-engine order) and the navigation panel
        // visibly reorders on every keystroke.
        //
        // Note: this compares docId sets, not order. A stable, meaningful
        // sort order (e.g. document appearance order) requires block
        // position data from the indexer and is tracked separately.
        distinctUntilChanged((prev, curr) => {
          if (prev.length !== curr.length) return false;
          const currIds = new Set(curr.map(r => r.docId));
          return prev.every(r => currIds.has(r.docId));
        })
      );
  }

  watchAllRefBlocks$(): Observable<AllRefBlocksResult> {
    return this.indexer
      .search$('block', ALL_REF_BLOCKS_QUERY, ALL_REF_BLOCKS_OPTIONS)
      .pipe(
        switchMap(() => fromPromise(() => this.fetchAllRefBlocks())),
        distinctUntilChanged(
          (prev, curr) =>
            prev.truncated === curr.truncated &&
            refEdgesSignature(prev.edges) === refEdgesSignature(curr.edges)
        )
      );
  }

  private async fetchAllRefBlocks(): Promise<AllRefBlocksResult> {
    const nodes: { fields: Record<string, string | string[]> }[] = [];
    let skip = 0;
    let truncated = false;

    while (nodes.length < REF_BLOCKS_MAX) {
      const page = await this.indexer.search('block', ALL_REF_BLOCKS_QUERY, {
        fields: ['docId', 'refDocId', 'ref'],
        pagination: {
          limit: REF_BLOCKS_PAGE_SIZE,
          skip,
        },
      });
      nodes.push(...page.nodes);
      skip += REF_BLOCKS_PAGE_SIZE;
      if (!page.pagination.hasMore) {
        break;
      }
      if (nodes.length >= REF_BLOCKS_MAX) {
        truncated = true;
        break;
      }
    }

    return {
      edges: parseRefEdgesFromNodes(nodes),
      truncated,
    };
  }

  watchDatabasesTo(docId: string) {
    const DatabaseAdditionalSchema = z.object({
      databaseName: z.string().optional(),
    });
    return this.indexer
      .search$(
        'block',
        {
          type: 'boolean',
          occur: 'must',
          queries: [
            {
              type: 'match',
              field: 'refDocId',
              match: docId,
            },
            {
              type: 'match',
              field: 'parentFlavour',
              match: 'affine:database',
            },
          ],
        },
        {
          fields: ['docId', 'blockId', 'parentBlockId', 'additional'],
          pagination: {
            limit: 100,
          },
        }
      )
      .pipe(
        map(({ nodes }) => {
          return nodes
            .map(node => {
              if (node.fields.docId === docId) {
                // Ignore if it is a link to the current document.
                return null;
              }

              const additional =
                typeof node.fields.additional === 'string'
                  ? node.fields.additional
                  : node.fields.additional[0];

              return {
                docId:
                  typeof node.fields.docId === 'string'
                    ? node.fields.docId
                    : node.fields.docId[0],
                rowId:
                  typeof node.fields.blockId === 'string'
                    ? node.fields.blockId
                    : node.fields.blockId[0],
                databaseBlockId:
                  typeof node.fields.parentBlockId === 'string'
                    ? node.fields.parentBlockId
                    : node.fields.parentBlockId[0],
                databaseName: DatabaseAdditionalSchema.safeParse(additional)
                  .data?.databaseName as string | undefined,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
        })
      );
  }

  watchDocSummary(docId: string) {
    return this.indexer
      .search$(
        'doc',
        {
          type: 'match',
          field: 'docId',
          match: docId,
        },
        {
          fields: ['summary'],
          pagination: {
            limit: 1,
          },
        }
      )
      .pipe(
        map(({ nodes }) => {
          const node = nodes.at(0);
          return (
            (typeof node?.fields.summary === 'string'
              ? node?.fields.summary
              : node?.fields.summary[0]) ?? null
          );
        })
      );
  }
}
