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
        text: `已更新专业兴趣为「${category}」，我们将为您推荐更相关的内容`,
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
    const confirmed = window.confirm('确定要退出登录吗？');
    if (!confirmed) return;

    setMessage({ type: 'info', text: '正在退出登录...' });
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl hover:opacity-80 transition">🍞</a>
              <span className="text-lg font-semibold text-gray-900">设置</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                {profile?.target_exam || 'CET4'}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                {profile?.major_category || '综合'}
              </span>
              <a
                href="/"
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-400 transition"
              >
                返回首页
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
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
            <div className="flex items-start gap-3">
              <span className="text-lg">
                {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <p className="font-medium">{message.text}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🎓 学习目标</h2>
            <p className="text-gray-600">
              选择您准备参加的考试，系统将为您推荐合适难度的内容
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleUpdateTargetExam('CET4')}
                disabled={saving}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                  profile?.target_exam === 'CET4'
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {profile?.target_exam === 'CET4' && (
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    已选择
                  </div>
                )}
                <div className="font-bold text-lg text-gray-900 mb-1">CET-4</div>
                <div className="text-sm text-gray-600">大学英语四级</div>
                <ul className="mt-4 space-y-1 text-xs text-gray-500">
                  <li>✓ 较短的文章长度</li>
                  <li>✓ 清晰的句式结构</li>
                  <li>✓ 降低阅读难度</li>
                </ul>
              </button>

              <button
                onClick={() => handleUpdateTargetExam('CET6')}
                disabled={saving}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                  profile?.target_exam === 'CET6'
 ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-orange-200 hover:bg-orange-50'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {profile?.target_exam === 'CET6' && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    已选择
                  </div>
                )}
                <div className="font-bold text-lg text-gray-900 mb-1">CET-6</div>
                <div className="text-sm text-gray-600">大学英语六级</div>
                <ul className="mt-4 space-y-1 text-xs text-gray-500">
                  <li>✓ 更接近真实新闻</li>
                  <li>✓ 适度复杂句式</li>
                  <li>✓ 提升阅读挑战</li>
                </ul>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🎯 专业兴趣</h2>
            <p className="text-gray-600">
              选择您感兴趣的专业领域，我们将为您推荐更相关的内容
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {MAJOR_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleUpdateMajorCategory(category)}
                  disabled={saving}
                  className={`px-3 py-2 rounded-lg text-sm transition-all border-2 ${
                    profile?.major_category === category
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-orange-200 hover:bg-orange-50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>提示：</strong>您随时可以切换专业兴趣，系统会自动调整推荐内容的领域。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔐 账户管理</h2>
            <p className="text-gray-600">
              管理您的账户设置
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">当前学习目标</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                profile?.target_exam === 'CET4' 
                  ? 'bg-gray-200 text-gray-700' 
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {profile?.target_exam === 'CET4' ? 'CET-4' : 'CET-6'}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">专业兴趣</div>
              </div>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                {profile?.major_category || '综合'}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={saving}
              className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition flex items-center justify-center gap-2"
            >
              <span>退出登录</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>如有问题，请联系管理员</p>
          <p className="mt-1 text-xs">WordBread 单词面包 v0.1.0</p>
        </div>
      </main>
    </div>
  );
}