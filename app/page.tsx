'use client';

import { useMemo, useRef, useState } from 'react';
import { DEFAULT_GAME_CONFIG } from '@/lib/game/config';
import { createEngine, GameEngine } from '@/lib/game/engine';
import type {
  EngineSnapshot,
  GameConfig,
  HumanParticipantConfig,
  SubmitHumanActionPayload
} from '@/lib/game/types';
import { GameConfigurator } from './components/GameConfigurator';
import { PlayerBoard } from './components/PlayerBoard';
import { EventLog } from './components/EventLog';
import { ActionPanel } from './components/ActionPanel';

const INITIAL_SNAPSHOT: EngineSnapshot = {
  day: 0,
  phase: 'idle',
  players: [],
  logs: [],
  winner: undefined
};

export default function HomePage() {
  const engineRef = useRef<GameEngine>(createEngine(DEFAULT_GAME_CONFIG));
  const [config, setConfig] = useState<GameConfig>({ ...DEFAULT_GAME_CONFIG });
  const [humanConfigs, setHumanConfigs] = useState<HumanParticipantConfig[]>([]);
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT);
  const [autoRunning, setAutoRunning] = useState(false);

  const isGameActive = snapshot.phase !== 'idle' && snapshot.phase !== 'game-over';

  const handleStart = () => {
    const sanitizedHumans: HumanParticipantConfig[] = [];
    const seatSet = new Set<string>();
    humanConfigs.forEach((human) => {
      const seat = Math.max(1, Math.min(config.totalPlayers, Number.parseInt(human.id, 10) || 1));
      const seatId = String(seat);
      if (!seatSet.has(seatId)) {
        seatSet.add(seatId);
        sanitizedHumans.push({ id: seatId, displayName: human.displayName || `真人玩家 ${seatId}` });
      }
    });

    const snap = engineRef.current.start({
      totalPlayers: config.totalPlayers,
      humanPlayers: sanitizedHumans,
      allowHunter: config.allowHunter,
      aiProviders: config.aiProviders
    });
    setSnapshot(snap);
    setAutoRunning(false);
  };

  const progressOnce = () => {
    const snap = engineRef.current.progress();
    setSnapshot({ ...snap });
  };

  const progressAuto = () => {
    setAutoRunning(true);
    let current = engineRef.current.progress();
    while (!current.pendingRequest && current.phase !== 'game-over') {
      current = engineRef.current.progress();
    }
    setSnapshot({ ...current });
    setAutoRunning(false);
  };

  const handleSubmitAction = (payload: SubmitHumanActionPayload) => {
    const snap = engineRef.current.submitHumanAction(payload);
    setSnapshot({ ...snap });
  };

  const activeRequest = snapshot.pendingRequest;

  const statusLabel = useMemo(() => {
    if (snapshot.winner) {
      return snapshot.winner === 'Good' ? '好人陣營獲勝' : '狼人陣營獲勝';
    }
    switch (snapshot.phase) {
      case 'idle':
        return '尚未開始';
      case 'night':
        return `第 ${snapshot.day} 夜 · 夜晚行動`;
      case 'day-discussion':
        return `第 ${snapshot.day} 天 · 白天討論`;
      case 'day-vote':
        return `第 ${snapshot.day} 天 · 投票階段`;
      default:
        return '遊戲進行中';
    }
  }, [snapshot]);

  return (
    <main>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>AI Werewolf Simulator</h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 760 }}>
          將期末專案的狼人殺 AI 模型重構為 Next.js Demo 網站，支援真人玩家參與與即時回合控制。
          透過下方控制面板快速建立對局，並觀察 AI 在夜晚與白天的決策細節。
        </p>
      </header>

      <GameConfigurator
        config={config}
        humanConfigs={humanConfigs}
        onConfigChange={(partial) => {
          setConfig((prev) => {
            const next = { ...prev, ...partial };
            setHumanConfigs((humans) =>
              humans.map((human) => ({
                ...human,
                id: String(
                  Math.max(1, Math.min(next.totalPlayers, Number.parseInt(human.id, 10) || 1))
                )
              }))
            );
            return next;
          });
        }}
        onHumanChange={(humans) => {
          setHumanConfigs(humans);
        }}
        onStart={handleStart}
        disabled={autoRunning}
      />

      <section className="fade-card" style={{ marginTop: 24 }}>
        <div className="controls" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ marginBottom: 6 }}>
              對局控制
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              目前狀態：{statusLabel}
            </p>
          </div>
          <div className="controls" style={{ justifyContent: 'flex-end' }}>
            <button className="secondary-button" onClick={progressOnce} disabled={!isGameActive || autoRunning}>
              前進一步
            </button>
            <button className="primary-button" onClick={progressAuto} disabled={!isGameActive || autoRunning}>
              自動推進至下一決策
            </button>
          </div>
        </div>
        {snapshot.winner && (
          <p style={{ marginTop: 16, fontWeight: 600, color: '#fef3c7' }}>
            🎉 {statusLabel}
          </p>
        )}
        {activeRequest && (
          <ActionPanel request={activeRequest} onSubmit={handleSubmitAction} />
        )}
      </section>

      {snapshot.players.length > 0 && <PlayerBoard players={snapshot.players} />}

      <EventLog logs={snapshot.logs} />
    </main>
  );
}
