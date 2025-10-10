import { NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

interface RequestBody {
  prompt?: string;
  temperature?: number;
  language?: "zh-Hant" | "en";
}

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const systemPrompt =
    body.language === 'en'
      ? 'You are a dramatic AI actor performing in a live Werewolf social deduction game. Deliver thoughtful, structured responses that follow the requested format, stay in character, and stay grounded in the provided context.'
      : '你是一位投入狼人殺桌遊的 AI 演員。請依照提示格式給出有條理、引用當前資訊的角色化回應。';

  try {
    const payload: Record<string, unknown> = {
      model: DEFAULT_MODEL,
      reasoning: { effort: body.language === 'en' ? 'medium' : 'low' },
      max_output_tokens: 800,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: body.prompt }]
        }
      ]
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[LLM] Provider error', response.status, error);
      return NextResponse.json(
        { error: 'LLM provider error', detail: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content: string =
      typeof data.output_text === 'string' && data.output_text.trim()
        ? data.output_text
        : extractTextFromResponse(data);
    if (!content?.trim()) {
      console.error('[LLM] Provider returned empty content payload', data);
    }
    return NextResponse.json({ content: content.trim() });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to contact LLM provider", detail: `${error}` },
      { status: 500 }
    );
  }
}

function extractTextFromResponse(data: any): string {
  if (!data || !Array.isArray(data.output)) {
    return "";
  }

  for (const item of data.output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }
    const parts = item.content
      .filter(
        (part: any) =>
          (part?.type === "output_text" || part?.type === "text") &&
          typeof part.text === "string"
      )
      .map((part: any) => part.text as string)
      .join("")
      .trim();
    if (parts) {
      return parts;
    }
  }

  return "";
}
