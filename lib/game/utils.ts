import type { PlayerState } from './types';

let idCounter = 0;

export const createId = () => {
  idCounter += 1;
  return `id_${Date.now().toString(36)}_${idCounter}`;
};

export function shuffle<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  if (seed === undefined) {
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  let random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getAlivePlayers(players: PlayerState[]): PlayerState[] {
  return players.filter((p) => p.isAlive);
}

export function getRandomAliveTarget(
  players: PlayerState[],
  predicate: (player: PlayerState) => boolean
): PlayerState | undefined {
  const candidates = getAlivePlayers(players).filter(predicate);
  if (!candidates.length) return undefined;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
}
