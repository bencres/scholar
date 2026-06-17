import {
  type StreamObject,
  StreamObjectSchema,
} from '../components/ai-chat-messages';

export function mergeStreamObjects(chunks: StreamObject[] = []) {
  return chunks.reduce((acc, curr) => {
    const prev = acc.at(-1);
    switch (curr.type) {
      case 'reasoning':
      case 'text-delta': {
        if (prev && prev.type === curr.type) {
          acc[acc.length - 1] = {
            ...prev,
            textDelta: prev.textDelta + curr.textDelta,
          };
        } else {
          acc.push(curr);
        }
        break;
      }
      case 'tool-result': {
        const index = acc.findIndex(
          item =>
            item.type === 'tool-call' &&
            item.toolCallId === curr.toolCallId &&
            item.toolName === curr.toolName
        );
        if (index !== -1) {
          acc[index] = curr;
        } else {
          acc.push(curr);
        }
        break;
      }
      default: {
        acc.push(curr);
        break;
      }
    }
    return acc;
  }, [] as StreamObject[]);
}

export function mergeStreamContent(chunks: StreamObject[]): string {
  return chunks.reduce((acc, curr) => {
    if (curr.type === 'text-delta') {
      acc += curr.textDelta;
    }
    return acc;
  }, '');
}

export async function collectStreamText(
  stream: AsyncIterable<string>,
  options?: { onChunk?: (index: number) => void }
): Promise<string> {
  let plainText = '';
  let streamObjects: StreamObject[] = [];
  let chunkIndex = 0;
  for await (const chunk of stream) {
    options?.onChunk?.(chunkIndex++);
    try {
      const parsed = StreamObjectSchema.safeParse(JSON.parse(chunk));
      if (parsed.success) {
        streamObjects = mergeStreamObjects([...streamObjects, parsed.data]);
      } else {
        plainText += chunk;
      }
    } catch {
      plainText += chunk;
    }
  }
  const text = mergeStreamContent(streamObjects);
  return text || plainText;
}
