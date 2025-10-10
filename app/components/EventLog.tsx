'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LogEntry } from '@/lib/game/types';

interface EventLogProps {
  logs: LogEntry[];
  onProgressStep?: () => void;
  onProgressAuto?: () => void;
  disableStep?: boolean;
  disableAuto?: boolean;
  autoRunning?: boolean;
  showHiddenIntel?: boolean;
  spectatorControls?: {
    available: boolean;
    active: boolean;
    onToggle: () => void;
  };
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

export function EventLog({
  logs,
  onProgressStep,
  onProgressAuto,
  disableStep,
  disableAuto,
  autoRunning,
  showHiddenIntel = false,
  spectatorControls
}: EventLogProps) {
  const visibleLogs = useMemo(() => {
    if (showHiddenIntel) return logs;
    return logs.filter((log) => !log.tags?.includes('private'));
  }, [logs, showHiddenIntel]);

  const hiddenCount = logs.length - visibleLogs.length;

  return (
    <section className="story-section" aria-labelledby="log-title">
      <div className="log-controls">
        <div>
          <p className="eyebrow">實況紀錄</p>
          <h2 id="log-title">劇情時間線</h2>
        </div>
        <div className="log-actions">
          {spectatorControls?.available && (
            <button
              type="button"
              className={`toggle ${spectatorControls.active ? 'active' : ''}`}
              onClick={spectatorControls.onToggle}
            >
              {spectatorControls.active ? '隱藏秘密資訊' : '開啟觀眾透視' }
            </button>
          )}
          {onProgressStep && (
            <button
              type="button"
              className="button"
              onClick={onProgressStep}
              disabled={disableStep}
            >
              單步推進
            </button>
          )}
          {onProgressAuto && (
            <button
              type="button"
              className="button button--primary"
              onClick={onProgressAuto}
              disabled={disableAuto}
            >
              {autoRunning ? 'AI 推理中…' : '推進至下一決策'}
            </button>
          )}
        </div>
      </div>
      <div className="log-container">
        {visibleLogs.length === 0 && (
          <p className="muted">
            {logs.length === 0
              ? '目前尚無日誌，點擊上方按鈕即可開場。'
              : '私人行動已隱藏，切換「觀眾透視」可檢視完整內容。'}
          </p>
        )}
        {visibleLogs.map((log) => (
          <article key={log.id} className="log-entry">
            <span className="log-badge">{PHASE_BADGE[log.phase] ?? '✨'}</span>
            <div>
              <p className="log-title">
                第 {log.day} 天 · {PHASE_LABEL[log.phase] ?? PHASE_LABEL.idle}
              </p>
              <AnimatedMessage
                text={log.message}
                streaming={log.tags?.includes('ai-speech') ?? false}
                animateKey={log.id}
              />
            </div>
          </article>
        ))}
      </div>
      {hiddenCount > 0 && !showHiddenIntel && (
        <p className="muted small">已隱藏 {hiddenCount} 則夜間秘密行動。</p>
      )}
    </section>
  );
}

function AnimatedMessage({ text, streaming, animateKey }: { text: string; streaming: boolean; animateKey: string }) {
  const [displayed, setDisplayed] = useState(streaming ? '' : text);
  const [isStreaming, setIsStreaming] = useState(streaming);

  useEffect(() => {
    if (!streaming) {
      setDisplayed(text);
      setIsStreaming(false);
      return;
    }

    setDisplayed('');
    setIsStreaming(true);
    let index = 0;
    const interval = Math.max(18, 140 - text.length);
    const timer = setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(timer);
        setIsStreaming(false);
      }
    }, interval);

    return () => {
      clearInterval(timer);
      setIsStreaming(false);
    };
  }, [text, streaming, animateKey]);

  return (
    <p className={`log-message${isStreaming ? ' log-message--streaming' : ''}`}>{displayed}</p>
  );
}
