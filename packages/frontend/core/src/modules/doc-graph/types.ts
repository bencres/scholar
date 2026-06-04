export type DocLinkGraphNode = {
  id: string;
  title: string;
  degree: number;
  orphan: boolean;
};

export type DocLinkGraphEdge = {
  source: string;
  target: string;
  weight: number;
};

export type DocLinkGraphStats = {
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
};

export type DocLinkGraphSnapshot = {
  nodes: DocLinkGraphNode[];
  edges: DocLinkGraphEdge[];
  stats: DocLinkGraphStats;
};

export type DocLinkGraphFilters = {
  mode: 'global' | 'local';
  centerDocId?: string;
  localDepth?: number;
  hideOrphans?: boolean;
  searchQuery?: string;
};

export type DocLinkGraphBuildInput = {
  refEdges: Array<{ sourceDocId: string; targetDocId: string }>;
  docTitles: Map<string, string>;
  allowedDocIds: Set<string>;
  readableDocIds: Set<string>;
  truncated?: boolean;
  filters?: DocLinkGraphFilters;
};
