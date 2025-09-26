import type { GameConfig, RoleDefinition, RoleName } from './types';

export const BASE_ROLES_CONFIG: Record<number, RoleName[]> = {
  6: ['Werewolf', 'Werewolf', 'Seer', 'Witch', 'Villager', 'Villager'],
  7: ['Werewolf', 'Werewolf', 'Seer', 'Witch', 'Hunter', 'Villager', 'Villager'],
  8: ['Werewolf', 'Werewolf', 'Werewolf', 'Seer', 'Witch', 'Hunter', 'Villager', 'Villager']
};

export const ROLE_LIBRARY: Record<RoleName, RoleDefinition> = {
  Werewolf: {
    name: 'Werewolf',
    alignment: 'Werewolf',
    description: '夜晚可選擇獵殺一名玩家，目標是消滅所有好人陣營。'
  },
  Seer: {
    name: 'Seer',
    alignment: 'Good',
    description: '每晚可查驗一名玩家的陣營。'
  },
  Witch: {
    name: 'Witch',
    alignment: 'Good',
    description: '擁有一瓶解藥與一瓶毒藥，可選擇救活或毒死玩家。'
  },
  Hunter: {
    name: 'Hunter',
    alignment: 'Good',
    description: '出局時可以帶走一名玩家。'
  },
  Villager: {
    name: 'Villager',
    alignment: 'Good',
    description: '沒有特殊能力，但透過推理協助好人獲勝。'
  }
};

export const DEFAULT_PLAYER_NAMES = Array.from({ length: 12 }, (_, i) => `AI 玩家 ${i + 1}`);

export const DEFAULT_GAME_CONFIG: GameConfig = {
  totalPlayers: 6,
  allowHunter: true,
  humanPlayers: [],
  aiProviders: ['gpt']
};
