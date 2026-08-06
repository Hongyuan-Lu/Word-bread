'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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
  const [examLevelFilter, setExamLevelFilter] = useState<Set<string>>(new Set(['all']));
  const [profile, setProfile] = useState<{ target_exam: TargetExam; major_category: MajorCategory | null } | null>(null);
  const [revealedGlosses, setRevealedGlosses] = useState<Set<string>>(new Set());
  const [wordGlosses, setWordGlosses] = useState<Map<string, string>>(new Map());
  const [wordExamLevels, setWordExamLevels] = useState<Map<string, string>>(new Map());
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

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
        // 获取所有有 word_id 的单词的等级
        const allWordIds = data
          .filter((w: WordState) => w.word_id)
          .map((w: WordState) => w.word_id);
        
        // 获取需要查询释义的单词（没有 gloss_snapshot 的）
        const wordIdsWithGloss = data
          .filter((w: WordState) => w.word_id && !w.gloss_snapshot)
          .map((w: WordState) => w.word_id);
        
        if (allWordIds.length > 0) {
          const { data: wordsData } = await supabase
            .from('words')
            .select('id, cn_gloss, exam_level')
            .in('id', allWordIds);
          if (wordsData) {
            const glossMap = new Map<string, string>();
            const examLevelMap = new Map<string, string>();
            wordsData.forEach((w: { id: string; cn_gloss: string | null; exam_level: string | null }) => {
              if (w.cn_gloss) glossMap.set(w.id, w.cn_gloss);
              if (w.exam_level) examLevelMap.set(w.id, w.exam_level);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lemma, vocab_type: vocabType }),
      });
      if (response.ok) await loadWordStates();
    } catch (error) {
      console.error('Error updating vocab type:', error);
    }
  };

  const handleDelete = async (lemma: string) => {
    try {
      const response = await fetch(`/api/word-states?lemma=${encodeURIComponent(lemma)}`, { method: 'DELETE' });
      if (response.ok) await loadWordStates();
    } catch (error) {
      console.error('Error deleting word state:', error);
    }
  };

  const getGloss = (word: WordState): string | null => {
    if (word.gloss_snapshot) return word.gloss_snapshot;
    if (word.word_id && wordGlosses.has(word.word_id)) return wordGlosses.get(word.word_id)!;
    return null;
  };

  const toggleExamLevel = (level: string) => {
    setExamLevelFilter(prev => {
      const next = new Set(prev);
      if (level === 'all') {
        return new Set(['all']);
      }
      next.delete('all');
      if (next.has(level)) {
        next.delete(level);
        if (next.size === 0) return new Set(['all']);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const getExamLevel = (word: WordState): string | null => {
    if (word.word_id && wordExamLevels.has(word.word_id)) return wordExamLevels.get(word.word_id)!;
    return null;
  };

  const filteredWords = wordStates.filter(w => {
    // vocab_type 筛选
    if (filter !== 'all' && w.vocab_type !== filter) return false;
    
    // exam_level 筛选
    if (!examLevelFilter.has('all')) {
      const level = getExamLevel(w);
      const displayLevel = level === 'common' ? 'common' : level === 'CET4' ? 'CET4' : level === 'CET6' ? 'CET6' : 'out_of_syllabus';
      if (!examLevelFilter.has(displayLevel)) return false;
    }
    
    return true;
  });

  const studyPlanCount = wordStates.filter(w => w.vocab_type === 'study_plan').length;
  const difficultCount = wordStates.filter(w => w.vocab_type === 'difficult').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bread-background)]">
        <div className="text-center">
          <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bread-background)]">
        <header className="bread-navbar">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--bread-border)]">
              <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">每日精选英文新闻</div>
            </div>
            <div className="text-center mb-4">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">我的单词</h1>
              <p className="text-sm text-[var(--bread-text-secondary)] font-display italic">记录您的学习历程</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--bread-border)]">
              <nav className="flex items-center gap-8">
                <a href="/" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">首页</a>
                <a href="/articles" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">文章</a>
                <a href="/vocab" className="text-[var(--bread-text)] font-body text-base font-semibold tracking-wider hover:text-[var(--bread-accent)] transition">单词本</a>
              </nav>
              <div className="flex items-center gap-3">
                <span className="bread-tag bread-tag-secondary">游客</span>
                <a href="/login" className="bread-button-primary text-xs">登录</a>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-16">
          <div className="bread-card p-16 text-center">
            <h2 className="font-display text-2xl font-bold text-[var(--bread-text)] mb-4">请先登录</h2>
            <p className="text-[var(--bread-text-secondary)] mb-8">登录后即可查看和管理您的单词本</p>
            <a href="/login" className="bread-button-primary">立即登录</a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--bread-border)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">每日精选英文新闻</div>
          </div>
          <div className="text-center mb-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">我的单词</h1>
            <p className="text-sm text-[var(--bread-text-secondary)] font-display italic">记录您的学习历程</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--bread-border)]">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">首页</a>
              <a href="/articles" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">文章</a>
              <a href="/vocab" className="text-[var(--bread-text)] font-body text-base font-semibold tracking-wider hover:text-[var(--bread-accent)] transition">单词本</a>
            </nav>
            <div className="flex items-center gap-3">
              <span className="bread-tag bread-tag-primary">{profile?.target_exam ?? 'CET4'}</span>
              <span className="bread-tag bread-tag-primary">{profile?.major_category ?? '综合'}</span>
              <a href="/settings" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">设置</a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* 统计卡片 */}
        <section className="bread-card-highlight p-8 mb-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--bread-text)] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>{wordStates.length}</div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">总单词数</div>
            </div>
            <div className="text-center border-x border-[var(--bread-border)] px-8">
              <div className="text-3xl font-bold text-[var(--bread-text)] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>{studyPlanCount}</div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">学习计划</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--bread-text)] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>{difficultCount}</div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">较难单词</div>
            </div>
          </div>
        </section>

        {/* 筛选栏 */}
        {/* 筛选栏 */}
        <section className="bread-card p-4 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-xs text-[var(--bread-text-secondary)] tracking-wider w-12">类型</span>
              <div className="flex gap-2">
                <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded text-xs font-medium transition ${filter === 'all' ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>全部 ({wordStates.length})</button>
                <button onClick={() => setFilter('study_plan')} className={`px-4 py-2 rounded text-xs font-medium transition ${filter === 'study_plan' ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>学习计划 ({studyPlanCount})</button>
                <button onClick={() => setFilter('difficult')} className={`px-4 py-2 rounded text-xs font-medium transition ${filter === 'difficult' ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>较难单词 ({difficultCount})</button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[var(--bread-text-secondary)] tracking-wider w-12">等级</span>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => toggleExamLevel('all')} className={`px-3 py-2 rounded text-xs font-medium transition ${examLevelFilter.has('all') ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>全部</button>
                <button onClick={() => toggleExamLevel('common')} className={`px-3 py-2 rounded text-xs font-medium transition ${examLevelFilter.has('common') ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>常见词</button>
                <button onClick={() => toggleExamLevel('CET4')} className={`px-3 py-2 rounded text-xs font-medium transition ${examLevelFilter.has('CET4') ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>CET 4</button>
                <button onClick={() => toggleExamLevel('CET6')} className={`px-3 py-2 rounded text-xs font-medium transition ${examLevelFilter.has('CET6') ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>CET 6</button>
                <button onClick={() => toggleExamLevel('out_of_syllabus')} className={`px-3 py-2 rounded text-xs font-medium transition ${examLevelFilter.has('out_of_syllabus') ? 'bg-[var(--bread-text)] text-white' : 'bg-[var(--bread-highlight)] text-[var(--bread-text)] hover:bg-[var(--bread-border)]'}`}>超纲词</button>
              </div>
            </div>
          </div>
        </section>

        {/* 单词列表 */}
        <section>
          {filteredWords.length === 0 ? (
            <div className="bread-card p-16 text-center">
              <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-2">暂无单词</h3>
              <p className="text-[var(--bread-text-secondary)] text-sm">
                {filter === 'all' ? '您还没有添加任何单词' : filter === 'study_plan' ? '暂无学习计划中的单词' : '暂无较难单词'}
              </p>
              <a href="/articles" className="bread-button-primary mt-6 inline-block">去阅读文章</a>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWords.map((word) => {
                const gloss = getGloss(word);
                const examLevel = getExamLevel(word);
                const hasGloss = !!gloss;
                const isRevealed = revealedGlosses.has(word.id);

                return (
                  <div key={word.id} className="bread-card p-6 border-l-4 border-l-transparent hover:border-l-[var(--bread-primary)] transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl font-bold text-[var(--bread-text)]">{word.lemma}</span>
                          <span className={`bread-tag text-[0.65rem] ${word.vocab_type === 'study_plan' ? 'bread-tag-primary' : 'bread-tag-primary'}`}>
                            {word.vocab_type === 'study_plan' ? '学习计划' : '较难单词'}
                          </span>
                          <span className="bread-tag bread-tag-secondary text-[0.65rem]">
                              {examLevel === 'common' ? '常见词' : examLevel === 'CET4' ? 'CET 4' : examLevel === 'CET6' ? 'CET 6' : '超纲词'}
                            </span>
                        </div>
                        
                        {hasGloss && (
                          <div className="mb-3">
                            {isRevealed ? (
                              <div className="text-sm text-[var(--bread-text-secondary)] bg-[var(--bread-highlight)] px-4 py-3 rounded border border-[var(--bread-border)]">
                                <button onClick={() => setRevealedGlosses(prev => { const next = new Set(prev); next.delete(word.id); return next; })} className="mr-2 text-xs text-[var(--bread-text-secondary)] hover:text-[var(--bread-text)]">
                                  隐藏
                                </button>
                                {gloss}
                              </div>
                            ) : (
                              <button onClick={() => setRevealedGlosses(prev => new Set([...prev, word.id]))} className="text-sm text-[var(--bread-accent)] hover:text-[var(--bread-text)] font-medium">
                                点击显示释义
                              </button>
                            )}
                          </div>
                        )}
                        
                        <div className="text-xs text-[var(--bread-text-secondary)]">
                          添加时间：{new Date(word.updated_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {word.vocab_type === 'study_plan' ? (
                          <button onClick={() => handleUpdateVocabType(word.lemma, 'difficult')} className="px-3 py-2 bg-[var(--bread-highlight)] hover:bg-[var(--bread-border)] text-[var(--bread-text)] text-xs font-medium rounded border border-[var(--bread-border)] transition">
                            改为较难
                          </button>
                        ) : (
                          <button onClick={() => handleUpdateVocabType(word.lemma, 'study_plan')} className="px-3 py-2 bg-[var(--bread-highlight)] hover:bg-[var(--bread-border)] text-[var(--bread-text)] text-xs font-medium rounded border border-[var(--bread-border)] transition">
                            改为学习
                          </button>
                        )}
                        <button onClick={() => handleDelete(word.lemma)} className="px-3 py-2 bg-[var(--bread-highlight)] hover:bg-[var(--bread-border)] text-[var(--bread-text)] text-xs font-medium rounded border border-[var(--bread-border)] transition">
                          已经熟悉
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

      <footer className="border-t border-[var(--bread-text)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-center text-[var(--bread-text-secondary)] text-xs">
            2026 单词面包 WordBread. 保留所有权利。
          </p>
        </div>
      </footer>
    </div>
  );
}
