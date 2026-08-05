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
  onMarkDifficult?: (lemma: string, wordId?: string | null, glossSnapshot?: string | null) => Promise<boolean>;
  onMarkKnown?: (lemma: string) => Promise<boolean>;
  isGuest?: boolean;
}

export function ArticleReader({
  tokens,
  targetExam,
  initialUserWordStates = new Map(),
  onAddToStudyPlan,
  onMarkDifficult,
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
          setError('✓ 已添加到学习计划');
          setTimeout(() => setError(null), 2000);
        }
      }
    },
    [userWordStates, onAddToStudyPlan, handleClosePopover, selectedToken]
  );

  const handleMarkDifficult = useCallback(
    async (lemma: string) => {
      const previousState = userWordStates.get(lemma);

      setUserWordStates((prev) => {
        const next = new Map(prev);
        next.set(lemma, 'difficult');
        return next;
      });
      handleClosePopover();

      if (onMarkDifficult) {
        const enriched = selectedToken as EnrichedToken;
        const wordId = selectedToken?.word_id ?? null;
        const gloss = (wordId && enriched?.cn_gloss) ? enriched.cn_gloss : (selectedToken?.short_explanation ?? null);
        const glossSnapshot = wordId ? null : gloss;
        const success = await onMarkDifficult(lemma, wordId, glossSnapshot);
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
          setError('✓ 已标记为较难单词');
          setTimeout(() => setError(null), 2000);
        }
      }
    },
    [userWordStates, onMarkDifficult, handleClosePopover, selectedToken]
  );

  const handleMarkKnown = useCallback(
    async (lemma: string) => {
      const previousState = userWordStates.get(lemma);

      setUserWordStates((prev) => {
        const next = new Map(prev);
        next.delete(lemma);
        return next;
      });
      handleClosePopover();

      if (onMarkKnown) {
        const success = await onMarkKnown(lemma);
        if (!success) {
          setUserWordStates((prev) => {
            const next = new Map(prev);
            if (previousState !== undefined) {
              next.set(lemma, previousState);
            }
            return next;
          });
          setError('删除失败，请重试');
          setTimeout(() => setError(null), 3000);
        } else {
          setError('✓ 已从单词本移除');
          setTimeout(() => setError(null), 2000);
        }
      }
    },
    [userWordStates, onMarkKnown, handleClosePopover]
  );

  const getDisplayLevel = useCallback(
    (token: ArticleToken | EnrichedToken): 0 | 1 | 2 => {
      if (token.token_type !== 'word' || !token.lemma) {
        return 0;
      }

      const enriched = token as EnrichedToken;

      if (enriched.displayLevel !== undefined) {
        return enriched.displayLevel;
      }

      const masteryStatus = userWordStates.get(token.lemma) || 'unknown';
      const vocabType = userWordStates.get(token.lemma);
      let resolvedMasteryStatus: "known" | "learning" | "unknown" = masteryStatus as "known" | "learning" | "unknown";
      if (vocabType === "study_plan" || vocabType === "difficult") {
        resolvedMasteryStatus = "learning";
      } else if (vocabType === null && userWordStates.has(token.lemma)) {
        resolvedMasteryStatus = "known";
      }

      const examLevel = (enriched.exam_level as 'common' | 'CET4' | 'CET6' | 'out_of_syllabus') || 'common';

      const result = classifyDisplayLevel({
        targetExam,
        examLevel: examLevel,
        masteryStatus: resolvedMasteryStatus,
      });

      return result.displayLevel as 0 | 1 | 2;
    },
    [targetExam, userWordStates]
  );

  const getVocabType = useCallback(
    (lemma: string): VocabType | null => {
      return userWordStates.get(lemma) ?? null;
    },
    [userWordStates]
  );

  const getCnGloss = useCallback(
    (token: ArticleToken | EnrichedToken): string | null => {
      const enriched = token as EnrichedToken;
      return enriched.cn_gloss ?? null;
    },
    []
  );

  const getExamLevelLabel = useCallback(
    (token: ArticleToken | EnrichedToken): string | null => {
      const enriched = token as EnrichedToken;
      const examLevel = enriched.exam_level;
      if (!examLevel) return null;

      switch (examLevel) {
        case 'common':
          return '常见词';
        case 'CET4':
          return 'CET 4';
        case 'CET6':
          return 'CET 6';
        case 'out_of_syllabus':
          return 'CET 6 以上';
        default:
          return null;
      }
    },
    []
  );

  const isWordInDictionary = useCallback(
    (token: ArticleToken | EnrichedToken): boolean => {
      const enriched = token as EnrichedToken;
      return !!enriched.cn_gloss;
    },
    []
  );

  const vocabTypeLabels: Record<string, string> = {
    study_plan: '学习计划',
    difficult: '较难单词',
  };

  const vocabTypeColors: Record<string, string> = {
    study_plan: 'bg-green-100 text-green-700',
    difficult: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="relative">
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-[100] text-sm">
          {error}
        </div>
      )}

      <div className="pr-4">
        <div
          ref={containerRef}
          className="text-base leading-7 tracking-wide text-justify"
          style={{ wordBreak: 'break-word' }}
        >
          {tokens.map((token, index) => {
            if (token.token_type !== 'word') {
              return (
                <NonWordToken key={index} surface={token.surface} />
              );
            }

            const displayLevel = getDisplayLevel(token);
            const vocabType = token.lemma ? getVocabType(token.lemma) : null;
            const isSelected = selectedToken?.token_index === token.token_index;

            return (
              <WordToken
                key={index}
                token={token}
                displayLevel={displayLevel}
                isSelected={isSelected}
                onClick={(element) => handleWordClick(token, element)}
              />
            );
          })}
        </div>
      </div>

      <div
        className="fixed right-4 top-26 w-72 z-50"
      >
        {selectedToken ? (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xl font-bold text-gray-900">{selectedToken.surface}</div>
                {selectedToken.lemma && (
                  <div className="text-xs text-gray-500">
                    lemma: <span className="font-mono">{selectedToken.lemma}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleClosePopover}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              {getExamLevelLabel(selectedToken) && (
                <div className="inline-flex items-center px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="text-sm font-medium text-orange-700">
                    {getExamLevelLabel(selectedToken)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 mb-3">
              {!isGuest && selectedToken.lemma && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">单词本</span>
                  {getVocabType(selectedToken.lemma) ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${vocabTypeColors[getVocabType(selectedToken.lemma)!]}`}>
                      {vocabTypeLabels[getVocabType(selectedToken.lemma)!]}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">未加入</span>
                  )}
                </div>
              )}
            </div>

            {isWordInDictionary(selectedToken) && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-xs text-blue-600 font-medium mb-1">词典释义</div>
                <div className="text-sm text-gray-800">{getCnGloss(selectedToken)}</div>
              </div>
            )}

            {!isWordInDictionary(selectedToken) && selectedToken.short_explanation && (
              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="text-xs text-green-600 font-medium mb-1">文中释义</div>
                <div className="text-sm text-gray-800">{selectedToken.short_explanation}</div>
              </div>
            )}

            <div className="mt-4">
              {!isGuest ? (
                selectedToken.lemma && getVocabType(selectedToken.lemma) ? (
                  <div className="w-full px-3 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg text-center">
                    ✓ 已添加至单词本
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectedToken.lemma && handleAddToStudyPlan(selectedToken.lemma)}
                      className="flex-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded-lg transition"
                    >
                      + 学习计划
                    </button>
                    <button
                      onClick={() => selectedToken.lemma && handleMarkDifficult(selectedToken.lemma)}
                      className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium rounded-lg transition"
                    >
                      + 较难单词
                    </button>
                  </div>
                )
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
