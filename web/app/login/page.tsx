'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/hooks/useDashboardData';

type LoginState = 'init' | 'ready' | 'logging' | 'error';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? '2009066922-nf7ZHqqi';

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>('init');
  const [message, setMessage] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      let profileUserId: string | null = null;
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId: LIFF_ID });
        if (cancelled) return;

        if (!liff.isLoggedIn()) {
          setState('ready');
          return;
        }

        const idToken = liff.getIDToken();
        if (!idToken) {
          setState('error');
          setMessage('無法取得 LINE id_token，請重新登入。');
          return;
        }

        const profile = await liff.getProfile().catch(() => null);
        profileUserId = profile?.userId ?? null;
        if (profileUserId) {
          setLineUserId(profileUserId);
        }
        const decoded = liff.getDecodedIDToken?.() ?? null;

        setState('logging');
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken, profile, decoded }),
          credentials: 'include',
        });

        if (!response.ok) {
          let errorMessage = '登入失敗';
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (data?.message) {
              errorMessage = Array.isArray(data.message)
                ? data.message.join(' ')
                : data.message;
            }
          } catch {
            if (text) errorMessage = text;
          }
          throw new Error(errorMessage);
        }

        router.replace('/');
      } catch (error) {
        console.error('LIFF login error:', error);
        if (!cancelled) {
          setState('error');
          if (error instanceof Error && error.message.includes('無權限')) {
            try {
              const liff = (await import('@line/liff')).default;
              await liff.init({ liffId: LIFF_ID });
              if (liff.isLoggedIn()) {
                liff.logout();
              }
            } catch (logoutError) {
              console.warn('LIFF logout failed:', logoutError);
            }
          }
          const hint =
            error instanceof Error && error.message.includes('無權限')
              ? profileUserId
                ? `無權限存取，請聯絡管理員加入白名單 (UID: ${profileUserId})`
                : '無權限存取，請聯絡管理員加入白名單'
              : 'LINE 登入失敗，請稍後再試。';
          setMessage(hint);
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogin = async () => {
    setMessage(null);
    try {
      const liff = (await import('@line/liff')).default;
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }
    } catch (error) {
      console.error('LIFF login trigger error:', error);
      setState('error');
      setMessage('無法啟動 LINE 登入，請稍後再試。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
            LEC
          </div>
          <h1 className="text-2xl font-bold text-slate-800">LEC Dashboard</h1>
          <p className="text-sm text-slate-500">請使用 LINE 帳號登入</p>
        </div>

        <button
          onClick={handleLogin}
          disabled={state === 'logging'}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all disabled:opacity-60"
        >
          {state === 'logging' ? '登入中...' : '使用 LINE 登入'}
        </button>

        {message && (
          <div className="text-left bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 space-y-2">
            <div className="text-sm font-bold text-rose-700">登入失敗</div>
            <div className="text-sm text-rose-600">{message}</div>
            {lineUserId && (
              <div className="text-[11px] text-rose-500 font-mono bg-rose-100/60 rounded-lg px-2 py-1 inline-block">
                UID: {lineUserId}
              </div>
            )}
          </div>
        )}

        {state === 'ready' && (
          <p className="text-xs text-slate-400 text-center">
            若未自動跳轉，請點擊上方登入按鈕。
          </p>
        )}
      </div>
    </div>
  );
}
