'use client';

import { useMemo } from 'react';
import { BASE_ROLES_CONFIG } from '@/lib/game/config';
import type { GameConfig, HumanParticipantConfig } from '@/lib/game/types';

export interface ConfiguratorProps {
  config: GameConfig;
  humanConfigs: HumanParticipantConfig[];
  onConfigChange: (config: Partial<GameConfig>) => void;
  onHumanChange: (humans: HumanParticipantConfig[]) => void;
  onStart: () => void;
  disabled?: boolean;
}

export function GameConfigurator({
  config,
  humanConfigs,
  onConfigChange,
  onHumanChange,
  onStart,
  disabled
}: ConfiguratorProps) {
  const rolePreview = useMemo(() => {
    const roleSet = BASE_ROLES_CONFIG[config.totalPlayers] ?? [];
    return roleSet.join('、');
  }, [config.totalPlayers]);

  const allowHuman = humanConfigs.length > 0;
  const primaryHuman = humanConfigs[0];

  return (
    <section className="config-card" aria-labelledby="config-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">開場設定</p>
          <h2 id="config-title">打造你的狼人殺桌面</h2>
        </div>
        <button className="button button--primary" onClick={onStart} disabled={disabled}>
          開始新對局
        </button>
      </div>

      <div className="config-grid">
        <div className="config-block">
          <h3>玩家人數</h3>
          <p className="muted">選擇合適人數，系統會自動配置角色組合。</p>
          <div className="select-wrapper">
            <select
              id="player-count"
              value={config.totalPlayers}
              onChange={(event) =>
                onConfigChange({ totalPlayers: Number.parseInt(event.target.value, 10) })
              }
              disabled={disabled}
            >
              {[6, 7, 8].map((count) => (
                <option key={count} value={count}>
                  {count} 人局
                </option>
              ))}
            </select>
          </div>
          <p className="role-preview">角色組成：{rolePreview || '未定義'}</p>
        </div>

        <div className="config-block">
          <h3>真人玩家席位</h3>
          <p className="muted">目前支援 1 名真人加入，未來可擴充多席。</p>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle ${!allowHuman ? 'active' : ''}`}
              onClick={() => onHumanChange([])}
              disabled={disabled}
            >
              全部由 AI 控場
            </button>
            <button
              type="button"
              className={`toggle ${allowHuman ? 'active' : ''}`}
              onClick={() =>
                onHumanChange(humanConfigs.length ? humanConfigs : [{ id: '1', displayName: '真人玩家' }])
              }
              disabled={disabled}
            >
              加入 1 名真人
            </button>
          </div>

          {allowHuman && (
            <div className="human-form">
              <label>
                真人座位（1 至 {config.totalPlayers}）
                <input
                  type="number"
                  min={1}
                  max={config.totalPlayers}
                  value={Number.parseInt(primaryHuman?.id ?? '1', 10)}
                  onChange={(event) => {
                    const nextId = String(
                      Math.max(1, Math.min(config.totalPlayers, Number(event.target.value)))
                    );
                    onHumanChange([{ id: nextId, displayName: primaryHuman?.displayName ?? '真人玩家' }]);
                  }}
                  disabled={disabled}
                />
              </label>
              <label>
                玩家暱稱
                <input
                  type="text"
                  value={primaryHuman?.displayName ?? ''}
                  onChange={(event) => {
                    const name = event.target.value || '真人玩家';
                    const seat = primaryHuman?.id ?? '1';
                    onHumanChange([{ id: seat, displayName: name }]);
                  }}
                  placeholder="輸入在遊戲中顯示的名稱"
                  disabled={disabled}
                />
              </label>
              <p className="muted small">我們已預留 UI 與引擎結構，未來可快速增設多個真人席位。</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
