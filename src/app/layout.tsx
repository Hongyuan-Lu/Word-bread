import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '单词面包 WordBread - AI英语新闻阅读器',
  description: '面向 CET4/CET6 学习者的 AI 英语新闻阅读工具，通过真实语境积累考试词汇',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, minimum-scale=0.25, user-scalable=yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased font-body bg-bread-background text-gray-900">
        {children}
      </body>
    </html>
  );
}
