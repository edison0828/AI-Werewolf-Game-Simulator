import { createLLMService, type LLMService, type LLMLanguage, type LLMSpeechContext } from '../llm/service';
import { BASE_ROLES_CONFIG, DEFAULT_PLAYER_NAMES, ROLE_LIBRARY } from './config';
import type {
  Alignment,
  EngineSnapshot,
  GameConfig,
  GamePhase,
  HumanActionRequest,
  HumanActionType,
  LogEntry,
  PlayerState,
  SubmitHumanActionPayload
} from './types';
import { createId, getAlivePlayers, getRandomAliveTarget, shuffle } from './utils';

interface NightContext {
  step: 'intro' | 'werewolf' | 'seer' | 'witch-heal' | 'witch-poison' | 'resolution' | 'complete';
  werewolfTarget?: string;
  seerQueue: string[];
  witchQueue: string[];
  healedTarget?: string;
  poisonedTarget?: string;
  poisonAsked: boolean;
}

interface DiscussionContext {
  index: number;
  speakers: string[];
}

interface VoteContext {
  index: number;
  voters: string[];
  votes: Record<string, string>;
}

interface HunterPendingContext {
  playerId: string;
  cause: string;
}

export class GameEngine {
  private config: GameConfig;
  private readonly llm: LLMService;
  private players: PlayerState[] = [];
  private phase: GamePhase = 'idle';
  private day = 0;
  private logs: EngineSnapshot['logs'] = [];
  private pendingRequest?: HumanActionRequest;
  private winner?: Alignment | 'None';

  private nightContext?: NightContext;
  private discussionContext?: DiscussionContext;
  private voteContext?: VoteContext;
  private hunterContext?: HunterPendingContext;

  constructor(config: GameConfig, llm: LLMService = createLLMService()) {
    this.config = config;
    this.llm = llm;
  }

  public start(config?: Partial<GameConfig>): EngineSnapshot {
    this.config = { ...this.config, ...config, humanPlayers: config?.humanPlayers ?? this.config.humanPlayers };
    const rolePool = BASE_ROLES_CONFIG[this.config.totalPlayers] ?? BASE_ROLES_CONFIG[6];
    const playerNames = [...DEFAULT_PLAYER_NAMES];

    const assignedRoles = shuffle(rolePool, this.config.seed);

    this.players = assignedRoles.map((roleName, index) => {
      const baseName = playerNames[index] ?? `玩家 ${index + 1}`;
      const human = this.config.humanPlayers.find((p) => p.id === String(index + 1));
      const displayName = human?.displayName ?? baseName;
      return {
        id: String(index + 1),
        displayName,
        role: ROLE_LIBRARY[roleName],
        isAlive: true,
        isHuman: Boolean(human),
        notes: roleName === 'Witch' ? { healAvailable: true, poisonAvailable: true } : {}
      } satisfies PlayerState;
    });

    this.day = 0;
    this.phase = 'night';
    this.logs = [];
    this.winner = undefined;
    this.pendingRequest = undefined;
    this.nightContext = undefined;
    this.voteContext = undefined;
    this.discussionContext = undefined;
    this.hunterContext = undefined;

    this.appendLog('遊戲開始，角色已分發。夜幕低垂……', 'night');
    return this.snapshot();
  }

  public getSnapshot(): EngineSnapshot {
    return this.snapshot();
  }

  public async progress(): Promise<EngineSnapshot> {
    if (this.pendingRequest) return this.snapshot();

    switch (this.phase) {
      case 'night':
        await this.handleNightPhase();
        break;
      case 'day-discussion':
        await this.handleDiscussionPhase();
        break;
      case 'day-vote':
        await this.handleVotePhase();
        break;
      case 'game-over':
      default:
        break;
    }

    return this.snapshot();
  }

  public async submitHumanAction(payload: SubmitHumanActionPayload): Promise<EngineSnapshot> {
    if (!this.pendingRequest || this.pendingRequest.requestId !== payload.requestId) {
      return this.snapshot();
    }

    const { type, playerId } = this.pendingRequest;
    const player = this.players.find((p) => p.id === playerId);
    const nightCtx = this.nightContext;
    if (!player) {
      this.pendingRequest = undefined;
      return this.snapshot();
    }

    switch (type) {
      case 'werewolf-target':
        if (payload.chosenOptionId) {
          if (nightCtx) {
            nightCtx.werewolfTarget = payload.chosenOptionId;
            nightCtx.step = 'seer';
          }
          this.appendLog(`${player.displayName} 選擇在夜裡盯上 ${this.resolveName(payload.chosenOptionId)}。`, 'night', ['private']);
        }
        break;
      case 'seer-check':
        if (payload.chosenOptionId) {
          const target = this.players.find((p) => p.id === payload.chosenOptionId);
          if (target) {
            const alignment = target.role.alignment === 'Werewolf' ? '狼人' : '好人';
            player.notes.seerResults = {
              ...(player.notes.seerResults as Record<string, string> | undefined),
              [target.id]: alignment
            };
            this.appendLog(`${player.displayName} 在夜裡窺探了一名玩家的真實面目。`, 'night', ['private']);
          }
        }
        break;
      case 'witch-heal':
        if (payload.chosenOptionId === 'skip') {
          // no heal
        } else if (payload.chosenOptionId) {
          if (nightCtx) {
            nightCtx.healedTarget = payload.chosenOptionId;
          }
          player.notes.healAvailable = false;
          this.appendLog(`${player.displayName} 運用了解藥的力量拯救了一條性命。`, 'night', ['private']);
        }
        break;
      case 'witch-poison':
        if (payload.chosenOptionId && payload.chosenOptionId !== 'skip') {
          if (nightCtx) {
            nightCtx.poisonedTarget = payload.chosenOptionId;
          }
          player.notes.poisonAvailable = false;
          this.appendLog(`${player.displayName} 在夜裡悄悄地下了毒。`, 'night', ['private']);
        }
        if (nightCtx) {
          nightCtx.step = 'resolution';
        }
        break;
      case 'day-speech':
        if (payload.text) {
          this.appendLog(`🎤 ${player.displayName}：${payload.text.trim()}`, 'day-discussion');
        }
        break;
      case 'day-vote':
        if (payload.chosenOptionId) {
          this.voteContext = this.voteContext ?? this.createVoteContext();
          this.voteContext.votes[player.id] = payload.chosenOptionId;
          this.appendLog(`${player.displayName} 投給了 ${this.resolveName(payload.chosenOptionId)}。`, 'day-vote');
        }
        break;
      case 'hunter-shoot':
        if (payload.chosenOptionId && payload.chosenOptionId !== 'skip') {
          this.eliminatePlayer(payload.chosenOptionId, `${player.displayName} 的獵人反擊`);
        }
        this.hunterContext = undefined;
        break;
      default:
        break;
    }

    this.pendingRequest = undefined;
    return this.progress();
  }

  private createNightContext(): NightContext {
    const seerQueue = getAlivePlayers(this.players)
      .filter((p) => p.role.name === 'Seer')
      .map((p) => p.id);
    const witchQueue = getAlivePlayers(this.players)
      .filter((p) => p.role.name === 'Witch')
      .map((p) => p.id);
    return {
      step: 'intro',
      seerQueue,
      witchQueue,
      poisonAsked: false
    };
  }

  private createVoteContext(): VoteContext {
    const voters = getAlivePlayers(this.players).map((p) => p.id);
    return { index: 0, voters, votes: {} };
  }

  private createDiscussionContext(): DiscussionContext {
    const speakers = getAlivePlayers(this.players).map((p) => p.id);
    return { index: 0, speakers };
  }

  private async handleNightPhase(): Promise<void> {
    this.nightContext = this.nightContext ?? this.createNightContext();
    const ctx = this.nightContext;

    while (!this.pendingRequest && ctx.step !== 'complete') {
      switch (ctx.step) {
        case 'intro':
          this.day += 1;
          this.appendLog(`🌙 第 ${this.day} 夜晚降臨。`, 'night');
          ctx.step = 'werewolf';
          break;
        case 'werewolf':
          this.resolveWerewolfAction(ctx);
          break;
        case 'seer':
          this.resolveSeerAction(ctx);
          break;
        case 'witch-heal':
          this.resolveWitchHeal(ctx);
          break;
        case 'witch-poison':
          this.resolveWitchPoison(ctx);
          break;
        case 'resolution':
          this.resolveNightOutcome(ctx);
          ctx.step = 'complete';
          break;
        case 'complete':
          break;
      }
    }

    if (ctx.step === 'complete' && !this.pendingRequest) {
      this.nightContext = undefined;
      if (this.phase !== 'game-over') {
        this.phase = 'day-discussion';
        this.discussionContext = this.createDiscussionContext();
        this.appendLog('白晝到來，村民聚集在廣場討論。', 'day-discussion');
      }
    }
  }

  private resolveWerewolfAction(ctx: NightContext): void {
    const werewolves = getAlivePlayers(this.players).filter((p) => p.role.name === 'Werewolf');
    const nonWolfCandidates = getAlivePlayers(this.players).filter((p) => p.role.alignment !== 'Werewolf');

    if (!werewolves.length || !nonWolfCandidates.length) {
      ctx.step = 'seer';
      return;
    }

    if (!ctx.werewolfTarget) {
      const humanWerewolf = werewolves.find((p) => p.isHuman);
      if (humanWerewolf) {
        const options = nonWolfCandidates.map((player) => ({ id: player.id, label: player.displayName }));
        this.pendingRequest = this.createRequest('werewolf-target', humanWerewolf, {
          title: '選擇今晚的攻擊目標',
          description: '請選擇一名非狼人陣營的玩家作為狼人夜襲的目標。',
          options
        });
        return;
      }
      const target = getRandomAliveTarget(this.players, (p) => p.role.alignment !== 'Werewolf');
      if (target) {
        ctx.werewolfTarget = target.id;
        this.appendLog(`狼群在暗夜中集結，似乎盯上了 ${target.displayName}。`, 'night', ['private']);
      }
    }

    ctx.step = 'seer';
  }

  private resolveSeerAction(ctx: NightContext): void {
    const seerId = ctx.seerQueue[0];
    if (!seerId) {
      ctx.step = 'witch-heal';
      return;
    }

    const seer = this.players.find((p) => p.id === seerId && p.isAlive);
    ctx.seerQueue = ctx.seerQueue.slice(1);

    if (!seer) {
      return; // skip to next seer
    }

    const candidates = getAlivePlayers(this.players).filter((p) => p.id !== seer.id);
    if (!candidates.length) {
      return;
    }

    if (seer.isHuman) {
      this.pendingRequest = this.createRequest('seer-check', seer, {
        title: '預言家查驗',
        description: '選擇一名玩家查驗他的陣營。',
        options: candidates.map((player) => ({ id: player.id, label: player.displayName }))
      });
      return;
    }

    const target = getRandomAliveTarget(this.players, (p) => p.id !== seer.id);
    if (target) {
      const alignment = target.role.alignment === 'Werewolf' ? '狼人' : '好人';
      seer.notes.seerResults = {
        ...(seer.notes.seerResults as Record<string, string> | undefined),
        [target.id]: alignment
      };
      this.appendLog(`${seer.displayName} 靜靜地窺探了某位玩家的身份。`, 'night', ['private']);
    }
  }

  private resolveWitchHeal(ctx: NightContext): void {
    const witchId = ctx.witchQueue[0];
    if (!witchId) {
      ctx.step = 'witch-poison';
      return;
    }

    const witch = this.players.find((p) => p.id === witchId && p.isAlive);
    ctx.witchQueue = ctx.witchQueue.slice(1);

    if (!witch) {
      return;
    }

    const healAvailable = Boolean(witch.notes.healAvailable);
    if (!healAvailable || !ctx.werewolfTarget) {
      return;
    }

    if (witch.isHuman) {
      const target = this.players.find((p) => p.id === ctx.werewolfTarget);
      if (!target) return;
      this.pendingRequest = this.createRequest('witch-heal', witch, {
        title: '女巫是否使用解藥？',
        description: `${target.displayName} 今晚遭到狼人襲擊，你要救他嗎？`,
        options: [
          { id: target.id, label: `救援 ${target.displayName}` },
          { id: 'skip', label: '不使用解藥' }
        ]
      });
      return;
    }

    if (Math.random() > 0.5) {
      ctx.healedTarget = ctx.werewolfTarget;
      witch.notes.healAvailable = false;
      this.appendLog(`${witch.displayName} 默默使用了解藥。`, 'night', ['private']);
    }
  }

  private resolveWitchPoison(ctx: NightContext): void {
    if (ctx.poisonAsked) {
      ctx.step = 'resolution';
      return;
    }

    const witchCandidates = getAlivePlayers(this.players).filter((p) => p.role.name === 'Witch' && p.notes.poisonAvailable);
    if (!witchCandidates.length) {
      ctx.step = 'resolution';
      return;
    }

    const witch = witchCandidates[0];

    const targets = getAlivePlayers(this.players).filter((p) => p.id !== witch.id);
    if (!targets.length) {
      ctx.step = 'resolution';
      return;
    }

    if (witch.isHuman) {
      ctx.poisonAsked = true;
      this.pendingRequest = this.createRequest('witch-poison', witch, {
        title: '要使用毒藥嗎？',
        description: '如果要毒殺，請選擇一位玩家；否則選擇略過。',
        options: [{ id: 'skip', label: '不使用毒藥' }, ...targets.map((t) => ({ id: t.id, label: t.displayName }))]
      });
      return;
    }

    ctx.poisonAsked = true;
    if (Math.random() > 0.75) {
      const target = getRandomAliveTarget(this.players, (p) => p.id !== witch.id);
      if (target) {
        ctx.poisonedTarget = target.id;
        witch.notes.poisonAvailable = false;
        this.appendLog(`${witch.displayName} 秘密地下了毒。`, 'night');
      }
    }

    ctx.step = 'resolution';
  }

  private resolveNightOutcome(ctx: NightContext): void {
    const killed: { id: string; cause: string }[] = [];
    if (ctx.werewolfTarget && ctx.werewolfTarget !== ctx.healedTarget) {
      killed.push({ id: ctx.werewolfTarget, cause: '狼人夜襲' });
    }
    if (ctx.poisonedTarget) {
      killed.push({ id: ctx.poisonedTarget, cause: '女巫的毒藥' });
    }

    if (!killed.length) {
      this.appendLog('這一夜異常平靜，沒有人死亡。', 'night');
    }

    for (const { id, cause } of killed) {
      this.eliminatePlayer(id, cause);
    }

    this.checkWinCondition();
  }

  private async handleDiscussionPhase(): Promise<void> {
    this.discussionContext = this.discussionContext ?? this.createDiscussionContext();
    const ctx = this.discussionContext;
    const speakerId = ctx.speakers[ctx.index];

    if (!speakerId) {
      this.phase = 'day-vote';
      this.voteContext = this.createVoteContext();
      this.appendLog('進入投票階段，請決定要放逐誰。', 'day-vote');
      return;
    }

    const speaker = this.players.find((p) => p.id === speakerId && p.isAlive);
    ctx.index += 1;
    if (!speaker) {
      return;
    }

    if (speaker.isHuman) {
      this.pendingRequest = this.createRequest('day-speech', speaker, {
        title: '輪到你發言',
        description: '請輸入你想對所有人說的話。',
        options: [],
        extraInput: {
          placeholder: '輸入你的發言內容…',
          multiline: true
        }
      });
      return;
    }

    const speechContext: LLMSpeechContext = {
      day: this.day,
      phase: 'day-discussion',
      speaker,
      alivePlayers: getAlivePlayers(this.players).map((p) => ({
        id: p.id,
        name: p.displayName,
        alignment: p.id === speaker.id ? p.role.alignment : undefined,
        isHuman: p.isHuman
      })),
      recentLogs: this.logs.slice(-8),
      language: 'zh-Hant',
      topic: 'discussion',
      roleIntel: this.describeRoleIntel(speaker, 'zh-Hant')
    };
    const speech = await this.llm.generateSpeech(speechContext);
    this.appendLog(`🎭 ${speaker.displayName}：${speech}`, 'day-discussion', ['ai-speech']);
  }

  private async handleVotePhase(): Promise<void> {
    if (this.hunterContext) {
      const hunter = this.players.find((p) => p.id === this.hunterContext.playerId);
      if (hunter) {
        if (hunter.isHuman) {
          const options = getAlivePlayers(this.players)
            .filter((p) => p.id !== hunter.id)
            .map((p) => ({ id: p.id, label: p.displayName }));
          this.pendingRequest = this.createRequest('hunter-shoot', hunter, {
            title: '獵人反擊',
            description: '你被淘汰了，可以帶走一個人。若不開槍請選擇略過。',
            options: [{ id: 'skip', label: '不開槍' }, ...options]
          });
          return;
        }
        const target = getRandomAliveTarget(this.players, (p) => p.id !== hunter.id);
        if (target) {
          this.eliminatePlayer(target.id, `${hunter.displayName} 的獵人反擊`);
        }
      }
      this.hunterContext = undefined;
      this.checkWinCondition();
      if (this.phase === 'game-over') return;
    }

    this.voteContext = this.voteContext ?? this.createVoteContext();
    const ctx = this.voteContext;
    const voterId = ctx.voters[ctx.index];

    if (!voterId) {
      this.resolveVotes();
      return;
    }

    const voter = this.players.find((p) => p.id === voterId && p.isAlive);
    ctx.index += 1;
    if (!voter) {
      return;
    }

    const options = getAlivePlayers(this.players)
      .filter((p) => p.id !== voter.id)
      .map((p) => ({ id: p.id, label: p.displayName }));

    if (!options.length) {
      return;
    }

    if (voter.isHuman) {
      this.pendingRequest = this.createRequest('day-vote', voter, {
        title: '投票放逐',
        description: '選擇你要投票的對象。',
        options
      });
      return;
    }

    const target = this.chooseAIVoteTarget(voter, options.map((o) => o.id));
    ctx.votes[voter.id] = target.id;
    const voteContext: LLMSpeechContext = {
      day: this.day,
      phase: 'day-vote',
      topic: 'vote',
      speaker: voter,
      alivePlayers: getAlivePlayers(this.players).map((p) => ({
        id: p.id,
        name: p.displayName,
        alignment: p.id === voter.id ? p.role.alignment : undefined,
        isHuman: p.isHuman
      })),
      recentLogs: this.logs.slice(-8),
      language: 'zh-Hant',
      suggestedTargetId: target.id,
      roleIntel: this.describeRoleIntel(voter, 'zh-Hant')
    };
    const reasoning = await this.llm.generateSpeech(voteContext);
    this.appendLog(`🗳️ ${voter.displayName} 投給了 ${target.displayName}。`, 'day-vote');
    if (reasoning) {
      this.appendLog(`🗣️ ${voter.displayName}：${reasoning}`, 'day-vote', ['ai-speech']);
    }
  }

  private resolveVotes(): void {
    this.voteContext = this.voteContext ?? this.createVoteContext();
    const tally: Record<string, number> = {};
    for (const voterId of Object.keys(this.voteContext.votes)) {
      const targetId = this.voteContext.votes[voterId];
      tally[targetId] = (tally[targetId] ?? 0) + 1;
    }

    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (!entries.length || entries.length > 1 && entries[0][1] === entries[1][1]) {
      this.appendLog('票數沒有結果，今晚無人被放逐。', 'day-vote');
    } else {
      const [targetId, votes] = entries[0];
      this.appendLog(`${this.resolveName(targetId)} 以 ${votes} 票被放逐。`, 'day-vote');
      this.eliminatePlayer(targetId, '白天投票');
    }

    this.voteContext = undefined;
    if (this.phase !== 'game-over') {
      this.phase = 'night';
      this.nightContext = undefined;
      this.appendLog('夜幕再次降臨，進入下一輪。', 'night');
    }
  }

  private eliminatePlayer(playerId: string, cause: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player || !player.isAlive) {
      return;
    }
    player.isAlive = false;
    this.appendLog(`☠️ ${player.displayName} (${player.role.name}) 因「${cause}」出局。`, this.phase);

    if (player.role.name === 'Hunter') {
      this.hunterContext = { playerId: player.id, cause };
    }
  }

  private checkWinCondition(): void {
    const alivePlayers = getAlivePlayers(this.players);
    const wolves = alivePlayers.filter((p) => p.role.alignment === 'Werewolf');
    const good = alivePlayers.filter((p) => p.role.alignment === 'Good');

    if (!wolves.length) {
      this.winner = 'Good';
      this.phase = 'game-over';
      this.appendLog('好人陣營成功殲滅所有狼人，獲得勝利！', 'game-over');
    } else if (wolves.length >= good.length) {
      this.winner = 'Werewolf';
      this.phase = 'game-over';
      this.appendLog('狼人陣營掌握了村莊，遊戲結束。', 'game-over');
    }
  }

  private createRequest(
    type: HumanActionType,
    player: PlayerState,
    payload: Pick<HumanActionRequest, 'title' | 'description' | 'options' | 'extraInput'>
  ): HumanActionRequest {
    return {
      requestId: createId(),
      playerId: player.id,
      role: player.role.name,
      type,
      ...payload
    };
  }

  private resolveName(playerId: string): string {
    return this.players.find((p) => p.id === playerId)?.displayName ?? `玩家 ${playerId}`;
  }

  private appendLog(message: string, phase: GamePhase, tags?: string[]): string {
    const entry = {
      id: createId(),
      day: this.day,
      phase,
      message,
      tags
    } satisfies LogEntry;
    this.logs = [...this.logs, entry];
    return entry.id;
  }

  private snapshot(): EngineSnapshot {
    return {
      day: this.day,
      phase: this.phase,
      players: this.players.map((player) => ({ ...player })),
      logs: this.logs,
      pendingRequest: this.pendingRequest,
      winner: this.winner
    };
  }

  private describeRoleIntel(player: PlayerState, language: LLMLanguage): string[] {
    const intel: string[] = [];
    const alivePlayers = getAlivePlayers(this.players);
    const isEnglish = language === 'en';

    switch (player.role.name) {
      case 'Werewolf': {
        const allies = alivePlayers
          .filter((p) => p.role.name === 'Werewolf' && p.id !== player.id)
          .map((p) => p.displayName);
        if (allies.length) {
          intel.push(
            isEnglish
              ? `Packmates still alive: ${allies.join(', ')}. Coordinate to divert suspicion.`
              : `狼人同伴：${allies.join('、')}，協助彼此掩護並分散村民注意力。`
          );
        } else {
          intel.push(
            isEnglish
              ? 'You are the last werewolf alive. Blend in and steer the vote carefully.'
              : '你是場上唯一存活的狼人，務必隱藏身份並誘導票型。'
          );
        }
        break;
      }
      case 'Seer': {
        const seerResults = player.notes.seerResults as Record<string, string> | undefined;
        if (seerResults && Object.keys(seerResults).length) {
          const lines = Object.entries(seerResults).map(([id, alignment]) => {
            const result = alignment === '狼人' ? (isEnglish ? 'Werewolf' : '狼人') : alignment === '好人' ? (isEnglish ? 'Good' : '好人') : alignment;
            return `${this.resolveName(id)}：${result}`;
          });
          intel.push(
            isEnglish
              ? `Identified alignments: ${lines.join('; ')}`
              : `你已查驗的結果：${lines.join('；')}`
          );
        } else {
          intel.push(
            isEnglish
              ? 'You have not shared any visions yet—decide when to reveal intel.'
              : '你尚未揭露查驗資訊，請善用夜晚能力並在適當時機分享線索。'
          );
        }
        break;
      }
      case 'Witch': {
        const healAvailable = player.notes.healAvailable !== false;
        const poisonAvailable = player.notes.poisonAvailable !== false;
        intel.push(
          isEnglish
            ? `Elixir status: ${healAvailable ? 'available' : 'used'}.`
            : `解藥狀態：${healAvailable ? '可用' : '已用完'}`
        );
        intel.push(
          isEnglish
            ? `Poison status: ${poisonAvailable ? 'available' : 'used'}.`
            : `毒藥狀態：${poisonAvailable ? '可用' : '已用完'}`
        );
        break;
      }
      case 'Hunter': {
        intel.push(
          isEnglish
            ? 'If eliminated (except by poison), you may take someone down with you—keep a target in mind.'
            : '若你被淘汰（非女巫毒死），可以立刻帶走一名玩家，請預先想好目標。'
        );
        break;
      }
      default:
        break;
    }

    return intel;
  }

  private chooseAIVoteTarget(voter: PlayerState, candidates: string[]): PlayerState {
    // 簡單策略：狼人優先票投查驗結果為好人的玩家，好人則隨機
    if (voter.role.name === 'Werewolf') {
      const targetId = candidates.find((id) => {
        const target = this.players.find((p) => p.id === id);
        return target?.role.alignment === 'Good';
      });
      if (targetId) {
        return this.players.find((p) => p.id === targetId)!;
      }
    }

    if (voter.role.name === 'Seer' && voter.notes.seerResults) {
      const wolfTarget = Object.entries(voter.notes.seerResults as Record<string, string>).find(
        ([id, alignment]) => alignment === '狼人' && candidates.includes(id)
      );
      if (wolfTarget) {
        return this.players.find((p) => p.id === wolfTarget[0])!;
      }
    }

    const index = Math.floor(Math.random() * candidates.length);
    const chosenId = candidates[index];
    return this.players.find((p) => p.id === chosenId)!;
  }
}

export const createEngine = (config: GameConfig, llm?: LLMService) => new GameEngine(config, llm);
