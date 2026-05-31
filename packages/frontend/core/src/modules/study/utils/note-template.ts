import type {
  StudyCardTemplate,
  StudyNoteType,
  StudyNoteTypeKind,
} from '../entities/card';

export const STUDY_DEFAULT_NOTE_TYPES: Record<
  StudyNoteTypeKind,
  StudyNoteType
> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    kind: 'basic',
    fieldNames: ['Front', 'Back'],
    templates: [
      {
        id: 'basic-forward',
        name: 'Card 1',
        front: '{{Front}}',
        back: '{{Front}}\n\n{{Back}}',
      },
    ],
  },
  'basic-reversed': {
    id: 'basic-reversed',
    name: 'Basic (and reversed)',
    kind: 'basic-reversed',
    fieldNames: ['Front', 'Back'],
    templates: [
      {
        id: 'basic-reversed-forward',
        name: 'Card 1',
        front: '{{Front}}',
        back: '{{Front}}\n\n{{Back}}',
      },
      {
        id: 'basic-reversed-backward',
        name: 'Card 2',
        front: '{{Back}}',
        back: '{{Back}}\n\n{{Front}}',
      },
    ],
  },
  cloze: {
    id: 'cloze',
    name: 'Cloze',
    kind: 'cloze',
    fieldNames: ['Text', 'Extra'],
    templates: [
      {
        id: 'cloze-default',
        name: 'Card 1',
        front: '{{cloze:Text}}',
        back: '{{Text}}\n\n{{Extra}}',
      },
    ],
  },
  'image-occlusion': {
    id: 'image-occlusion',
    name: 'Image Occlusion',
    kind: 'image-occlusion',
    fieldNames: ['Prompt', 'Answer'],
    templates: [
      {
        id: 'image-occlusion-default',
        name: 'Card 1',
        front: '{{Prompt}}',
        back: '{{Prompt}}\n\n{{Answer}}',
      },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    kind: 'custom',
    fieldNames: [],
    templates: [],
  },
};

export function renderTemplate(
  template: string,
  fields: Record<string, string | undefined>,
  clozeOrdinal = 1
) {
  const fieldRendered = template.replace(
    /\{\{([^}:]+)\}\}/g,
    (_, fieldName) => {
      return fields[fieldName.trim()] ?? '';
    }
  );
  return renderCloze(fieldRendered, clozeOrdinal);
}

export function renderCardTemplate(
  template: StudyCardTemplate,
  fields: Record<string, string | undefined>,
  clozeOrdinal = 1
) {
  return {
    front: renderTemplate(template.front, fields, clozeOrdinal),
    back: renderTemplate(template.back, fields, clozeOrdinal),
  };
}

function renderCloze(input: string, clozeOrdinal: number) {
  return input.replace(
    /\{\{c(\d+)::([\s\S]*?)(::([\s\S]*?))?\}\}/g,
    (
      _,
      rawOrdinal: string,
      answer: string,
      _hintGroup: string,
      hint: string
    ) => {
      if (Number(rawOrdinal) === clozeOrdinal) {
        return hint ? `[... ${hint}]` : '[...]';
      }
      return answer;
    }
  );
}
