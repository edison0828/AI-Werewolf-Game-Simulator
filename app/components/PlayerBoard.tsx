'use client';

import Image from 'next/image';
import type { PlayerState } from '@/lib/game/types';

interface PlayerBoardProps {
  players: PlayerState[];
}

const ROLE_AVATARS: Record<string, string> = {
  Werewolf: '/assets/avatars/werewolf.svg',
  Seer: '/assets/avatars/seer.svg',
  Witch: '/assets/avatars/witch.svg',
  Hunter: '/assets/avatars/hunter.svg',
  Villager: '/assets/avatars/villager.svg'
};

export function PlayerBoard({ players }: PlayerBoardProps) {
  const hasHuman = players.some((player) => player.isHuman);

  return (
    <section className="player-section" aria-labelledby="player-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">角色陣列</p>
          <h2 id="player-title">桌上角色一覽</h2>
        </div>
        <span className="pill pill--info">{hasHuman ? '玩家視角 · 隱藏陣營資訊' : '觀察模式 · 顯示所有角色'}</span>
      </div>
      <div className="player-grid">
        {players.map((player) => {
          const hidden = hasHuman && !player.isHuman;
          const avatarSrc = hidden
            ? '/assets/avatars/mystery.svg'
            : player.isHuman
            ? '/assets/avatars/human.svg'
            : ROLE_AVATARS[player.role.name] ?? '/assets/avatars/villager.svg';
          const alignmentLabel = hidden
            ? '身份未揭露'
            : player.role.alignment === 'Werewolf'
            ? '狼人陣營'
            : '好人陣營';
          const roleName = hidden ? '？？？' : player.role.name;
          const description = hidden ? '等待發掘的神祕身份。' : player.role.description;

          return (
            <article key={player.id} className={`player-card ${player.isAlive ? '' : 'player-card--fallen'}`}>
              <div className="player-avatar">
                <Image src={avatarSrc} alt={`${player.displayName} avatar`} width={120} height={120} />
                <span className={`status-pill ${player.isAlive ? '' : 'dead'}`}>{player.isAlive ? '存活' : '出局'}</span>
              </div>
              <h3>{player.displayName}</h3>
              <div className="player-tags">
                <span className={`tag ${hidden ? 'tag--unknown' : player.role.alignment === 'Werewolf' ? 'tag--wolf' : 'tag--good'}`}>
                  {alignmentLabel}
                </span>
                <span className="tag tag--human">{player.isHuman ? '真人玩家' : 'AI 玩家'}</span>
              </div>
              <p className="player-role">{roleName}</p>
              <p className="player-description">{description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
