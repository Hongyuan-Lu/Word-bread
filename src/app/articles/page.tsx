'use client';

import { useEffect, useState } from 'react';
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

  const supabase = createClient();

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
          <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  const currentTargetExam = profile?.target_exam || 'CET4';
  const currentMajorCategory = profile?.major_category || '综合';

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      {/* 报纸风格头部 */}
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* 顶部日期和期号 */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--bread-text)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider uppercase">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider uppercase">
              Daily Edition
            </div>
          </div>
          
          {/* 标题栏 */}
          <div className="text-center mb-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">
              Articles
            </h1>
            <div className="newspaper-divider">
              <p className="text-sm text-[var(--bread-text-secondary)] font-display italic tracking-wide">
                Browse news articles rewritten for CET learners
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider uppercase hover:text-[var(--bread-accent)] transition">
                Home
              </a>
              <a href="/articles" className="text-[var(--bread-text)] font-body text-sm font-medium tracking-wider uppercase hover:text-[var(--bread-accent)] transition">
                Articles
              </a>
              <a href="/vocab" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider uppercase hover:text-[var(--bread-accent)] transition">
                Vocabulary
              </a>
            </nav>
            
            <div className="flex items-center gap-4">
              {isGuest ? (
                <>
                  <span className="bread-tag bread-tag-secondary">
                    Guest
                  </span>
                  <a href="/login" className="bread-button-primary text-xs">
                    Sign In
                  </a>
                </>
              ) : (
                <>
                  <span className="bread-tag bread-tag-primary">
                    {profile?.target_exam ?? 'CET4'}
                  </span>
                  <span className="bread-tag bread-tag-secondary">
                    {profile?.major_category ?? 'General'}
                  </span>
                  <a href="/settings" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-text)] transition text-sm">
                    Settings
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* 筛选栏 */}
        <section className="bread-card p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--bread-text)] mb-1">
                {getEffectiveCategory()} Articles
              </h2>
              <p className="text-[var(--bread-text-secondary)] text-xs">
                News articles rewritten for {currentTargetExam} level
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--bread-text-secondary)] tracking-wider uppercase">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bread-input w-auto min-w-[120px] text-xs"
                >
                  <option value="">{isGuest ? 'All Categories' : `Default (${majorCategory})`}</option>
                  {MAJOR_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--bread-text-secondary)] tracking-wider uppercase">Date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bread-input w-auto min-w-[150px] text-xs"
                >
                  <option value="">All Dates</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {formatDateForSelect(date)}
                    </option>
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
              <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-2">
                No Articles Found
              </h3>
              <p className="text-[var(--bread-text-secondary)] text-sm">
                {selectedDate ? 'No articles available for this date' : 'No articles available in this category'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="group block"
                >
                  <div className="bread-card p-6 transition-all group-hover:border-[var(--bread-accent)]">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 text-right">
                        <span className="font-display text-lg font-bold text-[var(--bread-border)]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg font-bold text-[var(--bread-text)] group-hover:text-[var(--bread-accent)] transition mb-2 line-clamp-2">
                          {article.title_en || 'Untitled'}
                        </h3>
                        
                        {article.title_zh && (
                          <p className="text-[var(--bread-text-secondary)] text-sm mb-3 line-clamp-1">
                            {article.title_zh}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--bread-text-secondary)]">
                          {article.source_name && (
                            <span>{article.source_name}</span>
                          )}
                          
                          {article.source_published_at && (
                            <span>{formatDate(article.source_published_at)}</span>
                          )}
                          
                          {article.subject_category && (
                            <span className="bread-tag bread-tag-secondary text-[0.65rem]">
                              {article.subject_category}
                            </span>
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

      {/* 报纸风格底部 */}
      <footer className="border-t border-[var(--bread-text)] bg-white mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="newspaper-divider">
            <p className="text-center text-[var(--bread-text-secondary)] text-xs font-body tracking-wider">
              2026 WordBread. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
