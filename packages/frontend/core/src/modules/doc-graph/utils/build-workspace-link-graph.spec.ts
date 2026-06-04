import { describe, expect, it } from 'vitest';

import { buildWorkspaceLinkGraph } from './build-workspace-link-graph';

const titles = new Map([
  ['a', 'Doc A'],
  ['b', 'Doc B'],
  ['c', 'Doc C'],
  ['orphan', 'Orphan'],
]);

const allowed = new Set(['a', 'b', 'c', 'orphan']);
const readable = new Set(['a', 'b', 'c', 'orphan']);

describe('buildWorkspaceLinkGraph', () => {
  it('dedupes edges and increments weight for multiple blocks', () => {
    const graph = buildWorkspaceLinkGraph({
      refEdges: [
        { sourceDocId: 'a', targetDocId: 'b' },
        { sourceDocId: 'a', targetDocId: 'b' },
        { sourceDocId: 'b', targetDocId: 'c' },
      ],
      docTitles: titles,
      allowedDocIds: allowed,
      readableDocIds: readable,
    });

    expect(graph.edges).toEqual([
      { source: 'a', target: 'b', weight: 2 },
      { source: 'b', target: 'c', weight: 1 },
    ]);
    expect(graph.stats.edgeCount).toBe(2);
  });

  it('excludes trashed or unreadable docs', () => {
    const graph = buildWorkspaceLinkGraph({
      refEdges: [
        { sourceDocId: 'a', targetDocId: 'b' },
        { sourceDocId: 'a', targetDocId: 'x' },
      ],
      docTitles: titles,
      allowedDocIds: new Set(['a', 'b']),
      readableDocIds: readable,
    });

    expect(graph.edges).toEqual([{ source: 'a', target: 'b', weight: 1 }]);
  });

  it('hides orphan nodes when hideOrphans is set', () => {
    const graph = buildWorkspaceLinkGraph({
      refEdges: [{ sourceDocId: 'a', targetDocId: 'b' }],
      docTitles: titles,
      allowedDocIds: allowed,
      readableDocIds: readable,
      filters: { mode: 'global', hideOrphans: true },
    });

    expect(graph.nodes.map(node => node.id).sort()).toEqual(['a', 'b']);
    expect(graph.nodes.find(node => node.id === 'orphan')).toBeUndefined();
  });

  it('builds a local subgraph around the center doc', () => {
    const graph = buildWorkspaceLinkGraph({
      refEdges: [
        { sourceDocId: 'a', targetDocId: 'b' },
        { sourceDocId: 'b', targetDocId: 'c' },
        { sourceDocId: 'a', targetDocId: 'c' },
      ],
      docTitles: titles,
      allowedDocIds: allowed,
      readableDocIds: readable,
      filters: { mode: 'local', centerDocId: 'b', localDepth: 1 },
    });

    expect(graph.nodes.map(node => node.id).sort()).toEqual(['a', 'b', 'c']);
    expect(graph.edges).toHaveLength(3);
  });

  it('marks stats as truncated when input says so', () => {
    const graph = buildWorkspaceLinkGraph({
      refEdges: [],
      docTitles: titles,
      allowedDocIds: allowed,
      readableDocIds: readable,
      truncated: true,
    });

    expect(graph.stats.truncated).toBe(true);
  });
});
