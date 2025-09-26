'use client';

import type { PlayerState } from '@/lib/game/types';

interface PlayerBoardProps {
  players: PlayerState[];
}

export function PlayerBoard({ players }: PlayerBoardProps) {
  return (
    <section className="fade-card" aria-labelledby="player-title">
      <h2 id="player-title" className="card-title">
        玩家資訊
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        下方為目前的角色狀態。Demo 模式會顯示所有角色資訊，方便觀察 AI 決策流程。
      </p>
      <div className="player-grid">
        {players.map((player) => (
          <article key={player.id} className="player-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{player.displayName}</h3>
              <span className={`status-pill ${player.isAlive ? '' : 'dead'}`}>
                {player.isAlive ? '存活' : '出局'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className={`tag ${player.role.alignment === 'Werewolf' ? 'tag--wolf' : 'tag--good'}`}>
                {player.role.alignment === 'Werewolf' ? '狼人陣營' : '好人陣營'}
              </span>
              <span className="tag tag--human">{player.isHuman ? '真人玩家' : 'AI 玩家'}</span>
            </div>
            <p style={{ margin: 0, fontWeight: 600 }}>{player.role.name}</p>
            <p className="muted" style={{ margin: 0 }}>{player.role.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
