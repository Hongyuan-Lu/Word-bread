'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MAJOR_CATEGORIES, type MajorCategory, type TargetExam } from '@/types/vocab';

interface Profile {
  target_exam: TargetExam;
  major_category: MajorCategory | null;
  nickname: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('target_exam, major_category, nickname')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        setMessage({ type: 'error', text: '获取用户信息失败' });
      } else if (data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleUpdateTargetExam = async (exam: TargetExam) => {
    if (profile?.target_exam === exam) return;
    setSaving(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
      if (existingProfile) {
        await supabase.from('profiles').update({ target_exam: exam, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      } else {
        await supabase.from('profiles').insert({ user_id: user.id, target_exam: exam, major_category: profile?.major_category || '综合' });
      }
      setProfile((prev) => (prev ? { ...prev, target_exam: exam } : null));
      setMessage({ type: 'success', text: `已切换到 ${exam === 'CET4' ? 'CET-4' : 'CET-6'}` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '更新失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMajorCategory = async (category: MajorCategory) => {
    if (profile?.major_category === category) return;
    setSaving(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('用户未登录');
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
      if (existingProfile) {
        await supabase.from('profiles').update({ major_category: category, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      } else {
        await supabase.from('profiles').insert({ user_id: user.id, target_exam: profile?.target_exam || 'CET4', major_category: category });
      }
      setProfile((prev) => (prev ? { ...prev, major_category: category } : null));
      setMessage({ type: 'success', text: `已更新专业兴趣为 ${category}` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '更新失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSaving(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      setMessage({ type: 'error', text: '退出失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bread-background)]">
        <p className="text-[var(--bread-text-secondary)] font-body text-sm tracking-widest">加载中</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bread-background)]">
      <header className="bread-navbar">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--bread-border)]">
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div className="text-xs text-[var(--bread-text-secondary)] font-body tracking-wider">每日精选英文新闻</div>
          </div>
          <div className="text-center mb-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--bread-text)] mb-3 tracking-tight">设置</h1>
            <p className="text-sm text-[var(--bread-text-secondary)] font-display italic">管理您的学习偏好</p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--bread-border)]">
            <nav className="flex items-center gap-8">
              <a href="/" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">首页</a>
              <a href="/articles" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">文章</a>
              <a href="/vocab" className="text-[var(--bread-text-secondary)] font-body text-sm tracking-wider hover:text-[var(--bread-accent)] transition">单词本</a>
            </nav>
            <div className="flex items-center gap-3">
              <span className="bread-tag bread-tag-primary">{profile?.target_exam ?? 'CET4'}</span>
              <span className="bread-tag bread-tag-primary">{profile?.major_category ?? '综合'}</span>
              <a href="/settings" className="text-[var(--bread-text)] font-medium text-xs">设置</a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {message && (
          <div className={`mb-6 p-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
            {message.text}
          </div>
        )}

        <section className="bread-card mb-8">
          <div className="p-6 border-b border-[var(--bread-border)]">
            <h2 className="font-display text-xl font-bold text-[var(--bread-text)] mb-1">学习目标</h2>
            <p className="text-[var(--bread-text-secondary)] text-xs">选择您的考试目标，文章将根据您的选择调整难度</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => handleUpdateTargetExam('CET4')} disabled={saving} className={`relative p-6 rounded border-2 transition-all text-left ${profile?.target_exam === 'CET4' ? 'border-[var(--bread-primary)] bg-[var(--bread-warm)]' : 'border-[var(--bread-border)] hover:border-[var(--bread-secondary)]'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {profile?.target_exam === 'CET4' && <div className="absolute top-3 right-3 bread-tag bread-tag-primary text-[0.65rem]">已选择</div>}
                <div className="font-display font-bold text-xl text-[var(--bread-text)] mb-2">CET-4</div>
                <div className="text-sm text-[var(--bread-text-secondary)] mb-4">大学英语四级</div>
                <ul className="space-y-2 text-sm text-[var(--bread-text-secondary)]">
                  <li>基础词汇为主</li>
                  <li>简单句式结构</li>
                  <li>适合入门学习</li>
                </ul>
              </button>
              <button onClick={() => handleUpdateTargetExam('CET6')} disabled={saving} className={`relative p-6 rounded border-2 transition-all text-left ${profile?.target_exam === 'CET6' ? 'border-[var(--bread-primary)] bg-[var(--bread-warm)]' : 'border-[var(--bread-border)] hover:border-[var(--bread-secondary)]'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {profile?.target_exam === 'CET6' && <div className="absolute top-3 right-3 bread-tag bread-tag-primary text-[0.65rem]">已选择</div>}
                <div className="font-display font-bold text-xl text-[var(--bread-text)] mb-2">CET-6</div>
                <div className="text-sm text-[var(--bread-text-secondary)] mb-4">大学英语六级</div>
                <ul className="space-y-2 text-sm text-[var(--bread-text-secondary)]">
                  <li>更接近真实新闻</li>
                  <li>适度复杂句式</li>
                  <li>提升阅读挑战</li>
                </ul>
              </button>
            </div>
          </div>
        </section>

        <section className="bread-card mb-8">
          <div className="p-6 border-b border-[var(--bread-border)]">
            <h2 className="font-display text-xl font-bold text-[var(--bread-text)] mb-1">专业兴趣</h2>
            <p className="text-[var(--bread-text-secondary)] text-xs">选择您感兴趣的专业领域，我们将为您推荐更相关的内容</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {MAJOR_CATEGORIES.map((category) => (
                <button key={category} onClick={() => handleUpdateMajorCategory(category)} disabled={saving} className={`px-4 py-3 rounded text-sm transition-all border ${profile?.major_category === category ? 'border-[var(--bread-primary)] bg-[var(--bread-warm)] text-[var(--bread-accent)] font-medium' : 'border-[var(--bread-border)] bg-white text-[var(--bread-text)] hover:border-[var(--bread-secondary)]'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bread-card mb-8">
          <div className="p-6 border-b border-[var(--bread-border)]">
            <h2 className="font-display text-xl font-bold text-[var(--bread-text)] mb-1">账户管理</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--bread-highlight)] rounded">
              <div className="text-sm text-[var(--bread-text)]">当前学习目标</div>
              <div className="bread-tag bread-tag-primary">{profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6'}</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--bread-highlight)] rounded">
              <div className="text-sm text-[var(--bread-text)]">专业兴趣</div>
              <div className="bread-tag bread-tag-primary">{profile?.major_category || '综合'}</div>
            </div>
            <button onClick={handleSignOut} disabled={saving} className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded border border-red-200 transition">
              退出登录
            </button>
          </div>
        </section>
      </main>

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
