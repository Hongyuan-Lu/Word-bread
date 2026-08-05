'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const supabase = createClient();

  const isEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleNicknameCheck = async (nicknameToCheck: string) => {
    const { data, error } = await supabase.rpc('get_email_by_nickname', {
      p_nickname: nicknameToCheck,
    });
    if (error) {
      return null;
    }
    return data as string | null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!nickname.trim()) {
          throw new Error('请输入昵称');
        }
        if (!isEmail(account)) {
          throw new Error('请输入有效的邮箱地址');
        }

        const { data: existingEmail } = await supabase.rpc('get_email_by_nickname', {
          p_nickname: nickname.trim(),
        });
        if (existingEmail) {
          throw new Error('该昵称已被使用，请选择其他昵称');
        }

        const { error } = await supabase.auth.signUp({
          email: account,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: {
              nickname: nickname.trim(),
            },
          },
        });
        if (error) throw error;

        setMessage({
          type: 'success',
          text: '注册成功！请查收验证邮件，验证后即可登录。',
        });
      } else {
        let loginEmail = account;

        if (!isEmail(account)) {
          const emailFromNickname = await handleNicknameCheck(account.trim());
          if (!emailFromNickname) {
            throw new Error('该昵称不存在，请检查后重试');
          }
          loginEmail = emailFromNickname;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;
        window.location.href = '/';
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '操作失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bread-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* 报纸风格头部 */}
        <div className="text-center mb-8">
          <div className="newspaper-divider mb-6">
            <a href="/" className="inline-block">
              <h1 className="font-display text-5xl font-bold text-gray-900 mb-2">单词面包</h1>
              <p className="text-bread-primary font-display italic">WordBread · 将新闻烘焙成知识</p>
            </a>
          </div>
          
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? '创建账户' : '欢迎回来'}
          </h2>
          <p className="text-gray-600 font-body">
            {isSignUp ? '开始您的英语学习之旅' : '继续您的学习之旅'}
          </p>
          {!isSignUp && (
            <p className="text-sm text-gray-500 mt-2">
              支持邮箱或昵称登录
            </p>
          )}
        </div>

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
                {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : '⚠️'}
              </span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* 游客登录选项 */}
        <div className="bread-card p-6 mb-6">
          <a
            href="/"
            className="bread-button-secondary w-full text-center block"
          >
            以游客身份继续浏览
          </a>
          <p className="text-xs text-gray-500 text-center mt-3">
            游客模式可浏览文章，但学习进度不会保存
          </p>
        </div>

        {/* 分隔线 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-sm text-gray-500 font-body">或</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* 登录表单 */}
        <div className="bread-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 昵称输入（仅注册时） */}
            {isSignUp && (
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                  👤 昵称
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  disabled={loading}
                  className="bread-input"
                  placeholder="您的学习昵称"
                />
                <p className="text-xs text-gray-500 mt-1">
                  昵称将作为您的身份标识之一，请选择有意义的名称
                </p>
              </div>
            )}

            <div>
              <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-2">
                📧 邮箱地址{!isSignUp && ' 或昵称'}
              </label>
              <input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
                disabled={loading}
                className="bread-input"
                placeholder={isSignUp ? "your@email.com" : "your@email.com 或 nickname"}
              />
              {!isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  可输入邮箱或昵称登录
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                🔒 密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="bread-input pr-12"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition"
                  tabIndex={-1}
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  密码至少6位字符
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bread-button-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>处理中...</span>
                </>
              ) : (
                <span>{isSignUp ? '📝 注册' : '🚀 登录'}</span>
              )}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              disabled={loading}
              className="text-bread-primary hover:text-bread-accent text-sm font-medium disabled:opacity-50 transition"
            >
              {isSignUp ? (
                <>
                  已有账户？<span className="underline">立即登录</span>
                </>
              ) : (
                <>
                  没有账户？<span className="underline">立即注册</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            登录即表示您同意我们的
            <a href="#" className="text-bread-primary hover:underline ml-1">服务条款</a>
            和
            <a href="#" className="text-bread-primary hover:underline ml-1">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}
