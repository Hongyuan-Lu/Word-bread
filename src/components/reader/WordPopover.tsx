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
    known: '已熟知',
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
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-72 p-4 animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: finalPosition.top,
        left: finalPosition.left,
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
      >
        ✕
      </button>

      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900 mb-1">{token.surface}</div>
        {token.lemma && (
          <div className="text-sm text-gray-500">
            lemma: <span className="font-mono">{token.lemma}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {displayLevel !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">显示</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              displayLevel === 0 ? 'bg-gray-100 text-gray-600' :
              displayLevel === 1 ? 'bg-orange-100 text-orange-700' :
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
          <span className="text-xs text-gray-500">掌握</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            masteryStatus === 'known' ? 'bg-green-100 text-green-700' :
            masteryStatus === 'unknown' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {masteryLabels[masteryStatus ?? 'null']}
          </span>
        </div>
      </div>

      {token.short_explanation && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-xs text-blue-600 font-medium mb-1">释义</div>
          <div className="text-gray-900">{token.short_explanation}</div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={() => onMarkKnown(token.lemma!)}
          disabled={!token.lemma || masteryStatus === 'known'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            masteryStatus === 'known'
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          ✓ 已熟知
        </button>
        <button
          onClick={() => onMarkUnknown(token.lemma!)}
          disabled={!token.lemma || masteryStatus === 'unknown'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            masteryStatus === 'unknown'
              ? 'bg-yellow-100 text-yellow-700 cursor-default'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }`}
        >
          ✗ 不熟悉
        </button>
      </div>
    </div>
  );
}
