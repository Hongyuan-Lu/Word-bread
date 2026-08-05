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

  const getGloss = (word: WordState): string | null => {
    if (word.gloss_snapshot) {
      return word.gloss_snapshot;
    }
    if (word.word_id && wordGlosses.has(word.word_id)) {
      return wordGlosses.get(word.word_id)!;
    }
    return null;
  };

  const getExamLevel = (word: WordState): string | null => {
    if (word.word_id && wordExamLevels.has(word.word_id)) {
      return wordExamLevels.get(word.word_id)!;
    }
    return null;
  };

  const filteredWords = wordStates.filter(w => {
    if (filter === 'all') return true;
    return w.vocab_type === filter;
  });

  const studyPlanCount = wordStates.filter(w => w.vocab_type === 'study_plan').length;
  const difficultCount = wordStates.filter(w => w.vocab_type === 'difficult').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bread-background">
        <div className="text-center">
          <div className="text-6xl mb-4 bread-loading">🍞</div>
          <p className="text-bread-primary font-display text-xl">烘焙中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bread-background">
        {/* 报纸风格头部 */}
        <header className="bread-navbar">
          <div className="max-w-6xl mx-auto px-4 py-4">
            {/* 顶部日期和期号 */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-gray-900">
              <div className="text-sm text-gray-600 font-body">
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
              <div className="text-sm text-gray-600 font-body">
                每日精选 · AI 改写
              </div>
            </div>
            
            {/* 标题栏 */}
            <div className="text-center mb-4">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
                单词本
              </h1>
              <div className="newspaper-divider">
                <p className="text-lg text-bread-primary font-display italic">
                  记录您的学习历程
                </p>
              </div>
            </div>
            
            {/* 导航栏 */}
            <div className="flex items-center justify-between">
              <nav className="flex items-center gap-6">
                <a href="/" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                  首页
                </a>
                <a href="/articles" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                  文章
                </a>
                <a href="/vocab" className="text-gray-900 font-display font-semibold text-lg hover:text-bread-primary transition">
                  单词本
                </a>
              </nav>
              
              <div className="flex items-center gap-4">
                <span className="bread-tag bread-tag-secondary">
                  👤 游客
                </span>
                <a href="/login" className="bread-button-primary text-sm">
                  登录 / 注册
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* 未登录提示 */}
        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="bread-card p-12 text-center">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
              请先登录
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              登录后即可查看和管理您的单词本
            </p>
            <a href="/login" className="bread-button-primary text-lg px-8 py-4">
              🚀 立即登录
            </a>
          </div>
        </main>

        {/* 报纸风格底部 */}
        <footer className="border-t-2 border-gray-900 bg-white mt-12">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="newspaper-divider">
              <p className="text-center text-gray-600 text-sm font-body">
                © 2026 单词面包 WordBread · 让英语学习更简单
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bread-background">
      {/* 报纸风格头部 */}
      <header className="bread-navbar">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* 顶部日期和期号 */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-gray-900">
            <div className="text-sm text-gray-600 font-body">
              {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
            <div className="text-sm text-gray-600 font-body">
              每日精选 · AI 改写
            </div>
          </div>
          
          {/* 标题栏 */}
          <div className="text-center mb-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
              我的单词本
            </h1>
            <div className="newspaper-divider">
              <p className="text-lg text-bread-primary font-display italic">
                记录您的学习历程
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-6">
              <a href="/" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                首页
              </a>
              <a href="/articles" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                文章
              </a>
              <a href="/vocab" className="text-gray-900 font-display font-semibold text-lg hover:text-bread-primary transition">
                单词本
              </a>
            </nav>
            
            <div className="flex items-center gap-4">
              <span className="bread-tag bread-tag-primary">
                {profile?.target_exam ?? 'CET4'}
              </span>
              <span className="bread-tag bread-tag-secondary">
                {profile?.major_category ?? '综合'}
              </span>
              <a href="/settings" className="text-gray-600 hover:text-bread-primary transition" title="设置">
                ⚙️
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bread-card p-6 text-center">
            <div className="text-5xl mb-4">📚</div>
            <div className="font-display text-3xl font-bold text-gray-900 mb-2">
              {wordStates.length}
            </div>
            <div className="text-sm text-gray-600 font-body uppercase tracking-wider">
              总单词数
            </div>
          </div>
          
          <div className="bread-card p-6 text-center">
            <div className="text-5xl mb-4">📖</div>
            <div className="font-display text-3xl font-bold text-gray-900 mb-2">
              {studyPlanCount}
            </div>
            <div className="text-sm text-gray-600 font-body uppercase tracking-wider">
              学习计划
            </div>
          </div>
          
          <div className="bread-card p-6 text-center">
            <div className="text-5xl mb-4">💪</div>
            <div className="font-display text-3xl font-bold text-gray-900 mb-2">
              {difficultCount}
            </div>
            <div className="text-sm text-gray-600 font-body uppercase tracking-wider">
              较难单词
            </div>
          </div>
        </section>

        {/* 筛选栏 */}
        <section className="bread-card p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display font-bold text-gray-900">筛选:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-bread-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部 ({wordStates.length})
              </button>
              <button
                onClick={() => setFilter('study_plan')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === 'study_plan'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📖 学习计划 ({studyPlanCount})
              </button>
              <button
                onClick={() => setFilter('difficult')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === 'difficult'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💪 较难单词 ({difficultCount})
              </button>
            </div>
          </div>
        </section>

        {/* 单词列表 */}
        <section>
          {filteredWords.length === 0 ? (
            <div className="bread-card p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                暂无单词
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? '您还没有添加任何单词，去阅读文章时可以添加生词'
                  : filter === 'study_plan' 
                    ? '您还没有添加学习计划中的单词'
                    : '您还没有标记较难单词'}
              </p>
              <a href="/articles" className="bread-button-primary mt-6 inline-block">
                📰 去阅读文章
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWords.map((word) => {
                const gloss = getGloss(word);
                const examLevel = getExamLevel(word);
                const hasGloss = !!gloss;
                const isRevealed = revealedGlosses.has(word.id);

                return (
                  <div key={word.id} className="bread-card p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-display text-2xl font-bold text-gray-900">
                            {word.lemma}
                          </span>
                          <span className={`bread-tag text-xs ${
                            word.vocab_type === 'study_plan' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {word.vocab_type === 'study_plan' ? '📖 学习计划' : '💪 较难单词'}
                          </span>
                          {examLevel && (
                            <span className={`bread-tag text-xs ${
                              examLevel === 'common' ? 'bread-tag-secondary' :
                              examLevel === 'CET4' ? 'bg-blue-100 text-blue-700' :
                              examLevel === 'CET6' ? 'bg-purple-100 text-purple-700' :
                              'bread-tag-secondary'
                            }`}>
                              {examLevel === 'common' ? '常见词' :
                               examLevel === 'CET4' ? 'CET 4' :
                               examLevel === 'CET6' ? 'CET 6' :
                               '超纲词'}
                            </span>
                          )}
                        </div>
                        
                        {hasGloss && (
                          <div className="mb-3">
                            {isRevealed ? (
                              <div className="text-sm text-gray-700 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
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
                                className="text-sm text-bread-primary hover:text-bread-accent font-medium"
                              >
                                👁️ 点击显示释义
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
                            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl border border-gray-300 transition"
                          >
                            改为较难
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateVocabType(word.lemma, 'study_plan')}
                            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl border border-gray-300 transition"
                          >
                            改为学习
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(word.lemma)}
                          className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-300 transition"
                        >
                          ✓ 已熟悉
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 报纸风格底部 */}
      <footer className="border-t-2 border-gray-900 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="newspaper-divider">
            <p className="text-center text-gray-600 text-sm font-body">
              © 2026 单词面包 WordBread · 让英语学习更简单
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
