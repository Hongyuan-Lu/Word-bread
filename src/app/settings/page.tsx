'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loading } from '@/components/Loading';
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        setMessage({ type: 'error', text: '获取用户信息失败，请刷新重试' });
      } else if (data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  const handleUpdateTargetExam = async (exam: TargetExam) => {
    if (profile?.target_exam === exam) {
      setMessage({ type: 'info', text: '已经是这个学习目标了' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('用户未登录');
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ target_exam: exam, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: user.id,
          target_exam: exam,
          major_category: profile?.major_category || '综合',
        });

        if (insertError) throw insertError;
      }

      setProfile((prev) => (prev ? { ...prev, target_exam: exam } : null));
      setMessage({
        type: 'success',
        text: `已切换到 ${exam === 'CET4' ? '大学英语四级' : '大学英语六级'}`,
      });
    } catch (err) {
      console.error('Update target_exam error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '更新失败，请重试',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMajorCategory = async (category: MajorCategory) => {
    if (profile?.major_category === category) {
      setMessage({ type: 'info', text: '已经是这个专业兴趣了' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('用户未登录');
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ major_category: category, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: user.id,
          target_exam: profile?.target_exam || 'CET4',
          major_category: category,
        });

        if (insertError) throw insertError;
      }

      setProfile((prev) => (prev ? { ...prev, major_category: category } : null));
      setMessage({
        type: 'success',
        text: `已更新专业兴趣为《${category}》，我们将为您推荐更相关的内容`,
      });
    } catch (err) {
      console.error('Update major_category error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '更新失败，请重试',
      });
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
      console.error('Sign out error:', err);
      setMessage({ type: 'error', text: '退出失败，请重试' });
    } finally {
      setSaving(false);
    }
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
              设置
            </h1>
            <div className="newspaper-divider">
              <p className="text-lg text-bread-primary font-display italic">
                管理您的学习偏好
              </p>
            </div>
          </div>
          
          {/* 导航栏 */}
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-6">
              <a href="/" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                首页
              </a>
              <a href="/articles" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                文章
              </a>
              <a href="/vocab" className="text-gray-600 font-display text-lg hover:text-bread-primary transition">
                单词本
              </a>
              <a href="/settings" className="text-gray-900 font-display font-semibold text-lg hover:text-bread-primary transition">
                设置
              </a>
            </nav>
            
            <div className="flex items-center gap-4">
              <span className="bread-tag bread-tag-primary">
                {profile?.target_exam ?? 'CET4'}
              </span>
              <span className="bread-tag bread-tag-secondary">
                {profile?.major_category ?? '综合'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* 学习目标 */}
        <section className="bread-card mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">📚 学习目标</h2>
            <p className="text-gray-600">
              选择您的考试目标，文章将根据您的选择调整难度
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleUpdateTargetExam('CET4')}
                disabled={saving}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  profile?.target_exam === 'CET4'
                    ? 'border-bread-primary bg-amber-50'
                    : 'border-gray-200 hover:border-bread-secondary hover:bg-amber-50/50'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {profile?.target_exam === 'CET4' && (
                  <div className="absolute top-3 right-3 bread-tag bread-tag-primary text-xs">
                    已选择
                  </div>
                )}
                <div className="font-display font-bold text-xl text-gray-900 mb-2">CET-4</div>
                <div className="text-sm text-gray-600 mb-4">大学英语四级</div>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>基础词汇为主</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>简单句式结构</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>适合入门学习</span>
                  </li>
                </ul>
              </button>
              
              <button
                onClick={() => handleUpdateTargetExam('CET6')}
                disabled={saving}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  profile?.target_exam === 'CET6'
                    ? 'border-bread-primary bg-amber-50'
                    : 'border-gray-200 hover:border-bread-secondary hover:bg-amber-50/50'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {profile?.target_exam === 'CET6' && (
                  <div className="absolute top-3 right-3 bread-tag bread-tag-primary text-xs">
                    已选择
                  </div>
                )}
                <div className="font-display font-bold text-xl text-gray-900 mb-2">CET-6</div>
                <div className="text-sm text-gray-600 mb-4">大学英语六级</div>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>更接近真实新闻</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>适度复杂句式</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>提升阅读挑战</span>
                  </li>
                </ul>
              </button>
            </div>
          </div>
        </section>

        {/* 专业兴趣 */}
        <section className="bread-card mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">🎯 专业兴趣</h2>
            <p className="text-gray-600">
              选择您感兴趣的专业领域，我们将为您推荐更相关的内容
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {MAJOR_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleUpdateMajorCategory(category)}
                  disabled={saving}
                  className={`px-4 py-3 rounded-xl text-sm transition-all border-2 ${
                    profile?.major_category === category
                      ? 'border-bread-primary bg-amber-50 text-bread-accent font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-bread-secondary hover:bg-amber-50/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-800">
                💡 <strong>提示：</strong>您可以随时切换专业兴趣，系统会自动调整推荐内容的领域。
              </p>
            </div>
          </div>
        </section>

        {/* 账户管理 */}
        <section className="bread-card mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">👤 账户管理</h2>
            <p className="text-gray-600">
              管理您的账户设置
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <div className="font-medium text-gray-900">当前学习目标</div>
              </div>
              <div className="bread-tag bread-tag-primary">
                {profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6'}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <div className="font-medium text-gray-900">专业兴趣</div>
              </div>
              <div className="bread-tag bread-tag-secondary">
                {profile?.major_category || '综合'}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={saving}
              className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </section>

        {/* 底部信息 */}
        <div className="text-center text-sm text-gray-500">
          <p>如有问题，请联系管理员</p>
          <p className="mt-1 text-xs">WordBread 单词面包 v0.1.0</p>
        </div>
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
