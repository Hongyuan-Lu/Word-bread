'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('profiles').select('target_exam, major_category').eq('user_id', user.id).single();
      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile({ target_exam: 'CET4', major_category: '综合' });
      }
      const { count } = await supabase.from('read_articles').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      setReadCount(count || 0);
      setLoading(false);
    };
    fetchData();
  }, [supabase, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bread-background)]">
        <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--bread-border)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">每日精选英文新闻</div>
          </div>
          <div className="text-center mb-3">
            <h1 className="font-display text-5xl md:text-6xl font-bold text-[var(--bread-text)] mb-2 tracking-tight">单词面包</h1>
            <p className="text-sm text-[var(--bread-text-secondary)] font-display italic">面向 CET 4 / CET 6 学习者的 AI 英语新闻阅读工具</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--bread-border)]">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text)] font-body text-base font-semibold tracking-wider hover:text-[var(--bread-accent)] transition">首页</a>
              <a href="/articles" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">文章</a>
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
                  <a href="/settings" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">设置</a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* 欢迎区域 */}
        <section className="mb-12">
          {isGuest ? (
            <div className="bread-card-warm p-8 md:p-12 text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--bread-text)] mb-4">
                  欢迎来到<span className="text-gradient-bread">单词面包</span>
                </h2>
                <p className="text-[var(--bread-text-secondary)] mb-8 font-body leading-relaxed">
                  基于 AI 的新闻阅读工具，专为 CET4/CET6 备考设计。<br />只需花 10 分钟阅读一篇真实新闻，自然积累考试词汇。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/login" className="bread-button-primary">立即登录</a>
                  <a href="/articles" className="bread-button-secondary">浏览文章</a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bread-card-warm p-8 md:p-12 text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--bread-text)] mb-3">欢迎回来</h2>
              <p className="text-[var(--bread-text-secondary)] font-body">继续您的英语学习之旅</p>
            </div>
          )}
        </section>

        {/* 统计卡片 */}
        <section className="bread-card-highlight p-6 mb-8">
          <div className="grid grid-cols-3 gap-0">
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--bread-text)] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                {isGuest ? '游客' : (profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6')}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">学习目标</div>
            </div>
            <div className="text-center border-x-2 border-[var(--bread-border)]">
              <div className="text-xl font-bold text-[var(--bread-text)] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                {isGuest ? '全部' : (profile?.major_category || '综合')}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">专业领域</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--bread-text)] mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                {isGuest ? '-' : readCount}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">已阅读文章</div>
            </div>
          </div>
        </section>

        {/* 功能入口 */}
        <section className="mb-4">
          <div className="border-t border-[var(--bread-text)] pt-6 mb-6">
            <h2 className="font-display text-xl font-bold text-[var(--bread-text)]">开始学习</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/articles" className="group block">
              <div className="bread-card p-6 h-full border-l-4 border-l-transparent group-hover:border-l-[var(--bread-primary)] transition-all">
                <div className="text-xs text-[var(--bread-accent)] tracking-widest mb-2">文章</div>
                <h3 className="font-display text-lg font-bold text-[var(--bread-text)] mb-2">阅读英文新闻</h3>
                <p className="text-[var(--bread-text-secondary)] font-body text-sm leading-relaxed">浏览适合您 CET 水平的英文新闻，点击词汇在语境中学习。</p>
                <div className="mt-3 text-[var(--bread-accent)] text-sm">浏览文章 →</div>
              </div>
            </a>
            <a href="/vocab" className="group block">
              <div className="bread-card p-6 h-full border-l-4 border-l-transparent group-hover:border-l-[var(--bread-primary)] transition-all">
                <div className="text-xs text-[var(--bread-accent)] tracking-widest mb-2">词汇</div>
                <h3 className="font-display text-lg font-bold text-[var(--bread-text)] mb-2">管理单词本</h3>
                <p className="text-[var(--bread-text-secondary)] font-body text-sm leading-relaxed">复习您在阅读中保存的单词，巩固记忆，追踪学习进度。</p>
                <div className="mt-3 text-[var(--bread-accent)] text-sm">查看单词本 →</div>
              </div>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--bread-text)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">核心功能</h4>
              <div className="flex flex-wrap gap-4 text-xs text-[var(--bread-text-secondary)]">
                <span>实时英文新闻获取</span>
                <span>CET4/6水平改写</span>
                <span>专业领域新闻匹配</span>
                <span>单词本每日复习</span>
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">导航</h4>
              <div className="flex gap-4 text-xs">
                <a href="/articles" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">文章列表</a>
                <a href="/vocab" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">单词本</a>
                <a href="/settings" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">设置</a>
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">联系我们</h4>
              <p className="text-[var(--bread-text-secondary)] text-xs">hongyuanlu9@gmail.com</p>
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--bread-border)]">
            <p className="text-center text-[var(--bread-text-secondary)] text-xs">2026 单词面包 WordBread. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
