function stripMarkdownJsonFence(text: string): string {
  let result = text.trim();
  const openFence = result.match(/^```(?:json)?\s*\n?/i);
  if (openFence) {
    result = result.slice(openFence[0].length);
  }
  const closeFence = result.match(/\n?```\s*$/);
  if (closeFence) {
    result = result.slice(0, -closeFence[0].length);
  }
  return result.trim();
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth++;
      continue;
    }
    if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function trimTrailingPartialJson(text: string): string {
  let candidate = text.trim();
  for (let i = 0; i < 8; i++) {
    const next = candidate
      .replace(/,\s*$/, '')
      .replace(/:\s*$/, '')
      .replace(/,\s*"[^"]*$/, '')
      .replace(/:\s*"[^"]*$/, '')
      .replace(/,\s*\{[\s\S]*$/, '')
      .replace(/,\s*\[[^\]]*$/, '');
    if (next === candidate) break;
    candidate = next;
  }
  return candidate;
}

function closeOpenJsonContainers(text: string): string {
  let depthBrace = 0;
  let depthBracket = 0;
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depthBrace++;
    if (char === '}') depthBrace--;
    if (char === '[') depthBracket++;
    if (char === ']') depthBracket--;
  }

  let repaired = text;
  if (inString) {
    repaired += '"';
  }
  if (depthBracket > 0) {
    repaired += ']'.repeat(depthBracket);
  }
  if (depthBrace > 0) {
    repaired += '}'.repeat(depthBrace);
  }
  return repaired;
}

function repairTruncatedJsonObject(text: string): string | null {
  const stripped = stripMarkdownJsonFence(text);
  const start = stripped.indexOf('{');
  if (start === -1) return null;

  let candidate = trimTrailingPartialJson(stripped.slice(start));
  if (!candidate.endsWith('}')) {
    candidate = closeOpenJsonContainers(candidate);
  }
  return candidate;
}

function unwrapStudyCardsResult(json: unknown): unknown {
  if (
    json &&
    typeof json === 'object' &&
    'result' in json &&
    !('deckName' in json)
  ) {
    return (json as { result: unknown }).result;
  }
  return json;
}

function collectJsonCandidates(response: string): string[] {
  const text = response.replace(/^\uFEFF/, '').trim();
  const candidates = new Set<string>();

  const add = (value?: string | null) => {
    const trimmed = value?.trim();
    if (trimmed) {
      candidates.add(trimmed);
    }
  };

  add(text);
  add(stripMarkdownJsonFence(text));
  add(extractFirstJsonObject(text));
  add(extractFirstJsonObject(stripMarkdownJsonFence(text)));
  add(repairTruncatedJsonObject(text));

  for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    add(match[1]);
    add(extractFirstJsonObject(match[1] ?? ''));
    add(repairTruncatedJsonObject(match[1] ?? ''));
  }

  return [...candidates];
}

export function parseStudyCardsGenerateJson(response: string): unknown {
  const text = response.replace(/^\uFEFF/, '').trim();
  const candidates = collectJsonCandidates(response);
  for (const candidate of candidates) {
    try {
      return unwrapStudyCardsResult(JSON.parse(candidate));
    } catch {
      continue;
    }
  }

  const likelyTruncated =
    text.includes('{') &&
    (!text.trimEnd().endsWith('}') || extractFirstJsonObject(text) === null);

  if (likelyTruncated) {
    throw new Error(
      'Study deck response was truncated before JSON completed. Try again with Claude Opus, or generate from a shorter note section.'
    );
  }

  throw new Error(
    `Failed to parse study cards JSON. Response preview: ${text.slice(0, 200)}`
  );
}
