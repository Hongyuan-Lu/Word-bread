'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { MajorCategory, TargetExam } from '@/types/vocab';
import { MAJOR_CATEGORIES } from '@/types/vocab';

interface Article {
  id: string;
  title_en: string | null;
  title_zh: string | null;
  source_name: string | null;
  source_published_at: string | null;
  subject_category: string | null;
}

interface Profile {
  target_exam: TargetExam;
  major_category: MajorCategory | null;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const pathname = usePathname();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('target_exam, major_category')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        }
      }

      let query = supabase
        .from('articles')
        .select('id, title_en, title_zh, source_name, source_published_at, subject_category')
        .not('cet4_body_en', 'is', null)
        .order('source_published_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching articles:', error);
      } else {
        setArticles(data || []);

        const dates = [...new Set(
          (data || [])
            .map(a => {
              if (!a.source_published_at) return null;
              const date = new Date(a.source_published_at);
              return date.toISOString().split('T')[0];
            })
            .filter((d): d is string => d !== null)
        )].sort().reverse();

        setAvailableDates(dates);
        if (dates.length > 0) {
          setSelectedDate(dates[0]);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase, pathname]);

  const majorCategory = profile?.major_category || '综合';

  const getEffectiveCategory = () => {
    if (selectedCategory) return selectedCategory;
    if (isGuest) return '全部';
    return majorCategory;
  };

  const filteredByCategory = selectedCategory
    ? articles.filter(article => article.subject_category === selectedCategory)
    : isGuest
      ? articles
      : articles.filter(article => article.subject_category === majorCategory);

  const filteredArticles = selectedDate
    ? filteredByCategory.filter(article => {
        if (!article.source_published_at) return false;
        const articleDate = new Date(article.source_published_at).toISOString().split('T')[0];
        return articleDate === selectedDate;
      })
    : filteredByCategory;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatDateForSelect = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
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

  const currentTargetExam = profile?.target_exam || 'CET4';

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      {/* 头部 */}
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* 顶部日期 */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--bread-border)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              每日精选英文新闻
            </div>
          </div>
          
          {/* 标题栏 */}
          <div className="text-center mb-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">
              文章列表
            </h1>
            <p className="text-sm text-[var(--bread-text-secondary)] font-display italic">
              浏览适合您 CET 水平的英文新闻
            </p>
          </div>
          
          {/* 导航栏 */}
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
                  <span className="bread-tag bread-tag-primary">{profile?.target_exam ?? 'CET4'}</span>
                  <span className="bread-tag bread-tag-primary">{profile?.major_category ?? '综合'}</span>
                  <a href="/settings" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">设置</a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* 筛选栏 */}
        <section className="bread-card-highlight p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--bread-text)] mb-1">
                <strong>{getEffectiveCategory()}</strong> 文章
              </h2>
              <p className="text-[var(--bread-text-secondary)] text-xs">
                为 {currentTargetExam} 水平改写的新闻文章
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--bread-text-secondary)]">领域</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bread-input w-auto min-w-[120px] text-xs"
                >
                  <option value="">{isGuest ? '全部领域' : `默认 (${majorCategory})`}</option>
                  {MAJOR_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--bread-text-secondary)]">日期</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bread-input w-auto min-w-[150px] text-xs"
                >
                  <option value="">全部日期</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>{formatDateForSelect(date)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* 文章列表 */}
        <section>
          {filteredArticles.length === 0 ? (
            <div className="bread-card p-16 text-center">
              <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-2">暂无文章</h3>
              <p className="text-[var(--bread-text-secondary)] text-sm">
                {selectedDate ? '该日期暂无文章' : '该领域暂无文章'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <Link key={article.id} href={`/articles/${article.id}`} className="group block">
                  <div className="bread-card p-6 border-l-4 border-l-transparent group-hover:border-l-[var(--bread-primary)] transition-all">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 text-right">
                        <span className="text-lg font-bold text-[var(--bread-accent)]" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg font-bold text-[var(--bread-text)] group-hover:text-[var(--bread-accent)] transition mb-2 line-clamp-2">
                          {article.title_en || '无标题'}
                        </h3>
                        
                        {article.title_zh && (
                          <p className="text-[var(--bread-text-secondary)] text-sm mb-3 line-clamp-1">
                            {article.title_zh}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--bread-text-secondary)]">
                          {article.source_name && (
                            <span className="">{article.source_name}</span>
                          )}
                          {article.source_published_at && (
                            <span>{formatDate(article.source_published_at)}</span>
                          )}
                          {article.subject_category && (
                            <span className="bread-tag bread-tag-secondary text-[0.65rem]">{article.subject_category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 底部 */}
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
