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
    return <span className="text-gray-400">{token.surface}</span>;
  }

  const baseClass = 'cursor-pointer rounded px-0.5 transition';

  if (displayLevel === 0) {
    return (
      <span
        onClick={handleClick}
        className={`${baseClass} ${
          isSelected
            ? 'bg-blue-100 ring-2 ring-blue-400'
            : 'hover:bg-gray-100'
        }`}
      >
        {token.surface}
      </span>
    );
  }

  if (displayLevel === 1) {
    return (
      <span
        onClick={handleClick}
        className={`${baseClass} font-bold text-orange-600 ${
          isSelected
            ? 'bg-blue-100 ring-2 ring-blue-400'
            : 'hover:bg-orange-50'
        }`}
      >
        {token.surface}
      </span>
    );
  }

  if (displayLevel === 2) {
    return (
      <span
        onClick={handleClick}
        className={`${baseClass} text-gray-500 ${
          isSelected
            ? 'bg-blue-100 ring-2 ring-blue-400'
            : 'hover:bg-gray-100'
        }`}
      >
        {token.surface}
      </span>
    );
  }

  return (
    <span
      onClick={handleClick}
      className={`${baseClass} ${
        isSelected
          ? 'bg-blue-100 ring-2 ring-blue-400'
          : 'hover:bg-gray-100'
      }`}
    >
      {token.surface}
    </span>
  );
}

export function NonWordToken({ surface }: { surface: string }) {
  if (surface === ' ') {
    return <span> </span>;
  }

  return <span className="text-gray-900">{surface}</span>;
}
