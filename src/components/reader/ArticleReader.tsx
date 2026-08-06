'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ArticleToken } from '@/types/article';
import type { TargetExam, VocabType } from '@/types/vocab';
import { classifyDisplayLevel } from '@/lib/vocab/classify';
import { WordToken, NonWordToken } from './WordToken';

interface EnrichedToken extends ArticleToken {
  pos?: string | null;
  cn_gloss?: string | null;
  exam_level?: string | null;
  displayLevel?: 0 | 1 | 2;
}

interface ArticleReaderProps {
  tokens: (ArticleToken | EnrichedToken)[];
  targetExam: TargetExam;
  initialUserWordStates?: Map<string, VocabType>;
  onAddToStudyPlan?: (lemma: string, wordId?: string | null, glossSnapshot?: string | null) => Promise<boolean>;
  onMark较难单词?: (lemma: string, wordId?: string | null, glossSnapshot?: string | null) => Promise<boolean>;
  onMarkKnown?: (lemma: string) => Promise<boolean>;
  isGuest?: boolean;
}

export function ArticleReader({
  tokens,
  targetExam,
  initialUserWordStates = new Map(),
  onAddToStudyPlan,
  onMark较难单词,
  onMarkKnown,
  isGuest = false,
}: ArticleReaderProps) {
  const [userWordStates, setUserWordStates] = useState<Map<string, VocabType>>(
    initialUserWordStates
  );
  const [selectedToken, setSelectedToken] = useState<ArticleToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarTop, setSidebarTop] = useState(120);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleScroll() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollTop = window.scrollY;
        setSidebarTop(Math.max(120, 120 - scrollTop + rect.top));
      }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWordClick = useCallback(
    (token: ArticleToken, element: HTMLElement) => {
      if (token.token_type !== 'word' || !token.lemma) return;
      setSelectedToken(token);
    },
    []
  );

  const handleClosePopover = useCallback(() => {
    setSelectedToken(null);
  }, []);

  const handleAddToStudyPlan = useCallback(
    async (lemma: string) => {
      const previousState = userWordStates.get(lemma);

      setUserWordStates((prev) => {
        const next = new Map(prev);
        next.set(lemma, 'study_plan');
        return next;
      });
      handleClosePopover();

      if (onAddToStudyPlan) {
        const enriched = selectedToken as EnrichedToken;
        const wordId = selectedToken?.word_id ?? null;
        const gloss = (wordId && enriched?.cn_gloss) ? enriched.cn_gloss : (selectedToken?.short_explanation ?? null);
        const glossSnapshot = wordId ? null : gloss;
        const success = await onAddToStudyPlan(lemma, wordId, glossSnapshot);
        if (!success) {
          setUserWordStates((prev) => {
            const next = new Map(prev);
            if (previousState !== undefined) {
              next.set(lemma, previousState);
            } else {
              next.delete(lemma);
            }
            return next;
          });
          setError('添加失败，请重试');
          setTimeout(() => setError(null), 3000);
        } else {
          setError('✅ 已添加到学习计划');
          setTimeout(() => setError(null), 2000);
        }
      }
    },
    [userWordStates, onAddToStudyPlan, handleClosePopover, selectedToken]
  );

  const handleMark较难单词 = useCallback(
    async (lemma: string) => {
      const previousState = userWordStates.get(lemma);

      setUserWordStates((prev) => {
        const next = new Map(prev);
        next.set(lemma, '较难单词');
        return next;
      });
      handleClosePopover();

      if (onMark较难单词) {
        const enriched = selectedToken as EnrichedToken;
        const wordId = selectedToken?.word_id ?? null;
        const gloss = (wordId && enriched?.cn_gloss) ? enriched.cn_gloss : (selectedToken?.short_explanation ?? null);
        const glossSnapshot = wordId ? null : gloss;
        const success = await onMark较难单词(lemma, wordId, glossSnapshot);
        if (!success) {
          setUserWordStates((prev) => {
            const next = new Map(prev);
            if (previousState !== undefined) {
              next.set(lemma, previousState);
            } else {
              next.delete(lemma);
            }
            return next;
          });
          setError('标记失败，请重试');
          setTimeout(() => setError(null), 3000);
        } else {
          setError('✅ 已标记为较难单词');
          setTimeout(() => setError(null), 2000);
        }
      }
    },
    [userWordStates, onMark较难单词, handleClosePopover, selectedToken]
  );

  const getVocabType = useCallback(
    (lemma: string): VocabType | undefined => {
      return userWordStates.get(lemma);
    },
    [userWordStates]
  );

  const isWordIn词典释义 = useCallback(
    (token: ArticleToken): boolean => {
      return !!(token as EnrichedToken).exam_level;
    },
    []
  );

  const getCnGloss = useCallback(
    (token: ArticleToken): string => {
      const enriched = token as EnrichedToken;
      return enriched.cn_gloss || token.short_explanation || '';
    },
    []
  );

  const getExamLevelLabel = useCallback(
    (token: ArticleToken): string => {
      const enriched = token as EnrichedToken;
      const level = enriched.exam_level;
      if (!level) return '';
      
      switch (level) {
        case 'common': return '常见词';
        case 'CET4': return 'CET-4';
        case 'CET6': return 'CET-6';
        case 'out_of_syllabus': return '超纲词';
        default: return '';
      }
    },
    []
  );

  const vocabTypeLabels: Record<VocabType, string> = {
    study_plan: '学习计划',
    较难单词: '较难单词',
  };

  const vocabTypeColors: Record<VocabType, string> = {
    study_plan: 'bg-green-100 text-green-700',
    较难单词: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* 错误提示 */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            error.startsWith('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {error}
          </div>
        </div>
      )}

      {/* 文章内容 */}
      <div className="max-w-3xl mx-auto">
          <div className="prose prose-lg max-w-none font-body leading-relaxed text-justify">
            {tokens.map((token, index) => {
              if (token.token_type === 'word' && token.lemma) {
                const enriched = token as EnrichedToken;
                const displayLevel = enriched.displayLevel ?? 
                  classifyDisplayLevel({
                    targetExam: targetExam,
                    examLevel: (enriched.exam_level || 'common') as any,
                    masteryStatus: getVocabType(token.lemma!) ? 'learning' : 'unknown'
                  }).displayLevel;;
                const isSelected = selectedToken?.lemma === token.lemma;
                
                return (
                  <WordToken
                    key={`${token.lemma}-${index}`}
                    token={token}
                    displayLevel={displayLevel}
                    isSelected={isSelected}
                    onClick={(element) => handleWordClick(token, element)}
                  />
                );
              }
              
              return (
                <NonWordToken
                  key={`non-word-${index}`}
                  token={token}
                />
              );
            })}
        </div>
      </div>

      {/* 单词弹窗 */}
      <div
        className="fixed right-4 z-50"
        style={{ top: `${sidebarTop}px` }}
      >
        {selectedToken && (
          <div className="bread-popover w-72 max-h-[60vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-2xl font-bold text-gray-900">
                  {selectedToken.surface}
                </div>
                {selectedToken.lemma && (
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    lemma: {selectedToken.lemma}
                  </div>
                )}
              </div>
              <button
                onClick={handleClosePopover}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              {getExamLevelLabel(selectedToken) && (
                <span className="bread-tag bread-tag-primary">
                  {getExamLevelLabel(selectedToken)}
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {!isGuest && selectedToken.lemma && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">单词本:</span>
                  {getVocabType(selectedToken.lemma) ? (
                    <span className={`bread-tag text-xs ${vocabTypeColors[getVocabType(selectedToken.lemma)!]}`}>
                      {vocabTypeLabels[getVocabType(selectedToken.lemma)!]}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">未加入</span>
                  )}
                </div>
              )}
            </div>

            {isWordIn词典释义(selectedToken) && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-600 font-medium mb-1">词典释义</div>
                <div className="text-sm text-gray-800">{getCnGloss(selectedToken)}</div>
              </div>
            )}

            {!isWordIn词典释义(selectedToken) && selectedToken.short_explanation && (
              <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="text-xs text-green-600 font-medium mb-1">文中释义</div>
                <div className="text-sm text-gray-800">{selectedToken.short_explanation}</div>
              </div>
            )}

            <div className="mt-4">
              {!isGuest ? (
                selectedToken.lemma && getVocabType(selectedToken.lemma) ? (
                  <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl text-center">
                    已添加至单词本
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectedToken.lemma && handleAddToStudyPlan(selectedToken.lemma)}
                      className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded-xl transition"
                    >
                      学习计划
                    </button>
                    <button
                      onClick={() => selectedToken.lemma && handleMark较难单词(selectedToken.lemma)}
                      className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium rounded-xl transition"
                    >
                      较难单词
                    </button>
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
