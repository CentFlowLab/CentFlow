const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function callAnthropic(input: {
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: input.maxTokens ?? 512,
      system: input.system,
      messages: [{ role: 'user', content: input.user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Anthropic API error status', response.status);
    throw new Error(`Anthropic API failed: ${response.status} ${detail.slice(0, 120)}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Anthropic response missing text');
  }
  return text.trim();
}

export function parseJsonFromText<T>(text: string): T | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
