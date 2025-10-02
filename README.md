<div align="right">
  <button id="toggle-lang" type="button">Switch to English</button>
</div>

<div id="lang-zh" style="display: block;">

# 狼人殺 AI 展示網站


歡迎使用狼人殺 AI 模擬器展示網站！本專案將原始於 Jupyter Notebook 的狼人殺 AI 遊戲邏輯移植到 Next.js，提供即時的遊戲流程展示、AI 決策日誌與真人玩家參與，並透過 LLM 生成沉浸式劇情發言。


## 功能特色

- ⚙️ **彈性設定**：自訂玩家人數、職業配置與 AI 策略參數。
- 🧠 **AI 對局引擎**：完整模擬白天、夜晚、投票等流程，並記錄事件日誌。
- 🙋 **真人參與**：支援指定至少一位真人玩家即時操作，保留擴充多位真人的彈性。

- 🎭 **LLM 劇場**：串接 OpenAI Chat Completions API，為 AI 玩家生成中文發言與投票理由；未設定金鑰時會退回到離線台詞模板。
- 🖥️ **沉浸式 UI**：卡通風格角色卡、場景橫幅與事件時間線，隨回合變換氛圍並保護真人玩家視角不洩漏他人身份。


## 安裝與設定

1. 安裝依賴：
   ```bash
   npm install
   ```
   > 若在受限環境中遭遇 403 Forbidden，可改用本地端或重新設定代理再執行。


2. 建立 `.env.local` 並設定 OpenAI 金鑰與（選填）模型：
   ```bash
   echo "OPENAI_API_KEY=sk-xxxx" >> .env.local
   echo "OPENAI_MODEL=gpt-4o-mini" >> .env.local
   ```
   > 若未提供金鑰，AI 將改用預設範本台詞，仍可完整體驗流程。

3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```


4. 於瀏覽器開啟 `http://localhost:3000` 即可進入展示網站。


## 使用方式

1. 進入首頁後，在 **Game Configurator** 中調整玩家人數與職業組合。
2. 若需要真人玩家，勾選對應座位；目前預設最多支援一位真人，並會自動隱藏其他玩家身份。
3. 點擊 **Start Game** 啟動對局，場景橫幅與控制卡會即時顯示當前階段。
4. 當輪到真人行動時，畫面會彈出操作請求，依提示選擇行動即可繼續。
5. AI 角色發言與投票時會呼叫 LLM 生成台詞並記錄於 **Event Log**；亦可回溯整體劇情時間線。


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


Welcome to the Werewolf AI simulator demo! This project ports the original Jupyter Notebook Werewolf AI logic into a Next.js web experience with real-time game flow visualisation, AI decision logs, optional human participation, and LLM-driven storytelling.


## Key Features

- ⚙️ **Flexible setup**: Configure player counts, role presets, and AI strategy parameters.
- 🧠 **AI engine**: Simulates night/day/voting phases and records detailed event logs.
- 🙋 **Human seat**: Allow at least one human player to act in real time, with room for future multi-seat expansion.
- 🎭 **LLM theatre**: Connects to the OpenAI Chat Completions API to craft dramatic speeches and vote rationales; without a key the engine falls back to offline templates.
- 🖥️ **Immersive UI**: Cartoon avatars, cinematic scene banners, and a story timeline keep the atmosphere lively while hiding secret roles from human players.


## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```
   > If you encounter a 403 Forbidden in restricted environments, try running locally or configuring a proxy before retrying.


2. Create `.env.local` with your OpenAI credentials (model optional):
   ```bash
   echo "OPENAI_API_KEY=sk-xxxx" >> .env.local
   echo "OPENAI_MODEL=gpt-4o-mini" >> .env.local
   ```
   > Without a key the demo still runs, but AI dialogue reverts to scripted lines.

3. Start the development server:
   ```bash
   npm run dev
   ```


4. Open `http://localhost:3000` in your browser to explore the demo.

## How to Play

1. On the home page, tune the **Game Configurator** to set player counts and role presets.
2. Enable a human seat if desired; the current demo supports a single human participant and automatically masks other players' identities.
3. Click **Start Game** to launch the match. The hero banner and control deck reflect the current phase in real time.
4. When it's time for the human to act, a prompt appears with available actions—follow the instructions to continue.
5. During AI speeches and votes the LLM produces dialogue that is logged in the **Event Log**, making it easy to review the full story timeline.


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
