'use client';

import { useEffect, useRef } from 'react';
import type { ArticleToken } from '@/types/article';
import type { DisplayLevel, MasteryStatus } from '@/types/vocab';

interface WordPopoverProps {
  token: ArticleToken;
  displayLevel: DisplayLevel;
  masteryStatus: MasteryStatus;
  position: { top: number; left: number };
  onClose: () => void;
  onMarkKnown: (lemma: string) => void;
  onMarkUnknown: (lemma: string) => void;
}

export function WordPopover({
  token,
  displayLevel,
  masteryStatus,
  position,
  onClose,
  onMarkKnown,
  onMarkUnknown,
}: WordPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const masteryLabels: Record<string, string> = {
    known: '已熟悉',
    learning: '学习中',
    unknown: '不熟悉',
    null: '未标记',
  };

  const calculatePosition = () => {
    const POPOVER_HEIGHT = 300;
    const POPOVER_WIDTH = 288;
    const scrollY = window.scrollY;

    let top = position.top + scrollY;

    if (top + POPOVER_HEIGHT > scrollY + window.innerHeight - 16) {
      top = scrollY + window.innerHeight - POPOVER_HEIGHT - 16;
    }

    if (top < scrollY + 16) {
      top = scrollY + 16;
    }

    return {
      top,
      left: Math.min(position.left, window.innerWidth - POPOVER_WIDTH - 16),
      scrollY,
    };
  };

  const finalPosition = calculatePosition();

  return (
    <div
      ref={popoverRef}
      className="bread-popover fixed z-50 w-72 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: finalPosition.top,
        left: finalPosition.left,
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
      >
        ✕
      </button>

      <div className="mb-4">
        <div className="font-display text-2xl font-bold text-gray-900 mb-1">{token.surface}</div>
        {token.lemma && (
          <div className="text-sm text-gray-500 font-mono">
            lemma: {token.lemma}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {displayLevel !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">显示:</span>
            <span className={`bread-tag text-xs ${
              displayLevel === 0 ? 'bread-tag-secondary' :
              displayLevel === 1 ? 'bread-tag-primary' :
              'bg-blue-100 text-blue-700'
            }`}>
              Level {displayLevel}
              {displayLevel === 0 ? '（普通文本）' :
               displayLevel === 1 ? '（重点词）' :
               '（Ruby释义）'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">掌握:</span>
          <span className={`bread-tag text-xs ${
            masteryStatus === 'known' ? 'bg-green-100 text-green-700' :
            masteryStatus === 'unknown' ? 'bg-yellow-100 text-yellow-700' :
            'bread-tag-secondary'
          }`}>
            {masteryLabels[masteryStatus ?? 'null']}
          </span>
        </div>
      </div>

      {token.short_explanation && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="text-xs text-blue-600 font-medium mb-1">📖 释义</div>
          <div className="text-sm text-gray-800">{token.short_explanation}</div>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onMarkKnown(token.lemma!)}
          disabled={!token.lemma || masteryStatus === 'known'}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${
            masteryStatus === 'known'
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          ✅ 已熟悉
        </button>
        <button
          onClick={() => onMarkUnknown(token.lemma!)}
          disabled={!token.lemma || masteryStatus === 'unknown'}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${
            masteryStatus === 'unknown'
              ? 'bg-yellow-100 text-yellow-700 cursor-default'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }`}
        >
          ❌ 不熟悉
        </button>
      </div>
    </div>
  );
}
