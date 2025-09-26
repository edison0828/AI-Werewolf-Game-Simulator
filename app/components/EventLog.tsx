'use client';

import type { LogEntry } from '@/lib/game/types';

interface EventLogProps {
  logs: LogEntry[];
}

const PHASE_BADGE: Record<string, string> = {
  night: '🌙',
  'day-discussion': '☀️',
  'day-vote': '🗳️',
  'game-over': '🏁',
  idle: '✨'
};

const PHASE_LABEL: Record<string, string> = {
  night: '夜晚行動',
  'day-discussion': '白天討論',
  'day-vote': '白天投票',
  'game-over': '遊戲結束',
  idle: '準備階段'
};

export function EventLog({ logs }: EventLogProps) {
  return (
    <section className="story-section" aria-labelledby="log-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">實況紀錄</p>
          <h2 id="log-title">劇情時間線</h2>
        </div>
      </div>
      <div className="log-container">
        {logs.length === 0 && <p className="muted">目前尚無日誌，點擊開始即可開場。</p>}
        {logs.map((log) => (
          <article key={log.id} className="log-entry">
            <span className="log-badge">{PHASE_BADGE[log.phase] ?? '✨'}</span>
            <div>
              <p className="log-title">
                第 {log.day} 天 · {PHASE_LABEL[log.phase] ?? PHASE_LABEL.idle}
              </p>
              <p className="log-message">{log.message}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
