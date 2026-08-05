'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loading } from '@/components/Loading';
import type { MajorCategory, TargetExam } from '@/types/vocab';

interface Profile {
  target_exam: TargetExam;
  major_category: MajorCategory | null;
}

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const pathname = usePathname();

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('target_exam, major_category')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile({
          target_exam: 'CET4',
          major_category: '综合',
        });
      }

      const { count } = await supabase
        .from('read_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setReadCount(count || 0);

      setLoading(false);
    };

    fetchData();
  }, [supabase, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl hover:opacity-80 transition">🍞</a>
              <span className="text-lg font-bold text-gray-900">首页</span>
            </div>
            <nav className="flex items-center gap-3">
              {isGuest ? (
                <>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    👤 游客访问
                  </span>
                  <a
                    href="/login"
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition"
                  >
                    登录 / 注册
                  </a>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    {profile?.target_exam ?? 'CET4'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    {profile?.major_category ?? '综合'}
                  </span>
                  <a
                    href="/settings"
                    className="p-2 text-gray-600 hover:text-orange-600 transition"
                    title="设置"
                  >
                    ⚙️
                  </a>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* 欢迎区域 */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            单词面包 🍞
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {isGuest
              ? '基于AI的新闻阅读工具，专为CET4/CET6备考设计'
              : profile?.target_exam === 'CET4'
              ? '基于AI的新闻阅读工具，专为CET4/CET6备考设计'
              : '基于AI的新闻阅读工具，专为CET4/CET6备考设计'}
          </p>

          {/* 游客提示 */}
          {isGuest && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-8 mb-8 max-w-2xl mx-auto text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    欢迎游客！开始您的英语学习之旅
                  </h3>
                  <p className="text-gray-600 mb-4">
                    您可以浏览文章、阅读内容、查看单词释义，但您的学习进度不会保存。
                  <p className="text-gray-600 mb-1"></p>
                    <strong>注册账户</strong>后，学习进度将同步到云端，随时随地继续学习！
                  </p>
                  <div className="flex gap-3 justify-center">
                    <a
                      href="/login"
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition flex items-center gap-2"
                    >
                      <span>🔓</span>
                      <span>立即登录 / 注册</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 状态卡片 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-3">🎓</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isGuest ? '游客' : (profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6')}
                </div>
                <div className="text-sm text-gray-500">学习目标</div>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isGuest ? '全部' : (profile?.major_category || '综合')}
                </div>
                <div className="text-sm text-gray-500">专业领域</div>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <div className="text-4xl mb-3">📖</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {isGuest ? '无记录' : readCount}
                </div>
                <div className="text-sm text-gray-500">已阅读文章</div>
              </div>
            </div>
          </div>

          {/* 功能入口 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a
              href="/articles"
              className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="text-5xl mb-4">📰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition">
                阅读文章
              </h3>
              <p className="text-gray-600">
                浏览适合您的英文新闻，标注重点词汇
              </p>
            </a>
            <a
              href="/vocab"
              className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition">
                我的单词
              </h3>
              <p className="text-gray-600">
                查看您标记过的单词，记录学习历程
              </p>
            </a>
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-center text-gray-500 text-sm">
            © 2026 单词面包 WordBread · 让英语学习更简单
          </p>
        </div>
      </footer>
    </div>
  );
}