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
          <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

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
            <h1 className="font-display text-5xl md:text-6xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">
              WordBread
            </h1>
            <div className="newspaper-divider">
              <p className="text-sm text-[var(--bread-text-secondary)] font-display italic tracking-wide">
                AI-Powered English Reading for CET Learners
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text)] font-body text-sm font-medium tracking-wider uppercase hover:text-[var(--bread-accent)] transition">
                Home
              </a>
              <a href="/articles" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider uppercase hover:text-[var(--bread-accent)] transition">
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
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* 欢迎区域 */}
        <section className="mb-16">
          {isGuest ? (
            <div className="bread-card p-10 md:p-14 text-center">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-6">
                  Welcome to <span className="text-gradient-bread">WordBread</span>
                </h2>
                <p className="text-lg text-[var(--bread-text-secondary)] mb-10 font-body leading-relaxed">
                  An AI-powered news reader designed for CET4/CET6 learners.
                  <br />
                  Read one article daily to naturally build your vocabulary.
                </p>
                
                <div className="bread-card bg-[var(--bread-background)] p-8 mb-10">
                  <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-4">
                    Start Your Learning Journey
                  </h3>
                  <p className="text-[var(--bread-text-secondary)] mb-8 text-sm">
                    Sign up to sync your progress across devices
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/login" className="bread-button-primary">
                      Get Started
                    </a>
                    <a href="/articles" className="bread-button-secondary">
                      Browse Articles
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bread-card p-10 md:p-14">
              <div className="text-center mb-10">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-4">
                  Welcome back
                </h2>
                <p className="text-lg text-[var(--bread-text-secondary)] font-body">
                  Continue your English learning journey
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 统计卡片 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bread-card p-8 text-center">
            <div className="font-display text-3xl font-bold text-[var(--bread-text)] mb-2">
              {isGuest ? 'Guest' : (profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6')}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-widest uppercase">
              Target Exam
            </div>
          </div>
          
          <div className="bread-card p-8 text-center">
            <div className="font-display text-3xl font-bold text-[var(--bread-text)] mb-2">
              {isGuest ? 'All' : (profile?.major_category || 'General')}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-widest uppercase">
              Focus Area
            </div>
          </div>
          
          <div className="bread-card p-8 text-center">
            <div className="font-display text-3xl font-bold text-[var(--bread-text)] mb-2">
              {isGuest ? '-' : readCount}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-widest uppercase">
              Articles Read
            </div>
          </div>
        </section>

        {/* 功能入口 */}
        <section className="mb-16">
          <div className="newspaper-divider">
            <h2 className="font-display text-2xl font-bold text-[var(--bread-text)] text-center">
              Start Reading
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <a href="/articles" className="group block">
              <div className="bread-card p-8 h-full transition-all group-hover:border-[var(--bread-accent)]">
                <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-3 group-hover:text-[var(--bread-accent)] transition">
                  Read Articles
                </h3>
                <p className="text-[var(--bread-text-secondary)] font-body text-sm leading-relaxed">
                  Browse AI-rewritten news articles tailored to your CET level. 
                  Click on highlighted words to learn vocabulary in context.
                </p>
                <div className="mt-6 text-[var(--bread-accent)] font-body text-sm font-medium tracking-wider uppercase">
                  Browse
                </div>
              </div>
            </a>
            
            <a href="/vocab" className="group block">
              <div className="bread-card p-8 h-full transition-all group-hover:border-[var(--bread-accent)]">
                <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-3 group-hover:text-[var(--bread-accent)] transition">
                  My Vocabulary
                </h3>
                <p className="text-[var(--bread-text-secondary)] font-body text-sm leading-relaxed">
                  Review words you've saved while reading. 
                  Track your learning progress and strengthen your memory.
                </p>
                <div className="mt-6 text-[var(--bread-accent)] font-body text-sm font-medium tracking-wider uppercase">
                  Review
                </div>
              </div>
            </a>
          </div>
        </section>

        {/* 学习提示 */}
        <section className="bread-card bg-[var(--bread-background)] p-10 mb-16">
          <div className="text-center">
            <h3 className="font-display text-xl font-bold text-[var(--bread-text)] mb-8">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div>
                <div className="text-xs text-[var(--bread-accent)] font-body tracking-widest uppercase mb-2">01</div>
                <h4 className="font-display font-bold text-[var(--bread-text)] mb-2">Read Daily</h4>
                <p className="text-[var(--bread-text-secondary)] text-sm">One article per day, 10-15 minutes</p>
              </div>
              <div>
                <div className="text-xs text-[var(--bread-accent)] font-body tracking-widest uppercase mb-2">02</div>
                <h4 className="font-display font-bold text-[var(--bread-text)] mb-2">Save Words</h4>
                <p className="text-[var(--bread-text-secondary)] text-sm">Click highlighted words to add to your list</p>
              </div>
              <div>
                <div className="text-xs text-[var(--bread-accent)] font-body tracking-widest uppercase mb-2">03</div>
                <h4 className="font-display font-bold text-[var(--bread-text)] mb-2">Review</h4>
                <p className="text-[var(--bread-text-secondary)] text-sm">Revisit saved words to strengthen memory</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 报纸风格底部 */}
      <footer className="border-t border-[var(--bread-text)] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">About WordBread</h4>
              <p className="text-[var(--bread-text-secondary)] text-xs leading-relaxed">
                An AI-powered English news reader for CET4/CET6 learners.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">Navigate</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="/articles" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">Articles</a></li>
                <li><a href="/vocab" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">Vocabulary</a></li>
                <li><a href="/settings" className="text-[var(--bread-text-secondary)] hover:text-[var(--bread-accent)] transition">Settings</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-[var(--bread-text)] mb-3 text-sm">Contact</h4>
              <p className="text-[var(--bread-text-secondary)] text-xs">
                hongyuanlu9@gmail.com
              </p>
            </div>
          </div>
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
