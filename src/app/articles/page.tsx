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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  const currentTargetExam = profile?.target_exam || 'CET4';
  const currentMajorCategory = profile?.major_category || '综合';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl hover:opacity-80 transition">🍞</a>
              <span className="text-lg font-bold text-gray-900">文章列表</span>
            </div>
            <nav className="flex items-center gap-3">
              {!isGuest && (
                <>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    {currentTargetExam}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    {currentMajorCategory}
                  </span>
                  <a
                    href="/vocab"
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-400 transition"
                  >
                    我的单词
                  </a>
                  <a
                    href="/settings"
                    className="p-2 text-gray-600 hover:text-orange-600 transition"
                    title="设置"
                  >
                    ⚙️
                  </a>
                </>
              )}
              {isGuest && (
                <>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    👤 游客访问
                  </span>
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition"
                  >
                    登录 / 注册
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{getEffectiveCategory()} 文章列表</h2>
              <p className="text-sm text-gray-500">
                {getEffectiveCategory()} 领域的新闻
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">领域:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                <label className="text-sm text-gray-600">日期:</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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

          {filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-500">
                {selectedDate ? '该日期暂无' : '暂无'}{getEffectiveCategory()}领域的最新新闻
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map(article => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="block p-4 border rounded-xl hover:shadow-md transition group"
                >
                  <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition">
                    {article.title_en || '无标题'}
                  </h3>
                  {article.title_zh && (
                    <p className="text-sm text-gray-600 mt-1">
                      {article.title_zh}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {article.source_name && (
                      <span>来源: {article.source_name}</span>
                    )}
                    {article.source_published_at && (
                      <span>{formatDate(article.source_published_at)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
