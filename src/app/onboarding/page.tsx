'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MAJOR_CATEGORIES, type MajorCategory, type TargetExam } from '@/types/vocab';

type Step = 'exam' | 'category';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('exam');
  const [selectedExam, setSelectedExam] = useState<TargetExam | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MajorCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleExamSelect = (exam: TargetExam) => {
    setSelectedExam(exam);
    setStep('category');
  };

  const handleComplete = async () => {
    if (!selectedExam || !selectedCategory) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('用户未登录');
      }

      const nickname = user.user_metadata?.nickname as string | undefined;

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
          .update({
            target_exam: selectedExam,
            major_category: selectedCategory,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          user_id: user.id,
          target_exam: selectedExam,
          major_category: selectedCategory,
          nickname: nickname || '',
        });

        if (insertError) throw insertError;
      }

      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bread-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        {/* 报纸风格头部 */}
        <div className="text-center mb-8">
          <div className="newspaper-divider mb-6">
            <h1 className="font-display text-5xl font-bold text-gray-900 mb-2">单词面包</h1>
            <p className="text-bread-primary font-display italic">WordBread · 将新闻烘焙成知识</p>
          </div>
        </div>

        {step === 'exam' && (
          <>
            <div className="text-center mb-10">
              <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">选择您的学习目标</h2>
              <p className="text-gray-600 text-lg">
                请选择您准备参加的考试，系统将为您推荐合适难度的内容
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleExamSelect('CET4')}
                className="group relative bread-card p-8 text-left transition-all hover:border-bread-primary"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📚</span>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-gray-900">CET-4</h3>
                    <p className="text-bread-primary font-medium">大学英语四级</p>
                  </div>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>较短的文章长度，更易上手</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>清晰的句式结构</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>以四级核心词汇为重点</span>
                  </li>
                </ul>
              </button>

              <button
                onClick={() => handleExamSelect('CET6')}
                className="group relative bread-card p-8 text-left transition-all hover:border-bread-primary"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-gray-900">CET-6</h3>
                    <p className="text-bread-primary font-medium">大学英语六级</p>
                  </div>
                </div>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>更接近真实新闻表达</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>允许适度复杂句式</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>以六级核心词汇为重点</span>
                  </li>
                </ul>
              </button>
            </div>
          </>
        )}

        {step === 'category' && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bread-tag bread-tag-primary mb-4">
                <span>已选择: {selectedExam === 'CET4' ? 'CET-4' : 'CET-6'}</span>
                <button
                  onClick={() => setStep('exam')}
                  className="underline hover:no-underline"
                >
                  修改
                </button>
              </div>
              <h2 className="font-display text-4xl font-bold text-gray-900 mb-4">选择您的专业兴趣</h2>
              <p className="text-gray-600 text-lg">
                选择您感兴趣的专业领域，我们将为您推荐更相关的内容
              </p>
            </div>

            <div className="bread-card p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {MAJOR_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-3 rounded-xl text-center transition-all border-2 ${
                      selectedCategory === category
                        ? 'border-bread-primary bg-amber-50 text-bread-accent font-medium'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-bread-secondary hover:bg-amber-50/50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleComplete}
                disabled={!selectedCategory || loading}
                className={`bread-button-primary text-lg px-8 py-4 ${
                  !selectedCategory || loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? '正在保存...' : '🎯 完成设置'}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-center border border-red-200">
            ❌ {error}
          </div>
        )}

        <p className="mt-8 text-center text-gray-500 text-sm">
          💡 您随时可以在设置中更改学习目标和专业兴趣
        </p>
      </div>
    </div>
  );
}
