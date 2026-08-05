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
      <div className="min-h-screen flex items-center justify-center bg-bread-background">
        <div className="text-center">
          <div className="text-6xl mb-4 bread-loading">🍞</div>
          <p className="text-bread-primary font-display text-xl">烘焙中...</p>
        </div>
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
            <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 mb-2 tracking-tight">
              单词面包
            </h1>
            <div className="newspaper-divider">
              <p className="text-lg text-bread-primary font-display italic">
                WordBread · 将新闻烘焙成知识
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-6">
              <a href="/" className="text-gray-900 font-display font-semibold text-lg hover:text-bread-primary transition">
                首页
              </a>
              <a href="/articles" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
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
        {/* 欢迎区域 - 报纸头条风格 */}
        <section className="mb-12">
          {isGuest ? (
            <div className="bread-card p-8 md:p-12 text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  欢迎来到<span className="text-gradient-bread">单词面包</span>
                </h2>
                <p className="text-xl text-gray-600 mb-8 font-body leading-relaxed">
                  基于 AI 的新闻阅读工具，专为 CET4/CET6 备考设计。
                  <br />
                  每天花 10-15 分钟阅读一篇真实新闻，自然积累考试词汇。
                </p>
                
                <div className="bread-card bg-gradient-to-br from-amber-50 to-orange-50 p-6 mb-8">
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-4">
                    🎯 开始您的学习之旅
                  </h3>
                  <p className="text-gray-600 mb-6">
                    注册账户后，学习进度将同步到云端，随时随地继续学习！
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/login" className="bread-button-primary text-lg px-8 py-4">
                      🚀 立即登录 / 注册
                    </a>
                    <a href="/articles" className="bread-button-secondary text-lg px-8 py-4">
                      📰 先看看文章
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bread-card p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  欢迎回来，<span className="text-gradient-bread">学习者</span>
                </h2>
                <p className="text-xl text-gray-600 font-body">
                  继续您的英语学习之旅
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 统计卡片 - 报纸风格 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bread-card p-6 text-center">
            <div className="text-5xl mb-4">📚</div>
            <div className="font-display text-3xl font-bold text-gray-900 mb-2">
              {isGuest ? '游客' : (profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6')}
            </div>
            <div className="text-sm text-gray-600 font-body uppercase tracking-wider">
              学习目标
            </div>
          </div>
          
          <div className="bread-card p-6 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <div className="font-display text-3xl font-bold text-gray-900 mb-2">
              {isGuest ? '全部' : (profile?.major_category || '综合')}
            </div>
            <div className="text-sm text-gray-600 font-body uppercase tracking-wider">
              专业领域
            </div>
          </div>
          
          <div className="bread-card p-6 text-center">
            <div className="text-5xl mb-4">📰</div>
            <div className="font-display text-3xl font-bold text-gray-900 mb-2">
              {isGuest ? '—' : readCount}
            </div>
            <div className="text-sm text-gray-600 font-body uppercase tracking-wider">
              已阅读文章
            </div>
          </div>
        </section>

        {/* 功能入口 - 杂志风格 */}
        <section className="mb-12">
          <div className="newspaper-divider">
            <h2 className="font-display text-3xl font-bold text-gray-900 text-center">
              开始学习
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <a href="/articles" className="group block">
              <div className="bread-card p-8 h-full transition-all group-hover:border-bread-primary">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">📰</div>
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-3 group-hover:text-bread-primary transition">
                  阅读文章
                </h3>
                <p className="text-gray-600 font-body text-lg leading-relaxed">
                  浏览适合您的英文新闻，标注重点词汇，通过真实语境积累考试词汇。
                </p>
                <div className="mt-6 flex items-center text-bread-primary font-display font-semibold">
                  开始阅读
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </a>
            
            <a href="/vocab" className="group block">
              <div className="bread-card p-8 h-full transition-all group-hover:border-bread-primary">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">📝</div>
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-3 group-hover:text-bread-primary transition">
                  我的单词
                </h3>
                <p className="text-gray-600 font-body text-lg leading-relaxed">
                  查看您标记过的单词，记录学习历程，巩固词汇记忆。
                </p>
                <div className="mt-6 flex items-center text-bread-primary font-display font-semibold">
                  查看单词本
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* 学习提示 */}
        <section className="bread-card bg-gradient-to-r from-amber-50 to-orange-50 p-8 mb-12">
          <div className="text-center">
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-4">
              💡 学习小贴士
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h4 className="font-display font-bold text-gray-900 mb-2">1. 每日坚持</h4>
                <p className="text-gray-600 text-sm">每天阅读一篇新闻，10-15分钟即可完成</p>
              </div>
              <div>
                <h4 className="font-display font-bold text-gray-900 mb-2">2. 标注词汇</h4>
                <p className="text-gray-600 text-sm">遇到生词点击查看详情，添加到学习计划</p>
              </div>
              <div>
                <h4 className="font-display font-bold text-gray-900 mb-2">3. 定期复习</h4>
                <p className="text-gray-600 text-sm">在单词本中复习已学词汇，巩固记忆</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 报纸风格底部 */}
      <footer className="border-t-2 border-gray-900 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-display font-bold text-gray-900 mb-4">关于单词面包</h4>
              <p className="text-gray-600 text-sm">
                基于 AI 的英语新闻阅读工具，专为 CET4/CET6 学习者设计。
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-gray-900 mb-4">快速链接</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/articles" className="text-gray-600 hover:text-bread-primary transition">文章列表</a></li>
                <li><a href="/vocab" className="text-gray-600 hover:text-bread-primary transition">我的单词</a></li>
                <li><a href="/settings" className="text-gray-600 hover:text-bread-primary transition">设置</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-gray-900 mb-4">联系我们</h4>
              <p className="text-gray-600 text-sm">
                hongyuanlu9@gmail.com
              </p>
            </div>
          </div>
          <div className="newspaper-divider mt-8">
            <p className="text-center text-gray-600 text-sm font-body">
              © 2026 单词面包 WordBread · 让英语学习更简单
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
