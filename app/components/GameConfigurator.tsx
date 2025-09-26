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
    <section className="fade-card" aria-labelledby="config-title">
      <div className="controls" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 id="config-title" className="card-title">
            遊戲設定
          </h2>
          <p className="muted">選擇玩家數、真人參與與角色配置，立即開始體驗狼人殺對局。</p>
        </div>
        <button className="primary-button" onClick={onStart} disabled={disabled}>
          開始新對局
        </button>
      </div>

      <div className="grid two" style={{ marginTop: 20 }}>
        <div>
          <label htmlFor="player-count">玩家人數</label>
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
          <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            角色組成：{rolePreview || '未定義'}
          </p>
        </div>

        <div>
          <fieldset>
            <legend>真人玩家參與</legend>
            <div className="radio-group">
              <label className="radio-chip">
                <input
                  type="radio"
                  name="human-mode"
                  value="none"
                  checked={!allowHuman}
                  onChange={() => onHumanChange([])}
                  disabled={disabled}
                />
                皆為 AI
              </label>
              <label className="radio-chip">
                <input
                  type="radio"
                  name="human-mode"
                  value="single"
                  checked={allowHuman}
                  onChange={() =>
                    onHumanChange(
                      humanConfigs.length ? humanConfigs : [{ id: '1', displayName: '真人玩家' }]
                    )
                  }
                  disabled={disabled}
                />
                真人參與 1 位
              </label>
            </div>
          </fieldset>

          {allowHuman && (
            <div className="grid" style={{ marginTop: 12 }}>
              <label>
                真人座位（1 至 {config.totalPlayers}）
                <input
                  type="number"
                  min={1}
                  max={config.totalPlayers}
                  value={Number.parseInt(primaryHuman?.id ?? '1', 10)}
                  onChange={(event) => {
                    const nextId = String(Math.max(1, Math.min(config.totalPlayers, Number(event.target.value))));
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
              <p className="muted" style={{ fontSize: 13 }}>
                可隨時增加更多真人玩家座位，本系統已預留擴充彈性。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
