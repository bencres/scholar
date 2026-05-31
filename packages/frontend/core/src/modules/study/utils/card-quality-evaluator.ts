import type { StudyCardPreview } from '../schema/generate-output';

export type StudyCardQualitySeverity = 'warning' | 'error';

export type StudyCardQualityIssue = {
  code:
    | 'question_too_short'
    | 'answer_too_short'
    | 'multiple_choice_detected'
    | 'cue_leakage'
    | 'duplicate_question'
    | 'rubric_too_shallow'
    | 'weak_prompt';
  severity: StudyCardQualitySeverity;
  message: string;
};

export type StudyCardQualityReport = {
  cardId: string;
  issues: StudyCardQualityIssue[];
};

export type StudyCardQualityEvaluation = {
  reports: StudyCardQualityReport[];
  blocking: StudyCardQualityReport[];
  warnings: StudyCardQualityReport[];
};

export interface StudyCardQualityAiEvaluator {
  evaluate(cards: StudyCardPreview[]): Promise<StudyCardQualityReport[]>;
}

type EvaluateOptions = {
  aiEvaluator?: StudyCardQualityAiEvaluator;
};

const MULTIPLE_CHOICE_PATTERN =
  /\b(?:a[).]|b[).]|c[).]|d[).])\s+|\btrue\s+or\s+false\b/i;
const WEAK_RECALL_PROMPT_PATTERN = /^(what is|define|list|name)\b/i;
const SCENARIO_PROMPT_PATTERN =
  /\b(scenario|debug|incident|production|predict|what happens if|failure)\b/i;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasCueLeakage(question: string, answer?: string): boolean {
  if (!answer) return false;
  const normalizedQuestion = normalizeText(question);
  const normalizedAnswer = normalizeText(answer);
  if (normalizedAnswer.length < 18) return false;
  return normalizedQuestion.includes(normalizedAnswer);
}

function questionSnippet(question: string): string {
  return question.trim().slice(0, 72);
}

function mergeReports(
  localReports: StudyCardQualityReport[],
  aiReports: StudyCardQualityReport[]
): StudyCardQualityReport[] {
  const merged = new Map<string, StudyCardQualityIssue[]>();
  for (const report of localReports) {
    merged.set(report.cardId, [...report.issues]);
  }
  for (const report of aiReports) {
    const existing = merged.get(report.cardId) ?? [];
    merged.set(report.cardId, [...existing, ...report.issues]);
  }
  return [...merged.entries()].map(([cardId, issues]) => ({ cardId, issues }));
}

export async function evaluateStudyCardSelection(
  cards: StudyCardPreview[],
  options?: EvaluateOptions
): Promise<StudyCardQualityEvaluation> {
  const normalizedCounts = new Map<string, number>();
  for (const card of cards) {
    const key = normalizeText(card.question);
    normalizedCounts.set(key, (normalizedCounts.get(key) ?? 0) + 1);
  }

  const reports: StudyCardQualityReport[] = cards.map(card => {
    const issues: StudyCardQualityIssue[] = [];
    const minQuestionLength = card.type === 'recall' ? 14 : 22;
    if (card.question.trim().length < minQuestionLength) {
      issues.push({
        code: 'question_too_short',
        severity: 'error',
        message: `Question is too short for a useful ${card.type} card`,
      });
    }
    if (MULTIPLE_CHOICE_PATTERN.test(card.question)) {
      issues.push({
        code: 'multiple_choice_detected',
        severity: 'error',
        message: 'Multiple-choice formatting detected in question',
      });
    }
    if (
      card.type === 'recall' &&
      WEAK_RECALL_PROMPT_PATTERN.test(card.question)
    ) {
      issues.push({
        code: 'weak_prompt',
        severity: 'warning',
        message: 'Question leans toward recognition instead of active recall',
      });
    }
    if (
      normalizedCounts.get(normalizeText(card.question)) &&
      (normalizedCounts.get(normalizeText(card.question)) ?? 0) > 1
    ) {
      issues.push({
        code: 'duplicate_question',
        severity: 'error',
        message: 'Duplicate or near-duplicate question detected',
      });
    }

    if (card.type === 'recall') {
      if (!card.answer || card.answer.trim().length < 12) {
        issues.push({
          code: 'answer_too_short',
          severity: 'error',
          message: 'Recall answer is too short to reinforce understanding',
        });
      }
      if (hasCueLeakage(card.question, card.answer)) {
        issues.push({
          code: 'cue_leakage',
          severity: 'error',
          message: 'Question leaks most of the answer text',
        });
      }
    } else {
      const shortRubricItems =
        card.rubric?.filter(item => item.trim().length < 12).length ?? 0;
      if (shortRubricItems > 0) {
        issues.push({
          code: 'rubric_too_shallow',
          severity: 'warning',
          message: 'Rubric contains short or non-checkable criteria',
        });
      }
    }

    return { cardId: card.id, issues };
  });

  const synthesisCards = cards.filter(card => card.type === 'synthesis');
  if (
    synthesisCards.length >= 3 &&
    synthesisCards.filter(card => SCENARIO_PROMPT_PATTERN.test(card.question))
      .length === 0
  ) {
    const firstSynthesis = synthesisCards[0];
    if (firstSynthesis) {
      const report = reports.find(item => item.cardId === firstSynthesis.id);
      report?.issues.push({
        code: 'weak_prompt',
        severity: 'warning',
        message:
          'No scenario/debugging synthesis cards detected in accepted set',
      });
    }
  }

  const aiReports = options?.aiEvaluator
    ? await options.aiEvaluator.evaluate(cards)
    : [];
  const mergedReports = mergeReports(reports, aiReports);
  const blocking = mergedReports.filter(report =>
    report.issues.some(issue => issue.severity === 'error')
  );
  const warnings = mergedReports.filter(
    report =>
      !report.issues.some(issue => issue.severity === 'error') &&
      report.issues.some(issue => issue.severity === 'warning')
  );

  return {
    reports: mergedReports,
    blocking,
    warnings,
  };
}

export function buildQualityGateErrorMessage(
  cards: StudyCardPreview[],
  blocking: StudyCardQualityReport[]
): string {
  const byId = new Map(cards.map(card => [card.id, card]));
  const lines = blocking.slice(0, 3).map(report => {
    const card = byId.get(report.cardId);
    const firstIssue = report.issues.find(issue => issue.severity === 'error');
    return `- "${questionSnippet(card?.question ?? 'Unknown card')}" (${firstIssue?.message ?? 'quality issue'})`;
  });
  const suffix =
    blocking.length > 3
      ? `\n- ...and ${blocking.length - 3} more cards with blocking issues`
      : '';
  return `Some accepted cards failed quality checks. Deselect or regenerate these cards before saving:\n${lines.join('\n')}${suffix}`;
}
