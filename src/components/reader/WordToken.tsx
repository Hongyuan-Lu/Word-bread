'use client';

import type { ArticleToken } from '@/types/article';
import type { DisplayLevel } from '@/types/vocab';

interface WordTokenProps {
  token: ArticleToken;
  displayLevel: DisplayLevel;
  isSelected?: boolean;
  onClick: (element: HTMLElement) => void;
}

export function WordToken({
  token,
  displayLevel,
  isSelected = false,
  onClick,
}: WordTokenProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (token.token_type !== 'word') return;
    onClick(e.currentTarget as HTMLElement);
  };

  if (token.token_type !== 'word') {
    return <span className="text-gray-900">{token.surface}</span>;
  }

  const baseClass = 'cursor-pointer rounded px-0.5 transition-all duration-200';

  // Level 0: 普通文本（常见词）
  if (displayLevel === 0) {
    return (
      <span
        onClick={handleClick}
        className={`${baseClass} ${
          isSelected
            ? 'bg-bread-primary/20 ring-2 ring-bread-primary'
            : 'hover:bg-bread-primary/10'
        }`}
      >
        {token.surface}
      </span>
    );
  }

  // Level 1: 高亮加粗（当前目标重点词）
  if (displayLevel === 1) {
    return (
      <span
        onClick={handleClick}
        className={`${baseClass} font-bold word-highlight ${
          isSelected
            ? 'ring-2 ring-bread-primary'
            : 'hover:opacity-80'
        }`}
      >
        {token.surface}
      </span>
    );
  }

  // Level 2: 灰色文字（超出目标或超纲词）
  if (displayLevel === 2) {
    return (
      <span
        onClick={handleClick}
        className={`${baseClass} text-gray-500 ${
          isSelected
            ? 'bg-bread-primary/20 ring-2 ring-bread-primary'
            : 'hover:bg-gray-100'
        }`}
      >
        {token.surface}
      </span>
    );
  }

  // 默认样式
  return (
    <span
      onClick={handleClick}
      className={`${baseClass} ${
        isSelected
          ? 'bg-bread-primary/20 ring-2 ring-bread-primary'
          : 'hover:bg-bread-primary/10'
      }`}
    >
      {token.surface}
    </span>
  );
}

export function NonWordToken({ token }: { token: ArticleToken }) {
  if (token.surface === ' ') {
    return <span> </span>;
  }

  return <span className="text-gray-900">{token.surface}</span>;
}
