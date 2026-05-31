import { describe, expect, it } from 'vitest';

import {
  buildQualityGateErrorMessage,
  evaluateStudyCardSelection,
} from './card-quality-evaluator';

describe('study card quality evaluator', () => {
  it('flags blocking issues for duplicate and multiple-choice cards', async () => {
    const evaluation = await evaluateStudyCardSelection([
      {
        id: 'a',
        type: 'recall',
        question: 'What is HTTP?',
        answer: 'Protocol',
        accepted: true,
      },
      {
        id: 'b',
        type: 'recall',
        question: 'What is HTTP?',
        answer: 'Application protocol for web communication.',
        accepted: true,
      },
      {
        id: 'c',
        type: 'synthesis',
        question: 'A) cache hit B) cache miss C) timeout D) retry',
        rubric: ['identifies likely bottleneck', 'explains remediation path'],
        accepted: true,
      },
    ]);

    expect(evaluation.blocking.length).toBeGreaterThan(0);
    expect(
      evaluation.blocking.some(report =>
        report.issues.some(issue => issue.code === 'duplicate_question')
      )
    ).toBe(true);
    expect(
      evaluation.blocking.some(report =>
        report.issues.some(issue => issue.code === 'multiple_choice_detected')
      )
    ).toBe(true);
  });

  it('merges optional ai evaluator reports', async () => {
    const evaluation = await evaluateStudyCardSelection(
      [
        {
          id: 'a',
          type: 'recall',
          question: 'Why use retries with exponential backoff?',
          answer:
            'It reduces retry storms and gives dependencies time to recover.',
          accepted: true,
        },
      ],
      {
        aiEvaluator: {
          evaluate: async () => [
            {
              cardId: 'a',
              issues: [
                {
                  code: 'weak_prompt',
                  severity: 'warning',
                  message:
                    'AI rubric suggests adding a concrete failure scenario',
                },
              ],
            },
          ],
        },
      }
    );

    expect(evaluation.warnings).toHaveLength(1);
    expect(evaluation.warnings[0]?.cardId).toBe('a');
  });

  it('formats a concise quality gate error summary', () => {
    const message = buildQualityGateErrorMessage(
      [
        {
          id: 'a',
          type: 'recall',
          question: 'What is CAP theorem in distributed systems?',
          answer:
            'Consistency, availability and partition tolerance tradeoffs.',
          accepted: true,
        },
      ],
      [
        {
          cardId: 'a',
          issues: [
            {
              code: 'cue_leakage',
              severity: 'error',
              message: 'Question leaks most of the answer text',
            },
          ],
        },
      ]
    );

    expect(message).toContain('failed quality checks');
    expect(message).toContain('Question leaks most of the answer text');
  });
});
