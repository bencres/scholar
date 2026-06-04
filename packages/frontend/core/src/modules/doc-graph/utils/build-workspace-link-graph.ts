import type {
  DocLinkGraphBuildInput,
  DocLinkGraphEdge,
  DocLinkGraphNode,
  DocLinkGraphSnapshot,
} from '../types';

function buildEdgeMap(
  refEdges: Array<{ sourceDocId: string; targetDocId: string }>,
  allowedDocIds: Set<string>,
  readableDocIds: Set<string>
): Map<string, DocLinkGraphEdge> {
  const edgeMap = new Map<string, DocLinkGraphEdge>();
  for (const { sourceDocId, targetDocId } of refEdges) {
    if (!allowedDocIds.has(sourceDocId) || !allowedDocIds.has(targetDocId)) {
      continue;
    }
    if (!readableDocIds.has(sourceDocId) || !readableDocIds.has(targetDocId)) {
      continue;
    }
    const key = `${sourceDocId}\0${targetDocId}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += 1;
    } else {
      edgeMap.set(key, { source: sourceDocId, target: targetDocId, weight: 1 });
    }
  }
  return edgeMap;
}

function collectLocalDocIds(
  centerDocId: string,
  edges: DocLinkGraphEdge[],
  depth: number
): Set<string> {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  for (const edge of edges) {
    let sourceNeighbors = outgoing.get(edge.source);
    if (!sourceNeighbors) {
      sourceNeighbors = new Set();
      outgoing.set(edge.source, sourceNeighbors);
    }
    sourceNeighbors.add(edge.target);
    let targetNeighbors = incoming.get(edge.target);
    if (!targetNeighbors) {
      targetNeighbors = new Set();
      incoming.set(edge.target, targetNeighbors);
    }
    targetNeighbors.add(edge.source);
  }

  const visited = new Set<string>([centerDocId]);
  let frontier = new Set<string>([centerDocId]);
  for (let hop = 0; hop < depth; hop++) {
    const next = new Set<string>();
    for (const docId of frontier) {
      for (const target of outgoing.get(docId) ?? []) {
        next.add(target);
      }
      for (const source of incoming.get(docId) ?? []) {
        next.add(source);
      }
    }
    for (const id of next) visited.add(id);
    frontier = next;
  }
  return visited;
}

export function buildWorkspaceLinkGraph(
  input: DocLinkGraphBuildInput
): DocLinkGraphSnapshot {
  const {
    refEdges,
    docTitles,
    allowedDocIds,
    readableDocIds,
    truncated = false,
    filters,
  } = input;

  let edgeMap = buildEdgeMap(refEdges, allowedDocIds, readableDocIds);
  let edges = Array.from(edgeMap.values());

  let localDocIds: Set<string> | null = null;
  if (
    filters?.mode === 'local' &&
    filters.centerDocId &&
    allowedDocIds.has(filters.centerDocId) &&
    readableDocIds.has(filters.centerDocId)
  ) {
    const depth = Math.max(1, Math.min(2, filters.localDepth ?? 1));
    localDocIds = collectLocalDocIds(filters.centerDocId, edges, depth);
    edgeMap = new Map(
      Array.from(edgeMap.entries()).filter(([, edge]) => {
        return localDocIds.has(edge.source) && localDocIds.has(edge.target);
      })
    );
    edges = Array.from(edgeMap.values());
  }

  const degreeByDoc = new Map<string, number>();
  for (const edge of edges) {
    degreeByDoc.set(edge.source, (degreeByDoc.get(edge.source) ?? 0) + 1);
    degreeByDoc.set(edge.target, (degreeByDoc.get(edge.target) ?? 0) + 1);
  }

  const connectedDocIds = new Set<string>();
  for (const edge of edges) {
    connectedDocIds.add(edge.source);
    connectedDocIds.add(edge.target);
  }

  const nodeIds = new Set<string>(connectedDocIds);
  if (localDocIds) {
    for (const docId of localDocIds) {
      if (readableDocIds.has(docId)) {
        nodeIds.add(docId);
      }
    }
  } else if (!filters?.hideOrphans) {
    for (const docId of allowedDocIds) {
      if (readableDocIds.has(docId)) {
        nodeIds.add(docId);
      }
    }
  }

  const search = filters?.searchQuery?.trim().toLowerCase();
  let nodes: DocLinkGraphNode[] = Array.from(nodeIds).map(id => {
    const degree = degreeByDoc.get(id) ?? 0;
    const title = docTitles.get(id) ?? 'Untitled';
    return {
      id,
      title,
      degree,
      orphan: degree === 0,
    };
  });

  if (filters?.hideOrphans) {
    nodes = nodes.filter(node => !node.orphan);
    const visible = new Set(nodes.map(node => node.id));
    edges = edges.filter(
      edge => visible.has(edge.source) && visible.has(edge.target)
    );
  }

  if (search) {
    const matching = new Set(
      nodes
        .filter(node => node.title.toLowerCase().includes(search))
        .map(n => n.id)
    );
    for (const edge of edges) {
      if (matching.has(edge.source)) matching.add(edge.target);
      if (matching.has(edge.target)) matching.add(edge.source);
    }
    nodes = nodes.filter(node => matching.has(node.id));
    edges = edges.filter(
      edge => matching.has(edge.source) && matching.has(edge.target)
    );
  }

  return {
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      truncated,
    },
  };
}
