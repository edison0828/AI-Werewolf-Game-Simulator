import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Werewolf Simulator',
  description: '互動式狼人殺 AI 對戰 Demo，支援真人玩家參與。'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
