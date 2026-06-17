import { describe, expect, test } from 'vitest';

import { getFallbackChatModels, mapPromptModels } from './chat-models';

describe('chat-models', () => {
  test('provides Claude chat model fallbacks', () => {
    expect(getFallbackChatModels()).toEqual([
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        version: 'Haiku 4.5',
        category: 'Claude',
        isPro: false,
        isDefault: false,
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        version: 'Sonnet 4.6',
        category: 'Claude',
        isPro: false,
        isDefault: true,
      },
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        version: 'Opus 4.6',
        category: 'Claude',
        isPro: true,
        isDefault: false,
      },
    ]);
  });

  test('maps prompt models from the server', () => {
    expect(
      mapPromptModels({
        defaultModel: 'claude-sonnet-4-6',
        optionalModels: [
          { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
          { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
        ],
        proModels: [{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' }],
      })
    ).toEqual([
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        version: 'Haiku 4.5',
        category: 'Claude',
        isPro: false,
        isDefault: false,
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        version: 'Sonnet 4.6',
        category: 'Claude',
        isPro: false,
        isDefault: true,
      },
    ]);
  });
});
