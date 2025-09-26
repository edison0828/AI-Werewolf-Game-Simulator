<div align="right">
  <button id="toggle-lang" type="button">Switch to English</button>
</div>

<div id="lang-zh" style="display: block;">

# 狼人殺 AI 展示網站

歡迎使用狼人殺 AI 模擬器展示網站！本專案將原始於 Jupyter Notebook 的狼人殺 AI 遊戲邏輯移植到 Next.js，提供即時的遊戲流程展示、AI 決策日誌以及真人玩家參與的示範。

## 功能特色

- ⚙️ **彈性設定**：自訂玩家人數、職業配置與 AI 策略參數。
- 🧠 **AI 對局引擎**：完整模擬白天、夜晚、投票等流程，並記錄事件日誌。
- 🙋 **真人參與**：支援指定至少一位真人玩家即時操作，保留擴充多位真人的彈性。
- 🖥️ **即時 UI**：透過互動介面查看玩家狀態、行動請求與對局紀錄。

## 安裝與設定

1. 安裝依賴：
   ```bash
   npm install
   ```
   > 若在受限環境中遭遇 403 Forbidden，可改用本地端或重新設定代理再執行。

2. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

3. 於瀏覽器開啟 `http://localhost:3000` 即可進入展示網站。

## 使用方式

1. 進入首頁後，在 **Game Configurator** 中調整玩家人數與職業組合。
2. 若需要真人玩家，勾選對應的座位；目前預設最多支援一位真人。
3. 點擊 **Start Game** 啟動對局，介面會顯示當前回合、階段與玩家狀態。
4. 當輪到真人行動時，畫面會彈出操作請求，依提示選擇行動即可繼續。
5. 透過 **Event Log** 追蹤每個回合的事件與投票結果。

## 專案結構

- `app/`：Next.js 頁面與 UI 元件。
- `lib/game/`：TypeScript 實作的狼人殺遊戲引擎與工具函式。
- `Final_Project.ipynb`：原始的 Python 筆記本程式碼。

## 未來規劃

- 支援多位真人玩家與更多角色配置。
- 加入戰局回放與策略分析視覺化。
- 改善行動策略以提升 AI 智慧。

</div>

<div id="lang-en" style="display: none;">

# Werewolf AI Demo Site

Welcome to the Werewolf AI simulator demo! This project ports the original Jupyter Notebook Werewolf AI logic into a Next.js web experience with real-time game flow visualisation, AI decision logs, and optional human participation.

## Key Features

- ⚙️ **Flexible setup**: Configure player counts, role presets, and AI strategy parameters.
- 🧠 **AI engine**: Simulates night/day/voting phases and records detailed event logs.
- 🙋 **Human seat**: Allow at least one human player to act in real time, with room for future multi-seat expansion.
- 🖥️ **Interactive UI**: Monitor player states, decision prompts, and match history live.

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```
   > If you encounter a 403 Forbidden in restricted environments, try running locally or configuring a proxy before retrying.

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser to explore the demo.

## How to Play

1. On the home page, tune the **Game Configurator** to set player counts and role presets.
2. Enable a human seat if desired; the current demo supports up to one human participant.
3. Click **Start Game** to launch the match. The UI displays the current round, phase, and player board.
4. When it's time for the human to act, a prompt appears with available actions—follow the instructions to continue.
5. Review the **Event Log** to trace each round's events and voting outcomes.

## Project Structure

- `app/`: Next.js pages and UI components.
- `lib/game/`: TypeScript Werewolf engine and helpers.
- `Final_Project.ipynb`: Original Python notebook implementation.

## Roadmap

- Support multiple human players and additional role packs.
- Add replay and strategy visualisation tools.
- Enhance AI heuristics for smarter decisions.

</div>

<script>
const toggleButton = document.getElementById('toggle-lang');
const zhSection = document.getElementById('lang-zh');
const enSection = document.getElementById('lang-en');
if (toggleButton && zhSection && enSection) {
  toggleButton.addEventListener('click', () => {
    const isZhVisible = zhSection.style.display !== 'none';
    zhSection.style.display = isZhVisible ? 'none' : 'block';
    enSection.style.display = isZhVisible ? 'block' : 'none';
    toggleButton.textContent = isZhVisible ? '切換回中文' : 'Switch to English';
  });
}
</script>
