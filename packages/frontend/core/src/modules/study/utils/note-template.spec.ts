import { describe, expect, it } from 'vitest';

import {
  renderCardTemplate,
  renderTemplate,
  STUDY_DEFAULT_NOTE_TYPES,
} from './note-template';

describe('study note template rendering', () => {
  it('renders field placeholders for basic templates', () => {
    const template = STUDY_DEFAULT_NOTE_TYPES.basic.templates[0];
    expect(template).toBeTruthy();
    const rendered = renderCardTemplate(
      template!,
      {
        Front: 'What is FSRS?',
        Back: 'A memory scheduling algorithm.',
      },
      1
    );
    expect(rendered.front).toContain('What is FSRS?');
    expect(rendered.back).toContain('A memory scheduling algorithm.');
  });

  it('renders cloze deletions for matching ordinal', () => {
    const rendered = renderTemplate(
      '{{c1::memory}} and {{c2::attention::hint}}',
      {},
      2
    );
    expect(rendered).toBe('memory and [... hint]');
  });
});
