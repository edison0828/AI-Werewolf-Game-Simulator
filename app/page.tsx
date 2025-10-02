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

  const progressOnce = async () => {
    const snap = await engineRef.current.progress();
    setSnapshot({ ...snap });
  };

  const progressAuto = async () => {
    setAutoRunning(true);
    let current = snapshot;
    do {
      current = await engineRef.current.progress();
      setSnapshot({ ...current });
    } while (!current.pendingRequest && current.phase !== 'game-over');
    setAutoRunning(false);
  };

  const handleSubmitAction = async (payload: SubmitHumanActionPayload) => {
    const snap = await engineRef.current.submitHumanAction(payload);
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


  const scene = useMemo(() => {
    switch (snapshot.phase) {
      case 'night':
        return {
          image: '/assets/scenes/night.svg',
          title: '月色籠罩整座村莊',
          description: '狼人悄然行動，AI 正在夜間決策。'
        };
      case 'day-discussion':
        return {
          image: '/assets/scenes/day.svg',
          title: '陽光下的集會',
          description: '村民圍坐廣場展開辯論，LLM 與 AI 交錯推理。'
        };
      case 'day-vote':
        return {
          image: '/assets/scenes/dusk.svg',
          title: '夕陽西下，裁決將至',
          description: '所有人必須作出選擇，票數將決定命運。'
        };
      case 'game-over':
        return {
          image: '/assets/scenes/day.svg',
          title: statusLabel,
          description: '回顧事件時間線，檢視 AI 與真人的精彩互動。'
        };
      default:
        return {
          image: '/assets/scenes/day.svg',
          title: '歡迎來到 AI Werewolf Showcase',
          description: '重構自期末專案的狼人殺 AI，支援真人加入與 LLM 戲劇式發言。'
        };
    }
  }, [snapshot.phase, statusLabel]);

  return (
    <main className="page">
      <section className="scene-banner" style={{ backgroundImage: `url(${scene.image})` }}>
        <div className="scene-overlay">
          <p className="eyebrow">AI Werewolf Showcase</p>
          <h1>{scene.title}</h1>
          <p className="muted scene-description">{scene.description}</p>
        </div>
      </section>

      <div className="dashboard-grid">
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

        <section className="control-card">
          <div className="control-header">
            <div>
              <p className="eyebrow">對局控制</p>
              <h2>目前狀態：{statusLabel}</h2>
            </div>
            <div className="control-buttons">
              <button className="button" onClick={progressOnce} disabled={!isGameActive || autoRunning}>
                單步推進
              </button>
              <button
                className="button button--primary"
                onClick={progressAuto}
                disabled={!isGameActive || autoRunning}
              >
                推進至下一決策
              </button>
            </div>
          </div>
          {snapshot.winner && (
            <div className="victory-banner">🎉 {statusLabel}</div>
          )}
          {autoRunning && <p className="muted">AI 推理中，稍候產生下一步動作…</p>}
          {activeRequest && <ActionPanel request={activeRequest} onSubmit={handleSubmitAction} />}
        </section>
      </div>
      {snapshot.players.length > 0 && <PlayerBoard players={snapshot.players} />}

      <EventLog logs={snapshot.logs} />
    </main>
  );
}
