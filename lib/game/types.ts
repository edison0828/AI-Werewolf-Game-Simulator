export type RoleName = 'Werewolf' | 'Seer' | 'Witch' | 'Hunter' | 'Villager';

export type Alignment = 'Good' | 'Werewolf';

export interface RoleDefinition {
  name: RoleName;
  alignment: Alignment;
  description: string;
}

export interface PlayerState {
  id: string;
  displayName: string;
  role: RoleDefinition;
  isAlive: boolean;
  isHuman: boolean;
  notes: Record<string, unknown>;
}

export interface GameConfig {
  totalPlayers: number;
  allowHunter: boolean;
  humanPlayers: HumanParticipantConfig[];
  aiProviders: string[];
  seed?: number;
}

export interface HumanParticipantConfig {
  id: string;
  displayName: string;
}

export type GamePhase =
  | 'idle'
  | 'setup'
  | 'night'
  | 'day-discussion'
  | 'day-vote'
  | 'game-over';

export interface LogEntry {
  id: string;
  day: number;
  phase: GamePhase;
  message: string;
  tags?: string[];
}

export interface HumanActionRequest {
  requestId: string;
  playerId: string;
  role: RoleName;
  title: string;
  description: string;
  options: HumanActionOption[];
  type: HumanActionType;
  extraInput?: HumanTextInputRequest;
}

export interface HumanActionOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export type HumanActionType =
  | 'werewolf-target'
  | 'seer-check'
  | 'witch-heal'
  | 'witch-poison'
  | 'day-speech'
  | 'day-vote'
  | 'hunter-shoot';

export interface HumanTextInputRequest {
  placeholder: string;
  multiline?: boolean;
}

export interface EngineSnapshot {
  day: number;
  phase: GamePhase;
  players: PlayerState[];
  pendingRequest?: HumanActionRequest;
  logs: LogEntry[];
  winner?: Alignment | 'None';
}

export interface SubmitHumanActionPayload {
  requestId: string;
  chosenOptionId?: string;
  text?: string;
}
