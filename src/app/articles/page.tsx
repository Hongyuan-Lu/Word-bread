'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loading } from '@/components/Loading';
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
      <div className="min-h-screen flex items-center justify-center bg-bread-background">
        <div className="text-center">
          <div className="text-6xl mb-4 bread-loading">🍞</div>
          <p className="text-bread-primary font-display text-xl">烘焙中...</p>
        </div>
      </div>
    );
  }

  const currentTargetExam = profile?.target_exam || 'CET4';
  const currentMajorCategory = profile?.major_category || '综合';

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
              文章列表
            </h1>
            <div className="newspaper-divider">
              <p className="text-lg text-bread-primary font-display italic">
                浏览适合您的英文新闻
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-6">
              <a href="/" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                首页
              </a>
              <a href="/articles" className="text-gray-900 font-display font-semibold text-lg hover:text-bread-primary transition">
                文章
              </a>
              <a href="/vocab" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                单词本
              </a>
            </nav>
            
            <div className="flex items-center gap-4">
              {isGuest ? (
                <>
                  <span className="bread-tag bread-tag-secondary">
                    👤 游客
                  </span>
                  <a href="/login" className="bread-button-primary text-sm">
                    登录 / 注册
                  </a>
                </>
              ) : (
                <>
                  <span className="bread-tag bread-tag-primary">
                    {profile?.target_exam ?? 'CET4'}
                  </span>
                  <span className="bread-tag bread-tag-secondary">
                    {profile?.major_category ?? '综合'}
                  </span>
                  <a href="/settings" className="text-gray-600 hover:text-bread-primary transition" title="设置">
                    ⚙️
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 筛选栏 */}
        <section className="bread-card p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
                {getEffectiveCategory()} 文章
              </h2>
              <p className="text-gray-600 text-sm">
                {getEffectiveCategory()} 领域的最新新闻，已为您改写为适合 {currentTargetExam} 水平的学习材料
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">领域:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bread-input w-auto min-w-[120px]"
                >
                  <option value="">{isGuest ? '全部领域' : `默认 (${majorCategory})`}</option>
                  {MAJOR_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">日期:</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bread-input w-auto min-w-[150px]"
                >
                  <option value="">全部日期</option>
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
            <div className="bread-card p-12 text-center">
              <div className="text-6xl mb-4">📰</div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                暂无文章
              </h3>
              <p className="text-gray-600">
                {selectedDate ? '该日期暂无' : '暂无'}{getEffectiveCategory()}领域的最新新闻
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
                  <div className="bread-card p-6 transition-all group-hover:border-bread-primary">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
                        <span className="font-display font-bold text-bread-primary text-lg">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl font-bold text-gray-900 group-hover:text-bread-primary transition mb-2 line-clamp-2">
                          {article.title_en || '无标题'}
                        </h3>
                        
                        {article.title_zh && (
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {article.title_zh}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          {article.source_name && (
                            <span className="flex items-center gap-1">
                              <span>📰</span>
                              <span>{article.source_name}</span>
                            </span>
                          )}
                          
                          {article.source_published_at && (
                            <span className="flex items-center gap-1">
                              <span>📅</span>
                              <span>{formatDate(article.source_published_at)}</span>
                            </span>
                          )}
                          
                          {article.subject_category && (
                            <span className="bread-tag bread-tag-secondary text-xs">
                              {article.subject_category}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-bread-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
