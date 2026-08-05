'use client';

import { useEffect, useState } from 'react';
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bread-background)]">
        <div className="text-center">
          <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest">加载中</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      {/* 报纸风格头部 */}
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* 顶部日期 */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--bread-text)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              每日精选
            </div>
          </div>
          
          {/* 标题栏 */}
          <div className="text-center mb-4">
            <h1 className="font-display text-5xl md:text-6xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">
              单词面包
            </h1>
            <div className="newspaper-divider">
              <p className="text-sm text-[var(--bread-text-secondary)] font-display italic tracking-wide">
                面向 CET4/CET6 学习者的 AI 英语新闻阅读工具
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text)] font-body text-sm font-medium tracking-wider hover:text-[var(--bread-accent)] transition">
                首页
              </a>
              <a href="/articles" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">
                文章
              </a>
              <a href="/vocab" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">
                单词本
              </a>
            </nav>
            
            <div className="flex items-center gap-4">
              {isGuest ? (
                <>
                  <span className="bread-tag bread-tag-secondary">
                    游客
                  </span>
                  <a href="/login" className="bread-button-primary text-xs">
                    登录
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
                  <a href="/settings" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-text)] transition text-sm">
                    设置
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* 欢迎区域 */}
        <section className="mb-16">
          {isGuest ? (
            <div className="bread-card-warm p-10 md:p-16 text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-6">
                  欢迎来到<span className="text-gradient-bread">单词面包</span>
                </h2>
                <p className="text-lg text-[var(--bread-text-secondary)] mb-10 font-body leading-relaxed">
                  基于 AI 的新闻阅读工具，专为 CET4/CET6 备考设计。
                  <br />
                  每天花 10-15 分钟阅读一篇真实新闻，自然积累考试词汇。
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/login" className="bread-button-primary">
                    立即登录
                  </a>
                  <a href="/articles" className="bread-button-secondary">
                    浏览文章
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bread-card-warm p-10 md:p-14">
              <div className="text-center">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-4">
                  欢迎回来
                </h2>
                <p className="text-lg text-[var(--bread-text-secondary)] font-body">
                  继续您的英语学习之旅
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 统计卡片 - 高亮背景 */}
        <section className="bread-card-highlight p-8 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="step-number mx-auto mb-3">1</div>
              <div className="font-display text-2xl font-bold text-[var(--bread-text)] mb-1">
                {isGuest ? '游客' : (profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6')}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">
                学习目标
              </div>
            </div>
            
            <div className="text-center border-x border-[var(--bread-border)] px-8">
              <div className="step-number mx-auto mb-3">2</div>
              <div className="font-display text-2xl font-bold text-[var(--bread-text)] mb-1">
                {isGuest ? '全部' : (profile?.major_category || '综合')}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">
                专业领域
              </div>
            </div>
            
            <div className="text-center">
              <div className="step-number mx-auto mb-3">3</div>
              <div className="font-display text-2xl font-bold text-[var(--bread-text)] mb-1">
                {isGuest ? '-' : readCount}
              </div>
              <div className="text-xs text-[var(--bread-text-secondary)] tracking-wider">
                已阅读文章
              </div>
            </div>
          </div>
        </section>

        {/* 功能入口 */}
        <section className="mb-16">
          <div className="newspaper-divider">
            <h2 className="font-display text-2xl font-bold text-[var(--bread-text)] text-center">
              开始学习
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <a href="/articles" className="group block">
              <div className="bread-card p-8 h-full border-l-4 border-l-transparent group-hover:border-l-[var(--bread-primary)] transition-all">
                <div className="text-xs text-[var(--bread-accent)] tracking-widest mb-3">文章</div>
                <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-3">
                  阅读英文新闻
                </h3>
                <p className="text-[var(--bread-text-secondary)] font-body text-sm leading-relaxed">
                  浏览适合您 CET 水平的英文新闻，点击高亮词汇在语境中学习。
                </p>
              </div>
            </a>
            
            <a href="/vocab" className="group block">
              <div className="bread-card p-8 h-full border-l-4 border-l-transparent group-hover:border-l-[var(--bread-primary)] transition-all">
                <div className="text-xs text-[var(--bread-accent)] tracking-widest mb-3">词汇</div>
                <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-3">
                  管理单词本
                </h3>
                <p className="text-[var(--bread-text-secondary)] font-body text-sm leading-relaxed">
                  复习您在阅读中保存的单词，巩固记忆，追踪学习进度。
                </p>
              </div>
            </a>
          </div>
        </section>

        {/* 使用方法 - 三栏布局 */}
        <section className="mb-16">
          <div className="newspaper-divider">
            <h2 className="font-display text-2xl font-bold text-[var(--bread-text)] text-center">
              使用方法
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bread-card p-6 border-t-4 border-t-[var(--bread-primary)]">
              <div className="font-display text-3xl font-bold text-[var(--bread-primary)] mb-4">01</div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-2">每日阅读</h4>
              <p className="text-[var(--bread-text-secondary)] text-sm leading-relaxed">
                每天花 10-15 分钟阅读一篇 AI 改写的英文新闻
              </p>
            </div>
            
            <div className="bread-card p-6 border-t-4 border-t-[var(--bread-primary)]">
              <div className="font-display text-3xl font-bold text-[var(--bread-primary)] mb-4">02</div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-2">保存生词</h4>
              <p className="text-[var(--bread-text-secondary)] text-sm leading-relaxed">
                遇到不认识的单词，点击查看释义并添加到单词本
              </p>
            </div>
            
            <div className="bread-card p-6 border-t-4 border-t-[var(--bread-primary)]">
              <div className="font-display text-3xl font-bold text-[var(--bread-primary)] mb-4">03</div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-2">定期复习</h4>
              <p className="text-[var(--bread-text-secondary)] text-sm leading-relaxed">
                在单词本中复习已保存的词汇，巩固记忆
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 报纸风格底部 */}
      <footer className="border-t border-[var(--bread-text)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">关于单词面包</h4>
              <p className="text-[var(--bread-text-secondary)] text-xs leading-relaxed">
                面向 CET4/CET6 学习者的 AI 英语新闻阅读工具。
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">导航</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="/articles" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">文章列表</a></li>
                <li><a href="/vocab" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">我的单词</a></li>
                <li><a href="/settings" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">设置</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">联系我们</h4>
              <p className="text-[var(--bread-text-secondary)] text-xs">
                hongyuanlu9@gmail.com
              </p>
            </div>
          </div>
          <div className="newspaper-divider">
            <p className="text-center text-[var(--bread-text-secondary)] text-xs font-body tracking-wider">
              2026 单词面包 WordBread. 保留所有权利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
