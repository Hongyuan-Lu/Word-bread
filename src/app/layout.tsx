import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '单词面包 - WordBread',
  description: '面向 CET4 / CET6 学习者的 AI 英语新闻阅读工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=0.25, user-scalable=yes" />
      <body className="antialiased">{children}</body>
    </html>
  );
}
