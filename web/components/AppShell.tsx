'use client'

import type { ComponentType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AIAssistant } from './AIAssistant';
import { API_BASE_URL } from '@/hooks/useDashboardData';
import {
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  HistoryIcon,
  MenuIcon,
  UsersIcon,
  XIcon,
  ClipboardIcon,
} from './Icons';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: '總覽', icon: ClipboardIcon },
  { href: '/schedule', label: '課表', icon: CalendarIcon },
  { href: '/daily-logs', label: '上課紀錄', icon: FileTextIcon },
  { href: '/students', label: '個案管理', icon: UsersIcon },
  { href: '/payments', label: '繳費管理', icon: CreditCardIcon },
  { href: '/activity', label: '活動紀錄', icon: HistoryIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name?: string; picture?: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const title = useMemo(() => {
    if (pathname === '/') return '總覽';
    const item = navItems.find((nav) => nav.href !== '/' && pathname.startsWith(nav.href));
    return item?.label ?? 'LEC Dashboard';
  }, [pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Failed to logout:', error);
    }

    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? '';
      if (liffId) {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          liff.logout();
        }
      }
    } catch (error) {
      console.warn('LIFF logout failed:', error);
    } finally {
      router.replace('/login');
    }
  };

  useEffect(() => {
    if (pathname === '/login') return;
    const loadUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.user) {
          setCurrentUser({
            name: data.user.name ?? '',
            picture: data.user.picture ?? '',
          });
          setDisplayNameDraft(data.user.name ?? '');
        }
      } catch (error) {
        console.warn('Failed to load current user:', error);
      }
    };
    void loadUser();
  }, [pathname]);

  const handleProfileSave = async () => {
    const nextName = displayNameDraft.trim();
    if (!nextName) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: nextName }),
      });
      if (!response.ok) {
        throw new Error('更新失敗');
      }
      setCurrentUser((prev) => (prev ? { ...prev, name: nextName } : { name: nextName }));
      setIsEditingProfile(false);
    } catch (error) {
      console.warn('Failed to update profile:', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative z-30 h-full bg-white border-r flex flex-col transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
      >
        <div className="p-4 border-b h-16 flex items-center justify-between">
          {isSidebarOpen ? (
            <h1 className="text-xl font-black text-primary tracking-tight truncate">LEC Dashboard</h1>
          ) : (
            <div className="w-full flex justify-center text-primary font-black">LEC</div>
          )}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 w-full p-3 rounded-lg mb-1 transition-all overflow-hidden whitespace-nowrap ${
                  isActive(item.href)
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`font-medium transition-opacity duration-200 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {isSidebarOpen && (
          <div className="p-4 border-t text-xs text-center text-slate-400">
            LEC System v1.2
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white h-16 border-b flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <MenuIcon className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-slate-700">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {currentUser?.name && (
              <span className="text-sm font-semibold text-slate-600 hidden sm:inline">
                {currentUser.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="rounded-full border border-transparent hover:border-slate-200 transition-all"
            >
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser?.name ?? 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  {currentUser?.name?.slice(0, 1) || 'U'}
                </div>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all"
            >
              登出
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-100">{children}</div>
      </main>

      <AIAssistant />

      {isEditingProfile && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">編輯顯示名稱</h3>
              <p className="text-xs text-slate-500">活動紀錄與頭像將以此名稱顯示</p>
            </div>
            <input
              value={displayNameDraft}
              onChange={(e) => setDisplayNameDraft(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="請輸入顯示名稱"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleProfileSave}
                className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
