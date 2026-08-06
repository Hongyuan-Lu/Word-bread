'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArticleReader } from '@/components/reader';
import { Loading } from '@/components/Loading';
import type { ArticleToken, TokenType } from '@/types/article';
import type { TargetExam, VocabType } from '@/types/vocab';
import type { ExamLevel } from '@/types/vocab';

interface Article {
  id: string;
  source_url: string | null;
  source_name: string | null;
  source_published_at: string | null;
  title_en: string | null;
  title_zh: string | null;
  cet4_body_zh: string | null;
  cet6_body_zh: string | null;
  subject_category: string | null;
}

interface WordInfo {
  id: string;
  lemma: string;
  pos: string | null;
  cn_gloss: string | null;
  exam_level: ExamLevel;
}

interface EnrichedToken extends ArticleToken {
  pos: string | null;
  cn_gloss: string | null;
  exam_level: ExamLevel | null;
  displayLevel: 0 | 1 | 2;
  word_id: string | null;
}

interface WordState {
  lemma: string;
  vocab_type: VocabType;
}

interface Profile {
  target_exam: TargetExam;
  major_category: string | null;
}

function calculateDisplayLevel(
  userTargetExam: TargetExam,
  wordExamLevel: ExamLevel | null,
  masteryStatus: "known" | "learning" | "unknown"
): 0 | 1 | 2 {
  if (masteryStatus === "known") {
    return 0;
  }

  if (!wordExamLevel) {
    return 2;
  }

  if (masteryStatus === "learning") {
    return 0;
  }

  const examLevel = wordExamLevel;

  if (userTargetExam === "CET4") {
    switch (examLevel) {
      case "common":
        return 0;
      case "CET4":
        return 1;
      case "CET6":
      case "out_of_syllabus":
        return 2;
    }
  }

  if (userTargetExam === "CET6") {
    switch (examLevel) {
      case "common":
      case "CET4":
        return 0;
      case "CET6":
        return 1;
      case "out_of_syllabus":
        return 2;
    }
  }

  return 2;
}

export default function ArticleReadPage() {
  const params = useParams();
  const pathname = usePathname();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [enrichedTokens, setEnrichedTokens] = useState<EnrichedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<TargetExam>('CET4');
  const [userTargetExam, setUserTargetExam] = useState<TargetExam>('CET4');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [readArticles, setReadArticles] = useState<Set<string>>(new Set());
  const [userWordStates, setUserWordStates] = useState<Map<string, VocabType>>(new Map());
  const [articleList, setArticleList] = useState<Article[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState<number>(-1);
  const [isGuest, setIsGuest] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
      } else {
        setIsGuest(false);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('target_exam, major_category')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
          setUserTargetExam(profileData.target_exam as TargetExam);
          setDisplayMode(profileData.target_exam as TargetExam);
        }
      }
    }
    fetchUserProfile();
  }, [supabase, pathname]);

  useEffect(() => {
    async function loadReadArticles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch('/api/read-article');
        if (response.ok) {
          const data = await response.json();
          const readIds = new Set<string>(data.readArticles.map((item: { article_id: string }) => item.article_id));
          setReadArticles(readIds);
          setIsRead(readIds.has(articleId));
        }
      } catch (error) {
        console.error('Failed to load read articles:', error);
      }
    }
    loadReadArticles();
  }, [articleId, supabase]);

  useEffect(() => {
    async function fetchData() {
      if (!articleId || isGuest) return;

      const effectiveDisplayMode = displayMode || userTargetExam;

      const [articleRes, tokensRes] = await Promise.all([
        supabase.from('articles').select('*').eq('id', articleId).single(),
        supabase.from('article_tokens')
          .select('*')
          .eq('article_id', articleId)
          .eq('target_exam', effectiveDisplayMode)
          .order('token_index')
      ]);

      if (articleRes.error) {
        console.error('Error fetching article:', articleRes.error);
        return;
      }

      setArticle(articleRes.data);

      if (articleRes.data?.subject_category) {
        const { data: relatedArticles } = await supabase
          .from('articles')
          .select('id, subject_category')
          .not('cet4_body_en', 'is', null)
          .eq('subject_category', articleRes.data.subject_category)
          .order('source_published_at', { ascending: false });

        if (relatedArticles) {
          setArticleList(relatedArticles as Article[]);
          const index = relatedArticles.findIndex(a => a.id === articleId);
          setCurrentArticleIndex(index);
        }
      }

      if (tokensRes.data && tokensRes.data.length > 0) {
        const tokens: ArticleToken[] = tokensRes.data.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          article_id: t.article_id as string,
          target_exam: t.target_exam as "CET4" | "CET6",
          token_index: t.token_index as number,
          sentence_index: t.sentence_index as number,
          surface: t.surface as string,
          token_type: t.token_type as TokenType,
          lemma: t.lemma as string | null,
          word_id: t.word_id as string | null,
          short_explanation: t.short_explanation as string | null,
        }));

        const wordIds = tokens
          .filter(t => t.word_id)
          .map(t => t.word_id as string);

        let wordInfoMap = new Map<string, WordInfo>();

        if (wordIds.length > 0) {
          const { data: wordsData } = await supabase
            .from('words')
            .select('id, lemma, pos, cn_gloss, exam_level')
            .in('id', wordIds);

          if (wordsData) {
            wordsData.forEach(w => {
              wordInfoMap.set(w.id, {
                id: w.id,
                lemma: w.lemma,
                pos: w.pos,
                cn_gloss: w.cn_gloss,
                exam_level: w.exam_level as ExamLevel,
              });
            });
          }
        }

        const enrichedTokens: EnrichedToken[] = tokens.map(token => {
          let pos: string | null = null;
          let cn_gloss: string | null = null;
          let exam_level: ExamLevel | null = null;

          if (token.word_id && wordInfoMap.has(token.word_id)) {
            const info = wordInfoMap.get(token.word_id)!;
            pos = info.pos;
            cn_gloss = info.cn_gloss;
            exam_level = info.exam_level;
          }

          const vocabType = token.lemma ? userWordStates.get(token.lemma) : null;
          let masteryStatus: "known" | "learning" | "unknown" = "unknown";
          if (vocabType === "study_plan" || vocabType === "difficult") {
            masteryStatus = "learning";
          } else if (vocabType === null && token.lemma && userWordStates.has(token.lemma)) {
            masteryStatus = "known";
          }

          const displayLevel = calculateDisplayLevel(userTargetExam, exam_level, masteryStatus);

          return {
            ...token,
            pos,
            cn_gloss,
            exam_level,
            displayLevel,
            word_id: token.word_id,
          };
        });

        setEnrichedTokens(enrichedTokens);
      }

      setLoading(false);
    }

    fetchData();
  }, [articleId, displayMode, supabase, userWordStates, userTargetExam, profile]);

  useEffect(() => {
    async function loadWordStates() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch('/api/word-states');
        if (response.ok) {
          const data: WordState[] = await response.json();
          const statesMap = new Map<string, VocabType>();
          data.forEach((item) => {
            statesMap.set(item.lemma, item.vocab_type);
          });
          setUserWordStates(statesMap);
        }
      } catch (error) {
        console.error('Failed to load word states:', error);
      }
    }
    loadWordStates();
  }, [supabase]);

  useEffect(() => {
    if (enrichedTokens.length > 0) {
      const updatedTokens = enrichedTokens.map(token => {
        if (token.token_type !== 'word' || !token.exam_level) {
          return token;
        }

        const vocabType = token.lemma ? userWordStates.get(token.lemma) : null;
        let masteryStatus: "known" | "learning" | "unknown" = "unknown";
        if (vocabType === "study_plan" || vocabType === "difficult") {
          masteryStatus = "learning";
        } else if (vocabType === null && token.lemma && userWordStates.has(token.lemma)) {
          masteryStatus = "known";
        }

        const displayLevel = calculateDisplayLevel(userTargetExam, token.exam_level, masteryStatus);

        return {
          ...token,
          displayLevel,
        };
      });

      setEnrichedTokens(updatedTokens);
    }
  }, [userWordStates, userTargetExam, displayMode]);

  const handleAddToStudyPlan = useCallback(async (lemma: string, wordId?: string | null, glossSnapshot?: string | null): Promise<boolean> => {
    try {
      const response = await fetch('/api/word-states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lemma,
          vocab_type: 'study_plan',
          word_id: wordId || null,
          gloss_snapshot: glossSnapshot || null,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const handleMarkDifficult = useCallback(async (lemma: string, wordId?: string | null, glossSnapshot?: string | null): Promise<boolean> => {
    try {
      const response = await fetch('/api/word-states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lemma,
          vocab_type: 'difficult',
          word_id: wordId || null,
          gloss_snapshot: glossSnapshot || null,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const handleMarkKnown = useCallback(async (lemma: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/word-states?lemma=${encodeURIComponent(lemma)}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const handleMarkAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/read-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (response.ok) {
        const data = await response.json();
        setIsRead(data.isRead);
        if (data.isRead) {
          setReadArticles(prev => new Set([...prev, articleId]));
        } else {
          setReadArticles(prev => {
            const next = new Set(prev);
            next.delete(articleId);
            return next;
          });
        }
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [articleId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' (UTC)';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bread-background)]">
        <div className="text-center">
          <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest">加载中...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bread-background)]">
        <div className="bread-card p-12 text-center">
          
          <h2 className="font-display text-2xl font-bold text-[var(--bread-text)] mb-2">文章不存在</h2>
          <p className="text-[var(--bread-text-secondary)]">请检查链接是否正确</p>
          <a href="/articles" className="bread-button-primary text-xs mt-6 inline-block">
            返回文章列表
          </a>
        </div>
      </div>
    );
  }

  const translation = (displayMode || userTargetExam) === 'CET4' ? article.cet4_body_zh : article.cet6_body_zh;

  const majorCategory = profile?.major_category || '综合';

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      {/* 报纸风格头部 */}
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--bread-border)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">每日精选英文新闻</div>
          </div>
          <div className="text-center mb-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">文章阅读</h1>
            <p className="text-sm text-[var(--bread-text-secondary)] font-display italic">沉浸式英语学习</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--bread-border)]">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">首页</a>
              <a href="/articles" className="text-[var(--bread-text)] font-body text-base font-semibold tracking-wider hover:text-[var(--bread-accent)] transition">文章</a>
              <a href="/vocab" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">单词本</a>
            </nav>
            <div className="flex items-center gap-3">
              {isGuest ? (
                <>
                  <span className="bread-tag bread-tag-secondary">游客</span>
                  <a href="/login" className="bread-button-primary text-xs">登录</a>
                </>
              ) : (
                <>
                  <span className="bread-tag bread-tag-primary">{userTargetExam}</span>
                  <span className="bread-tag bread-tag-primary">{majorCategory}</span>
                  <a href="/settings" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">设置</a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 文章信息卡片 */}
        <section className="bread-card mb-8">
          <div className="p-6 border-b border-[var(--bread-border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <a href="/articles" className="text-sm text-[var(--bread-accent)] hover:text-[var(--bread-primary)] transition font-medium">← 返回文章列表</a>
                              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--bread-text-secondary)]">切换难度:</span>
                <div className="flex bg-[var(--bread-highlight)] rounded p-1">
                  <button
                    onClick={() => {
                      setDisplayMode('CET4');
                      setUserTargetExam('CET4');
                    }}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                      displayMode === 'CET4'
                        ? 'bg-[var(--bread-primary)] text-white'
                        : 'text-[var(--bread-text-secondary)]'
                    }`}
                  >
                    CET-4
                  </button>
                  <button
                    onClick={() => {
                      setDisplayMode('CET6');
                      setUserTargetExam('CET6');
                    }}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                      displayMode === 'CET6'
                        ? 'bg-[var(--bread-primary)] text-white'
                        : 'text-[var(--bread-text-secondary)] hover:text-[var(--bread-text)]'
                    }`}
                  >
                    CET-6
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--bread-text)]">
                {article.title_en}
              </h2>
              
              {article.source_name && (
                <p className="text-[var(--bread-text-secondary)]">新闻来源: {article.source_name}</p>
              )}
              
              {article.source_published_at && (
                <p className="text-[var(--bread-text-secondary)]">发布时间: {formatDate(article.source_published_at)}</p>
              )}
              
              <div className="flex items-center justify-between flex-wrap gap-4">
                {article.source_url && (
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--bread-accent)] flex items-center gap-1"
                  >
                    <span>原文链接 ↗</span>
                  </a>
                )}
                
                {article.subject_category && (
                  <span className="bread-tag bread-tag-primary">
                     领域: {article.subject_category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 文章内容 */}
          <div className="p-6">
            {enrichedTokens.length > 0 ? (
              <ArticleReader
                tokens={enrichedTokens}
                targetExam={userTargetExam}
                initialUserWordStates={userWordStates}
                onAddToStudyPlan={handleAddToStudyPlan}
                onMarkDifficult={handleMarkDifficult}
                onMarkKnown={handleMarkKnown}
                isGuest={isGuest}
              />
            ) : (
              <div className="text-center text-[var(--bread-text-secondary)] py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="font-display text-xl">暂无 token 数据</p>
              </div>
            )}
            <p className="text-right text-xs text-[var(--bread-text-secondary)] mt-6">
              文章改写由 MiniMax-M2.7 提供
            </p>
          </div>

          {/* 中文译文 */}
          {translation && (
            <div className="p-6 border-t border-[var(--bread-border)] bg-[var(--bread-highlight)]">
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="flex items-center gap-2 text-[var(--bread-accent)] font-medium mb-4"
              >
                <span>{showTranslation ? '▼' : '▶'}</span>
                <span> 查看中文译文</span>
              </button>
              {showTranslation && (
                <div className="p-4 bg-white rounded-xl border border-[var(--bread-border)]">
                  <p className="text-[var(--bread-text)] leading-relaxed whitespace-pre-wrap mb-3">
                    {translation}
                  </p>
                  <p className="text-right text-xs text-[var(--bread-text-secondary)]">
                    译文由 MiniMax-M2.7 提供
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="p-6 border-t border-[var(--bread-border)]">
            {!isGuest && (
              <button
                onClick={handleMarkAsRead}
                className={`w-full py-3 rounded-xl font-medium transition mb-6 ${
                  isRead
                    ? 'bg-[var(--bread-highlight)] text-[var(--bread-text-secondary)] cursor-pointer'
                    : 'bread-button-primary text-xs'
                }`}
              >
                {isRead ? ' 已完成阅读（再次点击取消）' : ' 标记为已完成阅读'}
              </button>
            )}

            {/* 上下篇文章导航 */}
            {articleList.length > 1 && (
              <div className="flex items-center justify-between gap-4">
                {currentArticleIndex > 0 ? (
                  <a
                    href={`/articles/${articleList[currentArticleIndex - 1].id}`}
                    className="flex-1 py-3 px-4 bg-[var(--bread-highlight)] text-[var(--bread-text)] text-center rounded-xl font-medium text-xs"
                  >
                    返回 上一篇
                  </a>
                ) : (
                  <div className="flex-1 py-3 px-4 bg-[var(--bread-highlight)] text-[var(--bread-text-secondary)] text-center rounded-xl font-medium cursor-default">
                    已是第一篇
                  </div>
                )}

                <div className="text-sm text-[var(--bread-text-secondary)] font-display">
                  {currentArticleIndex + 1} / {articleList.length}
                </div>

                {currentArticleIndex < articleList.length - 1 ? (
                  <a
                    href={`/articles/${articleList[currentArticleIndex + 1].id}`}
                    className="flex-1 py-3 px-4 bg-[var(--bread-highlight)] text-[var(--bread-text)] text-center rounded-xl font-medium text-xs"
                  >
                    下一篇 
                  </a>
                ) : (
                  <div className="flex-1 py-3 px-4 bg-[var(--bread-highlight)] text-[var(--bread-text-secondary)] text-center rounded-xl font-medium cursor-default">
                    已是最后一篇
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 阅读说明 */}
        <section className="bread-card p-6">
          <h4 className="font-display font-bold text-[var(--bread-text)] mb-4">阅读说明</h4>
          <ul className="space-y-2 text-sm text-[var(--bread-text-secondary)]">
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-[var(--bread-highlight)] rounded"></span>
              <span><strong>普通文本</strong>：Level 0，基础词汇</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 word-highlight rounded"></span>
              <span><strong>高亮加粗</strong>：Level 1，当前学习目标重点词</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 h-4 bg-[var(--bread-text-secondary)] rounded"></span>
              <span><strong>灰色文字</strong>：Level 2，超纲词，点击可查看释义</span>
            </li>
          </ul>
        </section>
      </main>

      {/* 报纸风格底部 */}
      <footer className="border-t border-[var(--bread-text)] bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="">
            <p className="text-center text-[var(--bread-text-secondary)] text-sm font-body">
              © 2026 单词面包 WordBread. 保留所有权利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}