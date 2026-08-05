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
          throw new Error('Please enter a nickname');
        }
        if (!isEmail(account)) {
          throw new Error('Please enter a valid email address');
        }

        const { data: existingEmail } = await supabase.rpc('get_email_by_nickname', {
          p_nickname: nickname.trim(),
        });
        if (existingEmail) {
          throw new Error('This nickname is already taken');
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
          text: 'Registration successful. Please check your email to verify your account.',
        });
      } else {
        let loginEmail = account;

        if (!isEmail(account)) {
          const emailFromNickname = await handleNicknameCheck(account.trim());
          if (!emailFromNickname) {
            throw new Error('Nickname not found');
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
        text: error instanceof Error ? error.message : 'Operation failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bread-background)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="newspaper-divider mb-8">
            <a href="/" className="inline-block">
              <h1 className="font-display text-4xl font-bold text-[var(--bread-text)] mb-2">WordBread</h1>
              <p className="text-xs text-[var(--bread-text-secondary)] font-display italic tracking-wider">AI-Powered English Reading</p>
            </a>
          </div>
          
          <h2 className="font-display text-2xl font-bold text-[var(--bread-text)] mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-[var(--bread-text-secondary)]">
            {isSignUp ? 'Start your learning journey' : 'Continue your learning journey'}
          </p>
          {!isSignUp && (
            <p className="text-xs text-[var(--bread-text-secondary)] mt-2">
              Sign in with email or nickname
            </p>
          )}
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-6 p-4 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 游客登录选项 */}
        <div className="bread-card p-6 mb-6">
          <a
            href="/"
            className="bread-button-secondary w-full text-center block text-xs"
          >
            Continue as Guest
          </a>
          <p className="text-xs text-[var(--bread-text-secondary)] text-center mt-3">
            Guest mode allows browsing without saving progress
          </p>
        </div>

        {/* 分隔线 */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-[var(--bread-border)]"></div>
          <span className="text-xs text-[var(--bread-text-secondary)] tracking-wider uppercase">or</span>
          <div className="flex-1 border-t border-[var(--bread-border)]"></div>
        </div>

        {/* 登录表单 */}
        <div className="bread-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 昵称输入（仅注册时） */}
            {isSignUp && (
              <div>
                <label htmlFor="nickname" className="block text-xs font-medium text-[var(--bread-text)] mb-2 tracking-wider uppercase">
                  Nickname
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  disabled={loading}
                  className="bread-input"
                  placeholder="Your display name"
                />
              </div>
            )}

            <div>
              <label htmlFor="account" className="block text-xs font-medium text-[var(--bread-text)] mb-2 tracking-wider uppercase">
                {!isSignUp ? 'Email or Nickname' : 'Email'}
              </label>
              <input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                required
                disabled={loading}
                className="bread-input"
                placeholder={isSignUp ? "your@email.com" : "your@email.com or nickname"}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--bread-text)] mb-2 tracking-wider uppercase">
                Password
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
                  className="bread-input pr-16"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--bread-text-secondary)] hover:text-[var(--bread-text)] transition"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bread-button-primary w-full text-xs"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
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
              className="text-[var(--bread-accent)] hover:text-[var(--bread-text)] text-xs disabled:opacity-50 transition"
            >
              {isSignUp ? (
                <>
                  Already have an account? <span className="underline">Sign in</span>
                </>
              ) : (
                <>
                  Don't have an account? <span className="underline">Create one</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center text-xs text-[var(--bread-text-secondary)]">
          <p>
            By signing in, you agree to our
            <a href="#" className="text-[var(--bread-accent)] hover:underline ml-1">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-[var(--bread-accent)] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
