import { NextResponse } from 'next/server';

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

interface RequestBody {
  prompt?: string;
  temperature?: number;
  language?: 'zh-Hant' | 'en';
}

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 503 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const messages = [
    {
      role: 'system',
      content:
        body.language === 'en'
          ? 'You are a dramatic AI actor performing in a live Werewolf social deduction game. Keep responses short, grounded in the provided context, and fully in character.'
          : '你是一位投入狼人殺桌遊的 AI 演員。請根據提供的資訊給出簡潔、符合角色設定的回應。'
    },
    { role: 'user', content: body.prompt }
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: body.temperature ?? 0.8,
        max_tokens: 160,
        messages
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'LLM provider error', detail: error }, { status: response.status });
    }

    const data = await response.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;
    return NextResponse.json({ content: content?.trim() ?? '' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to contact LLM provider', detail: `${error}` }, { status: 500 });
  }
}
