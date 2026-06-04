import type { ReferenceParams } from '@blocksuite/affine/model';

export type IndexerSearchNode = {
  fields: Record<string, string | string[]>;
};

export type IndexerRefEdge = {
  sourceDocId: string;
  targetDocId: string;
};

function fieldValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : value[0];
}

function fieldValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return typeof value === 'string' ? [value] : value;
}

export function parseRefTargetsFromNode(node: IndexerSearchNode): string[] {
  const { ref, refDocId } = node.fields;
  if (ref) {
    const items =
      typeof ref === 'string'
        ? [JSON.parse(ref) as { docId: string }]
        : ref.map(item => JSON.parse(item) as { docId: string });
    return items.map(item => item.docId).filter(Boolean);
  }
  return fieldValues(refDocId);
}

export function parseRefEdgesFromNodes(
  nodes: IndexerSearchNode[]
): IndexerRefEdge[] {
  const edges: IndexerRefEdge[] = [];
  for (const node of nodes) {
    const sourceDocId = fieldValue(node.fields.docId);
    if (!sourceDocId) continue;
    for (const targetDocId of parseRefTargetsFromNode(node)) {
      if (sourceDocId === targetDocId) continue;
      edges.push({ sourceDocId, targetDocId });
    }
  }
  return edges;
}

export function parseParsedRefsFromNodes(
  nodes: IndexerSearchNode[],
  excludeDocIds: string[] = []
): ({ docId: string } & ReferenceParams)[] {
  const exclude = new Set(excludeDocIds);
  return Array.from(
    new Map(
      nodes
        .flatMap(node => {
          const { ref } = node.fields;
          if (!ref) return [];
          return typeof ref === 'string'
            ? [JSON.parse(ref) as { docId: string } & ReferenceParams]
            : ref.map(
                item => JSON.parse(item) as { docId: string } & ReferenceParams
              );
        })
        .filter(ref => ref.docId && !exclude.has(ref.docId))
        .map(ref => [ref.docId, ref])
    ).values()
  );
}

export function refEdgesSignature(edges: IndexerRefEdge[]): string {
  return edges
    .map(edge => `${edge.sourceDocId}->${edge.targetDocId}`)
    .sort()
    .join('|');
}
