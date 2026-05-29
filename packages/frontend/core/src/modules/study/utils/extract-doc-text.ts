import { parsePageDoc } from '@affine/reader';
import type { Store } from '@blocksuite/affine/store';

export function extractDocMarkdown(doc: Store): string {
  const parsed = parsePageDoc({
    doc: doc.spaceDoc,
    workspaceId: doc.workspace.id,
    buildBlobUrl: (blobId: string) => `/${doc.workspace.id}/blobs/${blobId}`,
    buildDocUrl: (docId: string) => `/workspace/${doc.workspace.id}/${docId}`,
    aiEditable: true,
  });

  return parsed.md.trim();
}
