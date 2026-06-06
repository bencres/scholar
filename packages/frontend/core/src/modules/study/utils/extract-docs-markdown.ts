import type { Store } from '@blocksuite/affine/store';

import { extractDocMarkdown } from './extract-doc-text';

export type StudyDocMarkdownSection = {
  docId: string;
  title: string;
  markdown: string;
};

export function extractDocSection(
  docId: string,
  title: string,
  store: Store
): StudyDocMarkdownSection | null {
  const markdown = extractDocMarkdown(store);
  if (!markdown) {
    return null;
  }
  return { docId, title, markdown };
}

export function combineDocsMarkdown(sections: StudyDocMarkdownSection[]) {
  return sections
    .map(
      section =>
        `## ${section.title}\n\n(source: ${section.docId})\n\n${section.markdown}`
    )
    .join('\n\n---\n\n');
}

export function buildMultiDocGenerationFocus(
  sections: StudyDocMarkdownSection[],
  userFocus?: string
) {
  const docList = sections.map(section => section.title).join(', ');
  const linkage = `Synthesize flashcards that link ideas across these ${sections.length} notes: ${docList}. Prefer synthesis cards that connect concepts between documents.`;
  if (!userFocus?.trim()) {
    return linkage;
  }
  return `${userFocus.trim()}\n\n${linkage}`;
}
