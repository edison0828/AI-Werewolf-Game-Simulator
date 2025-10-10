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
  roleIntel?: string[];
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
          language: context.language
        })
      });
      const responseClone = response.clone();
      let payload: any = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        console.error('[LLM] Failed to parse response JSON', parseError);
      }

      if (!response.ok) {
        let detail: string | undefined;
        if (payload && typeof payload === 'object') {
          const candidate = (payload as { detail?: unknown; error?: unknown }).detail ?? (payload as { error?: unknown }).error;
          if (typeof candidate === 'string') {
            detail = candidate;
          } else if (candidate) {
            detail = JSON.stringify(candidate);
          } else {
            detail = JSON.stringify(payload);
          }
        }
        if (!detail) {
          try {
            detail = await responseClone.text();
          } catch (readError) {
            console.error('[LLM] Failed to read response text', readError);
          }
        }
        console.error('[LLM] Request failed', response.status, detail);
        throw new Error(`LLM request failed (${response.status}): ${detail || 'Unknown error'}`);
      }

      const data: { content?: string } = payload ?? {};
      const text = data.content?.trim();
      if (!text) {
        console.error('[LLM] Empty content from /api/llm', {
          promptPreview: prompt.slice(0, 160),
          responsePayload: payload
        });
        throw new Error('Empty LLM response');
      }
      return truncate(text, 480);
    } catch (error) {
      console.warn('[LLM] Falling back to template speech:', {
        error,
        promptPreview: prompt.slice(0, 160),
        speaker: context.speaker.displayName,
        topic: context.topic
      });
      return fallbackSpeech(context);
    }
  }
}

function buildPrompt(context: LLMSpeechContext): string {
  const { speaker, alivePlayers, day, phase, recentLogs, topic, language, roleIntel = [] } = context;
  const isEnglish = language === 'en';
  const locale = isEnglish ? 'English' : '繁體中文';
  const aliveSummary = alivePlayers
    .map((player) => {
      const humanTag = player.isHuman ? (isEnglish ? 'human' : '真人') : 'AI';
      return `${player.name} (${humanTag})`;
    })
    .join(isEnglish ? ', ' : '、');
  const targetName = context.suggestedTargetId
    ? alivePlayers.find((player) => player.id === context.suggestedTargetId)?.name
    : undefined;
  const phaseLabel = (() => {
    if (phase === 'day-discussion') {
      return isEnglish ? 'daytime discussion' : '白天討論階段';
    }
    if (phase === 'day-vote') {
      return isEnglish ? 'daytime voting' : '白天投票階段';
    }
    if (phase === 'night') {
      return isEnglish ? 'night actions' : '夜晚階段';
    }
    return isEnglish ? 'game flow' : '遊戲流程';
  })();
  const logsSnippet = recentLogs
    .slice(-6)
    .map((log) => {
      const prefix =
        log.phase === 'night'
          ? isEnglish
            ? '[Night] '
            : '【夜晚】'
          : '';
      return `${prefix}${log.message}`;
    })
    .join('\n');

  const alignmentLabel =
    speaker.role.alignment === 'Good'
      ? isEnglish
        ? 'Good faction'
        : '好人陣營'
      : isEnglish
      ? 'Werewolf faction'
      : '狼人陣營';

  const roleObjectives: Record<string, string> = {
    Werewolf: isEnglish
      ? 'As a werewolf, misdirect the village, shield your pack, and avoid any slips that expose you.'
      : '身為狼人，請誤導村民、掩護同伴，避免暴露任何蛛絲馬跡。',
    Seer: isEnglish
      ? 'As the Seer, leverage your nightly visions to guide the village without painting a target on yourself.'
      : '身為預言家，運用夜晚查驗所得線索引導村民，同時避免讓狼人鎖定你。',
    Witch: isEnglish
      ? 'As the Witch, decide when to use your elixir or poison and subtly hint at your influence.'
      : '身為女巫，衡量何時使用解藥或毒藥，並透過適度暗示來影響局勢。',
    Hunter: isEnglish
      ? 'As the Hunter, warn others that eliminating you recklessly could trigger your final shot.'
      : '身為獵人，提醒眾人勿魯莽放逐你，必要時記得死前帶走狼人。',
    Villager: isEnglish
      ? 'As a Villager, rely on logic and social reads to uncover the werewolves.'
      : '身為村民，運用推理與社交讀取來揪出狼人。'
  };

  const filteredIntel = roleIntel.filter((item) => item && item.trim().length);
  const intelSection = filteredIntel.length
    ? (isEnglish
        ? `Private intel:\n- ${filteredIntel.join('\n- ')}`
        : `祕密情報：\n- ${filteredIntel.join('\n- ')}`)
    : isEnglish
    ? 'Private intel: none beyond the public events.'
    : '祕密情報：目前沒有額外線索，請依公開資訊推理。';

  const discussionSteps = isEnglish
    ? `Follow these objectives:\n1. Information recap – highlight last night's events or notable speeches.\n2. Suspicion callouts – name 1-2 suspicious players with concrete reasons.\n3. Allies and protection – state who you trust or need to shield and why.\n4. Strategic advice – propose the next steps for your faction.`
    : `請依序完成以下目標：\n1. 情報整理：點出昨夜事件與近期發言重點。\n2. 狼嫌推斷：列出1-2名可疑玩家並說明線索。\n3. 盟友評估：指出值得信任或保護的對象與理由。\n4. 策略建議：提出你陣營的下一步行動。`;

  const discussionFormat = isEnglish
    ? `Respond using this structure:\n[Information]\n- ...\n[Reasoning]\n- ...\n[Next Steps]\n- ...`
    : `請使用以下格式輸出：\n【情報整理】\n- ...\n【推理重點】\n- ...\n【策略方向】\n- ...`;

  const voteSteps = isEnglish
    ? `Before voting, cover:\n1. Information recap – current state and relevant clues.\n2. Vote rationale – justify your chosen target with evidence.\n3. Risk check – mention possible downsides or backup plans.`
    : `投票前請完成以下任務：\n1. 情報整理：回顧場上局勢與關鍵線索。\n2. 投票理由：說明你支持的目標與具體證據。\n3. 風險檢視：提醒可能的後果或備案。`;

  const voteFormat = isEnglish
    ? `Respond using this structure:\n[Information]\n- ...\n[Vote Rationale]\n- ...\n[Risk Check]\n- ...\n[Vote Decision] I vote for <name>.`
    : `請使用以下格式輸出：\n【情報整理】\n- ...\n【投票理由】\n- ...\n【風險評估】\n- ...\n【投票決定】我投給 <玩家名稱>。`;

  const voteTargetGuide = targetName
    ? isEnglish
      ? `Teammates suggest voting for ${targetName}. You may follow or overrule this, but justify your final decision clearly.`
      : `隊友建議將票投給「${targetName}」。你可以順從或改變決定，但務必清楚說明最終選擇。`
    : isEnglish
    ? 'State exactly who receives your vote at the end.'
    : '結尾請精準寫出你要投給的玩家。';

  const toneGuide = isEnglish
    ? 'Keep an in-character, dramatic table-talk tone while staying concise and purposeful.'
    : '維持入戲、具張力的桌遊語氣，同時保持重點明確。';

  const missionGuide = topic === 'vote' ? voteSteps : discussionSteps;
  const formatGuide = topic === 'vote' ? voteFormat : discussionFormat;
  const targetGuide = topic === 'vote' ? voteTargetGuide : '';
  const logsSection =
    logsSnippet ||
    (isEnglish ? 'No major public events have been recorded yet.' : '目前沒有公開的新事件。');
  const playersLine =
    aliveSummary ||
    (isEnglish ? 'Only you remain alive.' : '場上僅剩你一人存活。');

  return [
    isEnglish
      ? `You are role-playing ${speaker.displayName} in a live Werewolf social deduction game. Respond in ${locale}.`
      : `你正在扮演狼人殺遊戲中的 ${speaker.displayName}，請以${locale}發言。`,
    `${isEnglish ? 'Current phase' : '當前階段'}：第 ${day} 天 · ${phaseLabel}`,
    `${isEnglish ? 'Role' : '角色'}：${speaker.role.name}（${alignmentLabel}）。${roleObjectives[speaker.role.name] ?? ''}`,
    `${isEnglish ? 'Role description' : '能力摘要'}：${speaker.role.description}`,
    intelSection,
    `${isEnglish ? 'Alive players' : '存活玩家'}：${playersLine}`,
    `${isEnglish ? 'Recent public events' : '近期公開事件'}：\n${logsSection}`,
    missionGuide,
    formatGuide,
    targetGuide,
    toneGuide,
    isEnglish
      ? 'Answer in 3-5 compact paragraphs or bullet groups respecting the structure above.'
      : '請以 3-5 個段落或條列完成上述格式，內容務必精鍊有層次。'
  ]
    .filter(Boolean)
    .join('\n');
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
