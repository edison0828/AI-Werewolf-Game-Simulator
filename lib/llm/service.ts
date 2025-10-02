import type { Alignment, LogEntry, PlayerState } from '../game/types';

export type LLMLanguage = 'zh-Hant' | 'en';

export interface LLMSpeechContext {
  day: number;
  phase: 'day-discussion' | 'day-vote';
  topic: 'discussion' | 'vote';
  speaker: PlayerState;
  alivePlayers: Array<{
    id: string;
    name: string;
    alignment?: Alignment;
    isHuman: boolean;
  }>;
  recentLogs: LogEntry[];
  language: LLMLanguage;
  suggestedTargetId?: string;
}

export interface LLMService {
  generateSpeech(context: LLMSpeechContext): Promise<string>;
}

export const createLLMService = (): LLMService => new HttpLLMService();

class HttpLLMService implements LLMService {
  async generateSpeech(context: LLMSpeechContext): Promise<string> {
    const prompt = buildPrompt(context);
    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          temperature: context.topic === 'vote' ? 0.6 : 0.85,
          language: context.language
        })
      });

      if (!response.ok) {
        throw new Error(`LLM request failed with status ${response.status}`);
      }

      const data: { content?: string } = await response.json();
      const text = data.content?.trim();
      if (!text) {
        throw new Error('Empty LLM response');
      }
      return truncate(text, 220);
    } catch (error) {
      console.warn('[LLM] Falling back to template speech:', error);
      return fallbackSpeech(context);
    }
  }
}

function buildPrompt(context: LLMSpeechContext): string {
  const { speaker, alivePlayers, day, phase, recentLogs, topic, language } = context;
  const locale = language === 'en' ? 'English' : 'Traditional Chinese';
  const aliveSummary = alivePlayers
    .map((player) => {
      const humanTag = player.isHuman ? (language === 'en' ? 'human' : '真人') : 'AI';
      return `${player.name} (${humanTag})`;
    })
    .join('、');
  const targetName = context.suggestedTargetId
    ? alivePlayers.find((player) => player.id === context.suggestedTargetId)?.name
    : undefined;
  const phaseLabel = phase === 'day-discussion' ? (language === 'en' ? 'daytime discussion' : '白天討論階段') : language === 'en' ? 'daytime voting' : '白天投票階段';
  const logsSnippet = recentLogs
    .map((log) => `${log.phase === 'night' ? (language === 'en' ? 'Night' : '夜晚') : ''}${log.message}`)
    .slice(-6)
    .join('\n');

  const objectives: Record<string, string> = {
    Werewolf:
      language === 'en'
        ? 'You are a werewolf. Protect your pack and mislead the villagers without revealing yourself.'
        : '你是狼人，請保護同伴並在不暴露自己的情況下誤導好人。',
    Seer:
      language === 'en'
        ? 'You are the Seer. Guide the village with subtle hints drawn from your nightly visions.'
        : '你是預言家，請巧妙利用夜晚得知的資訊引導大家。',
    Witch:
      language === 'en'
        ? 'You are the Witch. Balance empathy and caution while hinting at the use of your potions.'
        : '你是女巫，請在不暴露自己能力的情況下提到解藥與毒藥的抉擇。',
    Hunter:
      language === 'en'
        ? 'You are the Hunter. Calmly warn others that rash votes may trigger your final shot.'
        : '你是獵人，提醒眾人不要魯莽投票，以免觸發你的反擊。',
    Villager:
      language === 'en'
        ? 'You are a Villager. Share grounded suspicions and encourage teamwork.'
        : '你是村民，請提出合理懷疑並鼓勵合作。'
  };

  const baseInstruction = objectives[speaker.role.name] ?? '';

  const voteClause =
    topic === 'vote'
      ? targetName
        ? language === 'en'
          ? `You plan to vote for ${targetName}. Clearly state this choice and briefly explain why.`
          : `你計畫投給 ${targetName}，請明確表態並簡短說明理由。`
        : language === 'en'
        ? 'End your response with a clear statement about who you intend to vote for.'
        : '結尾請清楚表態你想投給誰。'
      : language === 'en'
      ? 'Keep your tone conversational and immersive as if role-playing at the table.'
      : '維持帶入情境的語氣，就像在桌遊現場扮演角色。';

  return `You are role-playing ${speaker.displayName} in a social deduction game (Werewolf). Respond in ${locale}.
Current phase: Day ${day} - ${phaseLabel}.
Your role card: ${speaker.role.name} (${speaker.role.alignment}).
${baseInstruction}
Alive players: ${aliveSummary}.
Recent public events:
${logsSnippet || (language === 'en' ? 'No significant events yet.' : '目前沒有特別事件。')}
${voteClause}
Speak in 1-2 concise sentences.`;
}

function fallbackSpeech(context: LLMSpeechContext): string {
  const templates: Record<string, string[]> = {
    Werewolf: [
      '先別急著下結論，我覺得真正的狼人正躲在話題邊緣。',
      '今晚太詭異了，大家互相盯緊一點，別讓狼人得逞。'
    ],
    Seer: [
      '我觀察到一些蛛絲馬跡，建議大家留意那些回答閃避的人。',
      '昨晚的直覺讓我不太放心某些玩家，稍後我會再觀察。'
    ],
    Witch: [
      '女巫的直覺告訴我，有人刻意轉移視線，別太快相信表面。',
      '我還在衡量該不該使用藥水，大家別急著互相猜忌。'
    ],
    Hunter: [
      '先別亂投，我會冷靜判斷，若有人攻擊我，我的子彈不會放過他。',
      '保持冷靜，真正的狼人最怕我們團結。'
    ],
    Villager: [
      '大家說話時多注意細節，我總覺得有人心虛。',
      '我會繼續觀察，希望我們能找出真正的狼人。'
    ]
  };

  const lines = templates[context.speaker.role.name] ?? templates.Villager;
  return lines[Math.floor(Math.random() * lines.length)];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
