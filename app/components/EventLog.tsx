'use client';

import type { LogEntry } from '@/lib/game/types';

interface EventLogProps {
  logs: LogEntry[];
}

export function EventLog({ logs }: EventLogProps) {
  return (
    <section className="fade-card" aria-labelledby="log-title">
      <h2 id="log-title" className="card-title">
        遊戲日誌
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        即時顯示夜晚、白天以及各角色的動態，協助理解 AI 的決策流程與遊戲走向。
      </p>
      <div className="log-container">
        {logs.length === 0 && <p className="muted">目前尚無日誌，請開始對局。</p>}
        {logs.map((log) => (
          <div key={log.id} className="log-entry">
            <strong>
              第 {log.day} 天 · {translatePhase(log.phase)}
            </strong>
            <div>{log.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function translatePhase(phase: string) {
  switch (phase) {
    case 'night':
      return '夜晚';
    case 'day-discussion':
      return '白天討論';
    case 'day-vote':
      return '白天投票';
    case 'game-over':
      return '遊戲結束';
    default:
      return '準備階段';
  }
}
