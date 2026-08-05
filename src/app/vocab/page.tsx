'use client';

import { useState, useEffect } from 'react';
import { Loading } from '@/components/Loading';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { VocabType, TargetExam, MajorCategory } from '@/types/vocab';

interface WordState {
  id: string;
  lemma: string;
  vocab_type: VocabType;
  source_article_id: string | null;
  source_sentence: string | null;
  word_id: string | null;
  gloss_snapshot: string | null;
  updated_at: string;
}

export default function VocabPage() {
  const [wordStates, setWordStates] = useState<WordState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<'all' | 'study_plan' | 'difficult'>('all');
  const [profile, setProfile] = useState<{ target_exam: TargetExam; major_category: MajorCategory | null } | null>(null);
  const [revealedGlosses, setRevealedGlosses] = useState<Set<string>>(new Set());
  const [wordGlosses, setWordGlosses] = useState<Map<string, string>>(new Map());
  const [wordExamLevels, setWordExamLevels] = useState<Map<string, string>>(new Map());
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const text = await response.text();
        if (!text || text.startsWith('<')) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const data = JSON.parse(text);
        if (data.user) {
          setIsAuthenticated(true);
          loadWordStates();
          const { data: profileData } = await supabase
            .from('profiles')
            .select('target_exam, major_category')
            .eq('user_id', data.user.id)
            .single();
          if (profileData) {
            setProfile(profileData as { target_exam: TargetExam; major_category: MajorCategory | null });
          }
        } else {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [supabase, pathname]);

  async function loadWordStates() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/word-states');
      if (response.ok) {
        const data = await response.json();
        setWordStates(data);

        const wordIdsWithGloss = data
          .filter((w: WordState) => w.word_id && !w.gloss_snapshot)
          .map((w: WordState) => w.word_id);

        if (wordIdsWithGloss.length > 0) {
          const { data: wordsData } = await supabase
            .from('words')
            .select('id, cn_gloss, exam_level')
            .in('id', wordIdsWithGloss);

          if (wordsData) {
            const glossMap = new Map<string, string>();
            const examLevelMap = new Map<string, string>();
            wordsData.forEach((w: { id: string; cn_gloss: string | null; exam_level: string | null }) => {
              if (w.cn_gloss) {
                glossMap.set(w.id, w.cn_gloss);
              }
              if (w.exam_level) {
                examLevelMap.set(w.id, w.exam_level);
              }
            });
            setWordGlosses(glossMap);
            setWordExamLevels(examLevelMap);
          }
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading word states:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdateVocabType = async (lemma: string, vocabType: VocabType) => {
    try {
      const response = await fetch('/api/word-states', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lemma,
          vocab_type: vocabType,
        }),
      });

      if (response.ok) {
        await loadWordStates();
      }
    } catch (error) {
      console.error('Error updating vocab type:', error);
    }
  };

  const handleDelete = async (lemma: string) => {
    try {
      const response = await fetch(`/api/word-states?lemma=${encodeURIComponent(lemma)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadWordStates();
      }
    } catch (error) {
      console.error('Error deleting word state:', error);
    }
  };

  const vocabTypeLabels: Record<string, string> = {
    study_plan: '学习计划',
    difficult: '较难单词',
  };

  const vocabTypeColors: Record<string, string> = {
    study_plan: 'bg-green-100 text-green-700',
    difficult: 'bg-purple-100 text-purple-700',
  };

  const filteredWordStates = wordStates.filter((word) => {
    if (filter === 'all') return true;
    return word.vocab_type === filter;
  });

  const studyPlanCount = wordStates.filter((w) => w.vocab_type === 'study_plan').length;
  const difficultCount = wordStates.filter((w) => w.vocab_type === 'difficult').length;

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl hover:opacity-80 transition">🍞</a>
              <span className="text-lg font-bold text-gray-900">我的单词</span>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">请先登录</h2>
            <p className="text-gray-600 mb-6">
              登录后可以查看和管理您的单词本
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition"
            >
              去登录
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentTargetExam = profile?.target_exam || 'CET4';
  const currentMajorCategory = profile?.major_category || '综合';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl hover:opacity-80 transition">🍞</a>
              <h1 className="text-lg font-bold text-gray-900">我的单词</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                {currentTargetExam}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                {currentMajorCategory}
              </span>
              <a
                href="/articles"
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-400 transition"
              >
                继续阅读
              </a>
              <a
                href="/settings"
                className="p-2 text-gray-600 hover:text-orange-600 transition"
                title="设置"
              >
                ⚙️
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Loading />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-gray-100 to-gray-100 p-6 border-b border-t border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">单词统计</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-3xl font-bold text-green-600">{studyPlanCount}</div>
                    <div className="text-sm text-gray-600">学习计划</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-3xl font-bold text-purple-600">{difficultCount}</div>
                    <div className="text-sm text-gray-600">较难单词</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-black">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    全部 ({wordStates.length})
                  </button>
                  <button
                    onClick={() => setFilter('study_plan')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filter === 'study_plan'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    学习计划 ({studyPlanCount})
                  </button>
                  <button
                    onClick={() => setFilter('difficult')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filter === 'difficult'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    较难单词 ({difficultCount})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {filteredWordStates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-5xl mb-4">📖</div>
                    <p className="text-lg font-medium mb-2">
                      {filter === 'all' ? '还没有添加任何单词' : `还没有${vocabTypeLabels[filter]}单词`}
                    </p>
                    <p className="text-sm mb-6">开始阅读文章，添加不熟悉的单词到单词本</p>
                    <a
                      href="/articles/mock"
                      className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition"
                    >
                      去阅读
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredWordStates.map((word) => {
                      const isRevealed = revealedGlosses.has(word.id);
                      const gloss = word.gloss_snapshot || (word.word_id ? wordGlosses.get(word.word_id) : null);
                      const hasGloss = !!gloss;

                      return (
                        <div
                          key={word.id}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-gray-900">{word.lemma}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${vocabTypeColors[word.vocab_type]}`}>
                                  {vocabTypeLabels[word.vocab_type]}
                                </span>
                              </div>
                              <div className="mb-1">
                                {word.word_id && wordExamLevels.get(word.word_id) ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    {wordExamLevels.get(word.word_id) === 'common' ? '常见词' :
                                     wordExamLevels.get(word.word_id) === 'CET4' ? 'CET 4' :
                                     wordExamLevels.get(word.word_id) === 'CET6' ? 'CET 6' :
                                     wordExamLevels.get(word.word_id)}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    超纲词
                                  </span>
                                )}
                              </div>
                              {hasGloss && (
                                <div className="mb-1">
                                  {isRevealed ? (
                                    <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                                      <button
                                        onClick={() => setRevealedGlosses(prev => {
                                          const next = new Set(prev);
                                          next.delete(word.id);
                                          return next;
                                        })}
                                        className="mr-2 text-xs text-gray-400 hover:text-gray-600"
                                      >
                                        隐藏
                                      </button>
                                      {gloss}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setRevealedGlosses(prev => new Set([...prev, word.id]))}
                                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                      点击显示释义
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                添加时间：{new Date(word.updated_at).toLocaleString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              {word.vocab_type === 'study_plan' ? (
                                <button
                                  onClick={() => handleUpdateVocabType(word.lemma, 'difficult')}
                                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-400 transition"
                                >
                                  改为较难
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateVocabType(word.lemma, 'study_plan')}
                                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-400 transition"
                                >
                                  改为学习
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(word.lemma)}
                                className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-400 transition"
                              >
                                已熟知
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
