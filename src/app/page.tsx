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
      const { data: { user } } = await supabase.auth.getUser();

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
        setProfile({ target_exam: 'CET4', major_category: '综合' });
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <p className="text-gray-400 text-sm tracking-widest uppercase animate-pulse">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b-[1.5px] border-[#2D2D2D]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <div className="text-xs text-gray-400 tracking-wider uppercase">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-xs text-gray-400 tracking-wider uppercase">Daily Edition</div>
          </div>
          
          <div className="text-center mb-4">
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#2D2D2D] mb-3">WordBread</h1>
            <div className="border-t-[1.5px] border-[#2D2D2D] border-b border-gray-200 py-3 my-6">
              <p className="text-sm text-gray-400 italic tracking-wide">AI-Powered English Reading for CET Learners</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[#2D2D2D] text-sm font-medium tracking-wider uppercase">Home</a>
              <a href="/articles" className="text-gray-400 text-sm tracking-wider uppercase hover:text-[#8B6F47] transition">Articles</a>
              <a href="/vocab" className="text-gray-400 text-sm tracking-wider uppercase hover:text-[#8B6F47] transition">Vocabulary</a>
            </nav>
            
            <div className="flex items-center gap-4">
              {isGuest ? (
                <>
                  <span className="text-xs text-gray-400 border border-gray-200 px-3 py-1 tracking-wider uppercase">Guest</span>
                  <a href="/login" className="bg-[#2D2D2D] text-white text-xs px-4 py-2 tracking-wider hover:bg-black transition">Sign In</a>
                </>
              ) : (
                <>
                  <span className="text-xs text-[#8B6F47] border border-[#8B6F47] px-3 py-1 tracking-wider uppercase">{profile?.target_exam ?? 'CET4'}</span>
                  <span className="text-xs text-gray-400 border border-gray-200 px-3 py-1 tracking-wider uppercase">{profile?.major_category ?? 'General'}</span>
                  <a href="/settings" className="text-gray-400 hover:text-[#2D2D2D] text-sm transition">Settings</a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {isGuest ? (
          <section className="mb-16">
            <div className="bg-white border border-gray-200 p-10 md:p-14 text-center shadow-sm">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-6">
                  Welcome to <span className="text-[#8B6F47]">WordBread</span>
                </h2>
                <p className="text-lg text-gray-500 mb-10 leading-relaxed">
                  An AI-powered news reader designed for CET4/CET6 learners.<br />
                  Read one article daily to naturally build your vocabulary.
                </p>
                
                <div className="bg-[#FAFAF8] p-8 mb-10">
                  <h3 className="font-serif text-xl font-bold text-[#2D2D2D] mb-4">Start Your Learning Journey</h3>
                  <p className="text-gray-400 mb-8 text-sm">Sign up to sync your progress across devices</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/login" className="bg-[#2D2D2D] text-white text-sm px-6 py-3 tracking-wider hover:bg-black transition">Get Started</a>
                    <a href="/articles" className="border border-[#2D2D2D] text-[#2D2D2D] text-sm px-6 py-3 tracking-wider hover:bg-[#2D2D2D] hover:text-white transition">Browse Articles</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-16">
            <div className="bg-white border border-gray-200 p-10 md:p-14 shadow-sm">
              <div className="text-center mb-10">
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-4">Welcome back</h2>
                <p className="text-lg text-gray-500">Continue your English learning journey</p>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white border border-gray-200 p-8 text-center shadow-sm">
            <div className="font-serif text-3xl font-bold text-[#2D2D2D] mb-2">
              {isGuest ? 'Guest' : (profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6')}
            </div>
            <div className="text-xs text-gray-400 tracking-widest uppercase">Target Exam</div>
          </div>
          <div className="bg-white border border-gray-200 p-8 text-center shadow-sm">
            <div className="font-serif text-3xl font-bold text-[#2D2D2D] mb-2">
              {isGuest ? 'All' : (profile?.major_category || 'General')}
            </div>
            <div className="text-xs text-gray-400 tracking-widest uppercase">Focus Area</div>
          </div>
          <div className="bg-white border border-gray-200 p-8 text-center shadow-sm">
            <div className="font-serif text-3xl font-bold text-[#2D2D2D] mb-2">
              {isGuest ? '-' : readCount}
            </div>
            <div className="text-xs text-gray-400 tracking-widest uppercase">Articles Read</div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <div className="border-t-[1.5px] border-[#2D2D2D] border-b border-gray-200 py-3 my-6">
            <h2 className="font-serif text-2xl font-bold text-[#2D2D2D] text-center">Start Reading</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <a href="/articles" className="group block">
              <div className="bg-white border border-gray-200 p-8 h-full group-hover:border-[#8B6F47] transition shadow-sm">
                <h3 className="font-serif text-xl font-bold text-[#2D2D2D] mb-3 group-hover:text-[#8B6F47] transition">Read Articles</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Browse AI-rewritten news articles tailored to your CET level. Click on highlighted words to learn vocabulary in context.
                </p>
                <div className="mt-6 text-[#8B6F47] text-sm font-medium tracking-wider uppercase">Browse</div>
              </div>
            </a>
            <a href="/vocab" className="group block">
              <div className="bg-white border border-gray-200 p-8 h-full group-hover:border-[#8B6F47] transition shadow-sm">
                <h3 className="font-serif text-xl font-bold text-[#2D2D2D] mb-3 group-hover:text-[#8B6F47] transition">My Vocabulary</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Review words you've saved while reading. Track your learning progress and strengthen your memory.
                </p>
                <div className="mt-6 text-[#8B6F47] text-sm font-medium tracking-wider uppercase">Review</div>
              </div>
            </a>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-[#FAFAF8] p-10 mb-16">
          <div className="text-center">
            <h3 className="font-serif text-xl font-bold text-[#2D2D2D] mb-8">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div>
                <div className="text-xs text-[#8B6F47] tracking-widest uppercase mb-2">01</div>
                <h4 className="font-serif font-bold text-[#2D2D2D] mb-2">Read Daily</h4>
                <p className="text-gray-400 text-sm">One article per day, 10-15 minutes</p>
              </div>
              <div>
                <div className="text-xs text-[#8B6F47] tracking-widest uppercase mb-2">02</div>
                <h4 className="font-serif font-bold text-[#2D2D2D] mb-2">Save Words</h4>
                <p className="text-gray-400 text-sm">Click highlighted words to add to your list</p>
              </div>
              <div>
                <div className="text-xs text-[#8B6F47] tracking-widest uppercase mb-2">03</div>
                <h4 className="font-serif font-bold text-[#2D2D2D] mb-2">Review</h4>
                <p className="text-gray-400 text-sm">Revisit saved words to strengthen memory</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2D2D2D] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-serif font-bold text-[#2D2D2D] mb-3 text-sm">About WordBread</h4>
              <p className="text-gray-400 text-xs leading-relaxed">An AI-powered English news reader for CET4/CET6 learners.</p>
            </div>
            <div>
              <h4 className="font-serif font-bold text-[#2D2D2D] mb-3 text-sm">Navigate</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="/articles" className="text-gray-400 hover:text-[#8B6F47] transition">Articles</a></li>
                <li><a href="/vocab" className="text-gray-400 hover:text-[#8B6F47] transition">Vocabulary</a></li>
                <li><a href="/settings" className="text-gray-400 hover:text-[#8B6F47] transition">Settings</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif font-bold text-[#2D2D2D] mb-3 text-sm">Contact</h4>
              <p className="text-gray-400 text-xs">hongyuanlu9@gmail.com</p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <p className="text-center text-gray-400 text-xs tracking-wider">2026 WordBread. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
